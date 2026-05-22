import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Minimize2, Sparkles, ChevronDown } from "lucide-react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const SUGGESTED_QUESTIONS = {
  ADMIN: [
    "How do I manage users?",
    "How do filieres and courses connect?",
    "What does the danger zone mean?",
  ],
  TEACHER: [
    "How do I upload course materials?",
    "How does face scan attendance work?",
    "What is the danger zone?",
  ],
  STUDENT: [
    "How do I use the AI Tutor?",
    "What happens if I exceed absences?",
    "How does face ID login work?",
  ],
};

export default function AIChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi${user?.first_name ? ` ${user.first_name}` : ""}! 👋 I'm your CampusEye assistant. I can help you navigate the platform, understand features, or answer any questions. What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions =
    SUGGESTED_QUESTIONS[user?.role] || SUGGESTED_QUESTIONS.STUDENT;

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized]);

  const sendMessage = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    const userMsg = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await axiosClient.post("platform-assistant/", {
        question,
        history,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't reach the server. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-violet-600/80 to-violet-800/80 shadow-[0_0_30px_rgba(139,92,246,0.35)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(139,92,246,0.5)]"
        >
          <Bot className="h-6 w-6 text-white" />
          {/* Pulse ring */}
          <span className="absolute h-14 w-14 animate-ping rounded-full bg-violet-500/20" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border border-white/10 bg-[#0c1120] shadow-[0_20px_80px_rgba(0,0,0,0.7)] transition-all duration-300 ${
            minimized ? "h-14 w-72 overflow-hidden" : "h-[520px] w-[370px]"
          }`}
        >
          {/* Header */}
          <div className="relative flex items-center justify-between rounded-t-2xl border-b border-white/[0.06] bg-gradient-to-r from-violet-600/20 to-violet-900/10 px-4 py-3">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
                <Sparkles className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  CampusEye Assistant
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <p className="text-xs text-white/40">CampusEye AI</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
              >
                {minimized ? (
                  <ChevronDown className="h-4 w-4 rotate-180" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-none">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/10">
                        <Bot className="h-3.5 w-3.5 text-violet-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "rounded-tr-sm border border-violet-400/20 bg-violet-500/15 text-white/90"
                          : "rounded-tl-sm border border-white/[0.07] bg-white/[0.04] text-white/80"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/10">
                      <Bot className="h-3.5 w-3.5 text-violet-400" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.04] px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400/60 [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400/60 [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400/60 [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggestions — only show after first message with no user messages yet */}
                {messages.length === 1 && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-white/25">
                      Suggested
                    </p>
                    {suggestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-left text-xs text-white/55 transition hover:border-violet-400/20 hover:bg-violet-500/[0.07] hover:text-white/80"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="border-t border-white/[0.06] p-3">
                <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 focus-within:border-violet-400/30 transition">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask CampusEye anything…"
                    className="flex-1 resize-none bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                    style={{ maxHeight: "80px" }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-white/20">
                  Powered by Claude · CampusEye
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}