import { useState, useRef, useEffect, useCallback } from "react";
import axiosClient from "../../api/axiosClient";

/**
 * Manages the full lifecycle of NOVAA chat sessions:
 * - Fetching and listing sessions
 * - Creating / opening / deleting sessions
 * - Per-session elapsed-time timer
 *
 * @param {React.RefObject} inputRef  - forwarded so focus can be set after session changes
 */
export function useChatSessions(inputRef) {
  const [sessions,        setSessions]        = useState([]);
  const [activeSession,   setActiveSession]   = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [elapsed,         setElapsed]         = useState(0);

  const timerRef = useRef(null);
  const startRef = useRef(null);

  // ── Timer helpers ───────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    timerRef.current = setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      1000
    );
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // Clean up timer on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const res  = await axiosClient.get("chat-sessions/");
      const list = (Array.isArray(res.data) ? res.data : res.data.results ?? [])
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
      setSessions(list);
    } catch (err) {
      console.error("[useChatSessions] fetchSessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (sid) => {
    try {
      const res = await axiosClient.get(`chat-messages/?session=${sid}`);
      return Array.isArray(res.data) ? res.data : res.data.results ?? [];
    } catch (err) {
      console.error("[useChatSessions] fetchMessages:", err);
      return [];
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // ── Session CRUD ────────────────────────────────────────────────────────────
  const createSession = useCallback(async (courseTitle) => {
    stopTimer(); setElapsed(0);
    const title = courseTitle ? `${courseTitle} — Session` : "NOVAA Session";
    try {
      const res = await axiosClient.post("chat-sessions/", { title, login_method: "PASSWORD" });
      setSessions(prev => [res.data, ...prev]);
      setActiveSession(res.data);
      startTimer();
      setTimeout(() => inputRef?.current?.focus(), 100);
      return res.data;
    } catch (err) {
      console.error("[useChatSessions] createSession:", err);
      return null;
    }
  }, [stopTimer, startTimer, inputRef]);

  const openSession = useCallback(async (session) => {
    stopTimer(); setElapsed(0);
    setActiveSession(session);
    const msgs = await fetchMessages(session.id);
    startTimer();
    setTimeout(() => inputRef?.current?.focus(), 100);
    return msgs;
  }, [stopTimer, startTimer, fetchMessages, inputRef]);

  const endSession = useCallback(() => {
    stopTimer();
    setActiveSession(null);
    setElapsed(0);
  }, [stopTimer]);

  const deleteSession = useCallback(async (sid, event) => {
    event?.stopPropagation();
    try {
      await axiosClient.delete(`chat-sessions/${sid}/`);
      setSessions(prev => prev.filter(s => s.id !== sid));
      return true;
    } catch (err) {
      console.error("[useChatSessions] deleteSession:", err);
      return false;
    }
  }, []);

  return {
    sessions,
    activeSession,
    sessionsLoading,
    elapsed,
    createSession,
    openSession,
    endSession,
    deleteSession,
  };
}
