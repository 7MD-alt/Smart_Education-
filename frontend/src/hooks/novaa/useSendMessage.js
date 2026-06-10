import { useState, useRef, useEffect, useCallback } from "react";
import axiosClient from "../../api/axiosClient";
import { API_BASE } from "../../api/config";

// Streaming endpoint lives alongside the axios base URL.
const STREAM_URL = `${API_BASE}/ai/ask/stream/`;

/**
 * Manages the message list and the full AI send / receive cycle.
 * Uses Server-Sent Events so NOVAA's answer streams in token-by-token,
 * falling back to the classic blocking request if streaming isn't available.
 *
 * @param {object|null} activeSession   - current session object (or null)
 * @param {string|null} selectedCourse  - course ID string for RAG context
 * @param {object|null} attachedFile    - { text, filename, truncated } or null
 * @param {Function}    clearFile       - callback to clear the attachment after send
 */
export function useSendMessage(activeSession, selectedCourse, attachedFile, clearFile) {
  const [messages,  setMessages]  = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll whenever messages change or AI starts / stops loading
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiLoading]);

  // Reset messages when the active session changes
  useEffect(() => {
    setMessages([]);
  }, [activeSession?.id]);

  /** Load historical messages for a session (called from useChatSessions.openSession) */
  const loadMessages = useCallback((msgs) => {
    setMessages(Array.isArray(msgs) ? msgs : []);
  }, []);

  /** Clear local messages without API call (e.g. when ending a session) */
  const clearMessages = useCallback(() => setMessages([]), []);

  /** Patch a single message (by id) inside the list. */
  const patchMessage = useCallback((id, patch) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const sendMessage = useCallback(async (question) => {
    const text = question?.trim();
    if (!text || aiLoading || !activeSession) return;

    const fileCtx          = attachedFile?.text ?? null;
    const attachedFilename = attachedFile?.filename ?? null;
    clearFile?.();

    // Optimistic user message
    const userMsg = {
      id:                Date.now(),
      sender_role:       "STUDENT",
      content:           text,
      attached_filename: attachedFilename,
      timestamp:         new Date().toISOString(),
    };
    const aiMsgId = Date.now() + 1;
    setMessages(prev => [...prev, userMsg]);
    setAiLoading(true);

    const payload = {
      question:     text,
      course_id:    selectedCourse ? parseInt(selectedCourse) : undefined,
      session_id:   activeSession.id,
      file_context: fileCtx || undefined,
    };

    // Persist the AI answer + close out the cycle.
    const finalize = async (answer, meta) => {
      patchMessage(aiMsgId, {
        content:    answer || "No response. Please try again.",
        streaming:  false,
        ...meta,
      });
      try {
        await axiosClient.post("chat-messages/", {
          session_id:  activeSession.id,
          sender_role: "TUTOR",
          content:     answer || "",
        });
      } catch { /* persistence best-effort */ }
    };

    try {
      // Persist user message
      await axiosClient.post("chat-messages/", {
        session_id:  activeSession.id,
        sender_role: "STUDENT",
        content:     text,
      });

      // ── Try the streaming endpoint ──────────────────────────────────────────
      const token = localStorage.getItem("access_token");
      const res = await fetch(STREAM_URL, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) throw new Error(`stream unavailable (${res.status})`);

      // Insert the streaming placeholder once the connection is open.
      // Keep aiLoading TRUE for the whole stream so the input stays disabled
      // (no double-send / interleaved streams). The typing dots hide themselves
      // once a streaming bubble is present (see ChatArea).
      setMessages(prev => [...prev, {
        id:          aiMsgId,
        sender_role: "TUTOR",
        content:     "",
        streaming:   true,
        timestamp:   new Date().toISOString(),
      }]);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer  = "";
      let answer  = "";
      let doneMeta = null;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          let evt;
          try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }

          if (evt.type === "token") {
            answer += evt.text || "";
            patchMessage(aiMsgId, { content: answer });
          } else if (evt.type === "done") {
            answer = evt.answer || answer;
            doneMeta = {
              mode:           evt.mode,
              mode_label:     evt.mode_label,
              followups:      evt.followups || [],
              followups_kind: evt.followups_kind || "questions",
              verification:   evt.verification || null,
            };
          } else if (evt.type === "error") {
            answer = evt.answer || "Connection error. Please retry.";
          }
        }
      }

      await finalize(answer, doneMeta || {});
    } catch (streamErr) {
      // ── Fallback: classic blocking request (keeps token-refresh via axios) ──
      try {
        const aiRes = await axiosClient.post("ai/ask/", payload);
        const { answer = "", mode, mode_label, followups = [],
                followups_kind = "questions", verification = null } = aiRes.data ?? {};
        // Ensure the AI bubble exists (it won't if the stream never opened).
        setMessages(prev =>
          prev.some(m => m.id === aiMsgId)
            ? prev
            : [...prev, { id: aiMsgId, sender_role: "TUTOR", content: "",
                          timestamp: new Date().toISOString() }]
        );
        await finalize(answer, { mode, mode_label, followups, followups_kind, verification });
      } catch {
        setMessages(prev =>
          prev.some(m => m.id === aiMsgId)
            ? prev.map(m => (m.id === aiMsgId
                ? { ...m, content: "Connection error. Please retry.", streaming: false }
                : m))
            : [...prev, { id: aiMsgId, sender_role: "TUTOR",
                          content: "Connection error. Please retry.",
                          timestamp: new Date().toISOString() }]
        );
      }
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, activeSession, selectedCourse, attachedFile, clearFile, patchMessage]);

  const handleFollowup = useCallback((text) => {
    sendMessage(text);
  }, [sendMessage]);

  return {
    messages,
    aiLoading,
    bottomRef,
    loadMessages,
    clearMessages,
    sendMessage,
    handleFollowup,
  };
}
