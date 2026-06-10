import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { safeHtml } from "../../lib/sanitize";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import {
  Sparkles, Plus, Send, BookOpen, Clock, MessageSquare,
  Trash2, X, ClipboardList, Code2, CalendarDays, Lightbulb,
  FileText, Globe, Calculator, CreditCard, Zap, ChevronDown,
  Eye, EyeOff, Paperclip,
} from "lucide-react";

// ── Mode config ───────────────────────────────────────────────────────────────
const MODES = [
  { id: "auto",       label: "Auto",        icon: Zap,           color: "text-white/60",    active: "border-white/30 bg-white/[0.08] text-white" },
  { id: "rag_qa",     label: "Q&A",         icon: BookOpen,      color: "text-violet-300",  active: "border-violet-500/50 bg-violet-500/15 text-violet-200" },
  { id: "quiz",       label: "Quiz",        icon: ClipboardList, color: "text-purple-300",  active: "border-purple-500/50 bg-purple-500/15 text-purple-200" },
  { id: "code",       label: "Code",        icon: Code2,         color: "text-cyan-300",    active: "border-cyan-500/50 bg-cyan-500/15 text-cyan-200" },
  { id: "study_plan", label: "Study Plan",  icon: CalendarDays,  color: "text-green-300",   active: "border-green-500/50 bg-green-500/15 text-green-200" },
  { id: "explain",    label: "Explain",     icon: Lightbulb,     color: "text-yellow-300",  active: "border-yellow-500/50 bg-yellow-500/15 text-yellow-200" },
  { id: "summarize",  label: "Summary",     icon: FileText,      color: "text-pink-300",    active: "border-pink-500/50 bg-pink-500/15 text-pink-200" },
  { id: "translate",  label: "Translate",   icon: Globe,         color: "text-orange-300",  active: "border-orange-500/50 bg-orange-500/15 text-orange-200" },
  { id: "formula",    label: "Formula",     icon: Calculator,    color: "text-fuchsia-300", active: "border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-200" },
  { id: "flashcard",  label: "Flashcards",  icon: CreditCard,    color: "text-emerald-300", active: "border-emerald-500/50 bg-emerald-500/15 text-emerald-200" },
];

const MODE_BADGE = {
  rag_qa:     "bg-violet-500/20 text-violet-300",
  quiz:       "bg-purple-500/20 text-purple-300",
  code:       "bg-cyan-500/20 text-cyan-300",
  study_plan: "bg-green-500/20 text-green-300",
  explain:    "bg-yellow-500/20 text-yellow-300",
  summarize:  "bg-pink-500/20 text-pink-300",
  translate:  "bg-orange-500/20 text-orange-300",
  formula:    "bg-fuchsia-500/20 text-fuchsia-300",
  flashcard:  "bg-emerald-500/20 text-emerald-300",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};
const formatDuration = (s) => {
  if (!s || s < 60) return `${s || 0}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
};

// ── Smart content renderers ───────────────────────────────────────────────────

/** Basic markdown: **bold**, bullet lists, line breaks */
const TextContent = ({ text }) => {
  const lines = text.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        // Heading ## or **bold** inline
        const isBullet = /^[-*•]\s/.test(line.trim());
        const isHeading = /^#+\s/.test(line.trim());
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/`(.+?)`/g, '<code class="rounded bg-white/10 px-1 py-0.5 text-xs font-mono">$1</code>');
        if (isHeading) {
          const clean = formatted.replace(/^#+\s/, "");
          return <p key={i} className="mt-3 font-semibold text-white/90" dangerouslySetInnerHTML={{ __html: safeHtml(clean) }} />;
        }
        if (isBullet) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
              <p className="text-white/80" dangerouslySetInnerHTML={{ __html: safeHtml(formatted.replace(/^[-*•]\s/, "")) }} />
            </div>
          );
        }
        return <p key={i} className="text-white/80" dangerouslySetInnerHTML={{ __html: safeHtml(formatted) }} />;
      })}
    </div>
  );
};

/** Code blocks: detect ```lang ... ``` and render with dark bg */
const CodeContent = ({ text }) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-3 text-sm">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.split("\n");
          const lang = lines[0].replace("```", "").trim() || "code";
          const code = lines.slice(1, -1).join("\n");
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.06] px-4 py-2">
                <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">{lang}</span>
              </div>
              <pre className="overflow-x-auto bg-[#0d1117] p-4 text-xs text-green-300">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        return part.trim() ? <TextContent key={i} text={part} /> : null;
      })}
    </div>
  );
};

/** Quiz: parse Q1/A)/Answer: format into interactive MCQ cards */
const QuizContent = ({ text }) => {
  const [revealed, setRevealed] = useState({});

  const blocks = text.split(/\n(?=Q\d+:)/g).filter(Boolean);
  if (!blocks.length) return <TextContent text={text} />;

  return (
    <div className="space-y-4">
      {blocks.map((block, qi) => {
        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
        const question = lines[0]?.replace(/^Q\d+:\s*/, "") ?? "";
        const options = lines.filter(l => /^[A-D]\)/.test(l));
        const answerLine = lines.find(l => /^Answer:/i.test(l));
        const answer = answerLine?.replace(/^Answer:\s*/i, "").trim().toUpperCase();

        return (
          <div key={qi} className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <p className="mb-3 text-sm font-semibold text-white/90">
              <span className="mr-2 text-xs font-bold text-purple-400">Q{qi + 1}</span>
              {question}
            </p>
            <div className="space-y-2">
              {options.map((opt, oi) => {
                const letter = opt[0];
                const isCorrect = letter === answer;
                const isRevealed = revealed[qi];
                return (
                  <div key={oi} className={`rounded-lg border px-3 py-2 text-sm transition ${
                    isRevealed
                      ? isCorrect
                        ? "border-green-500/40 bg-green-500/15 text-green-300"
                        : "border-white/10 bg-white/[0.03] text-white/40"
                      : "border-white/10 bg-white/[0.05] text-white/75"
                  }`}>
                    {opt}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setRevealed(p => ({ ...p, [qi]: !p[qi] }))}
              className="mt-3 flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition"
            >
              {revealed[qi] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {revealed[qi] ? "Hide answer" : "Reveal answer"}
            </button>
          </div>
        );
      })}
    </div>
  );
};

/** Flashcards: parse TERM:/DEFINITION: into flip cards */
const FlashcardContent = ({ text }) => {
  const [flipped, setFlipped] = useState({});

  const pairs = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let current = null;
  for (const line of lines) {
    if (/^TERM:/i.test(line)) {
      current = { term: line.replace(/^TERM:\s*/i, ""), definition: "" };
    } else if (/^DEFINITION:/i.test(line) && current) {
      current.definition = line.replace(/^DEFINITION:\s*/i, "");
      pairs.push(current);
      current = null;
    }
  }

  if (!pairs.length) return <TextContent text={text} />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {pairs.map((card, i) => (
        <button
          key={i}
          onClick={() => setFlipped(p => ({ ...p, [i]: !p[i] }))}
          className={`group relative min-h-[80px] rounded-xl border p-4 text-left transition-all duration-200 ${
            flipped[i]
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-white/10 bg-white/[0.05] hover:bg-white/[0.08]"
          }`}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">
              {flipped[i] ? "Definition" : "Term"}
            </span>
            <ChevronDown className={`h-3 w-3 text-white/20 transition-transform ${flipped[i] ? "rotate-180" : ""}`} />
          </div>
          <p className={`text-sm font-medium ${flipped[i] ? "text-emerald-200" : "text-white/80"}`}>
            {flipped[i] ? card.definition : card.term}
          </p>
          <p className="mt-1 text-[9px] text-white/20">{flipped[i] ? "" : "Tap to reveal definition"}</p>
        </button>
      ))}
    </div>
  );
};

/** Route content to the right renderer based on mode */
const SmartContent = ({ content, mode }) => {
  if (mode === "quiz")      return <QuizContent text={content} />;
  if (mode === "flashcard") return <FlashcardContent text={content} />;
  // Use CodeContent for code mode, OR for any message that contains fenced blocks
  if (mode === "code" || content.includes("```")) return <CodeContent text={content} />;
  return <TextContent text={content} />;
};

// ── Typing indicator ──────────────────────────────────────────────────────────
const Typing = () => (
  <div className="flex gap-3">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/30">
      <Sparkles className="h-3.5 w-3.5 text-violet-300" />
    </div>
    <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.07] px-4 py-3">
      {[0, 1, 2].map(i => (
        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  </div>
);

// ── Message bubble ────────────────────────────────────────────────────────────
const Bubble = ({ msg }) => {
  const isUser = msg.sender_role === "STUDENT";
  const modeInfo = MODES.find(m => m.id === msg.mode);

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
        isUser ? "bg-white text-black" : "bg-violet-500/30 text-violet-300"
      }`}>
        {isUser ? "Me" : <Sparkles className="h-3.5 w-3.5" />}
      </div>

      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
        {/* Mode badge — only on AI messages */}
        {!isUser && msg.mode_label && (
          <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
            MODE_BADGE[msg.mode] ?? "bg-white/10 text-white/40"
          }`}>
            {modeInfo && <modeInfo.icon className="mr-1 h-2.5 w-2.5" />}
            {msg.mode_label}
          </span>
        )}

        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-white text-black"
            : "rounded-tl-sm border border-white/10 bg-white/[0.07] text-white w-full"
        }`}>
          {isUser ? (
            <>
              {msg.content}
              {msg.attached_filename && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-black/10 bg-black/[0.06] px-2.5 py-1.5">
                  <Paperclip className="h-3 w-3 shrink-0 text-black/40" />
                  <span className="truncate text-[11px] text-black/50">{msg.attached_filename}</span>
                </div>
              )}
            </>
          ) : (
            <SmartContent content={msg.content} mode={msg.mode} />
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const StudentChatPage = () => {
  const { user } = useAuth();
  const { courseId } = useParams();

  const [sessions, setSessions]           = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [courses, setCourses]             = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(courseId ?? "");
  const [selectedMode, setSelectedMode]   = useState("auto");

  const [input, setInput]           = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [attachedFile, setAttachedFile] = useState(null);   // { filename, text, preview, truncated }
  const [fileUploading, setFileUploading] = useState(false);

  const [elapsed, setElapsed]       = useState(0);
  const timerRef                    = useRef(null);
  const sessionStartRef             = useRef(null);
  const bottomRef                   = useRef(null);
  const inputRef                    = useRef(null);
  const fileInputRef                = useRef(null);

  useEffect(() => { fetchSessions(); fetchCourses(); return () => clearInterval(timerRef.current); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, aiLoading]);

  const startTimer = () => {
    sessionStartRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000)), 1000);
  };
  const stopTimer = () => { clearInterval(timerRef.current); timerRef.current = null; };

  const fetchSessions = async () => {
    try {
      const res  = await axiosClient.get("chat-sessions/");
      const list = (Array.isArray(res.data) ? res.data : res.data.results ?? [])
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
      setSessions(list);
    } catch (err) { console.error(err); }
    finally { setSessionsLoading(false); }
  };

  const fetchCourses = async () => {
    try {
      const res = await axiosClient.get("me/courses/");
      setCourses(Array.isArray(res.data) ? res.data : res.data.results ?? []);
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const res = await axiosClient.get(`chat-messages/?session=${sessionId}`);
      setMessages(Array.isArray(res.data) ? res.data : res.data.results ?? []);
    } catch (err) { console.error(err); }
  };

  const createSession = async () => {
    stopTimer(); setElapsed(0);
    const courseTitle = courses.find(c => String(c.id) === String(selectedCourse))?.title;
    const title = courseTitle ? `${courseTitle} — Session` : "AI Tutor Session";
    try {
      const res = await axiosClient.post("chat-sessions/", { title, login_method: "PASSWORD" });
      setSessions(prev => [res.data, ...prev]);
      setActiveSession(res.data);
      setMessages([]);
      startTimer();
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) { console.error(err); }
  };

  const openSession = async (session) => {
    stopTimer(); setElapsed(0);
    setActiveSession(session);
    await fetchMessages(session.id);
    startTimer();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await axiosClient.delete(`chat-sessions/${sessionId}/`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) { setActiveSession(null); setMessages([]); stopTimer(); setElapsed(0); }
    } catch (err) { console.error(err); }
  };

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || aiLoading || !activeSession) return;
    setInput("");
    const fileCtx = attachedFile?.text ?? null;
    setAttachedFile(null);

    const userMsg = {
      id: Date.now(),
      sender_role: "STUDENT",
      content: question,
      attached_filename: attachedFile?.filename ?? null,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setAiLoading(true);

    try {
      // Save user message
      await axiosClient.post("chat-messages/", { session_id: activeSession.id, sender_role: "STUDENT", content: question });

      // Ask multi-agent tutor
      const aiRes = await axiosClient.post("chat/ask/", {
        question,
        course_id:    selectedCourse || undefined,
        student_id:   user?.id,
        mode:         selectedMode === "auto" ? undefined : selectedMode,
        file_context: fileCtx || undefined,
      });

      const { answer = "I couldn't find an answer. Try rephrasing.", mode, mode_label } = aiRes.data ?? {};

      // Save AI response
      await axiosClient.post("chat-messages/", { session_id: activeSession.id, sender_role: "TUTOR", content: answer });

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender_role: "TUTOR",
        content: answer,
        mode,
        mode_label,
        timestamp: new Date().toISOString(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender_role: "TUTOR",
        content: "Something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    } finally { setAiLoading(false); }
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    setFileUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await axiosClient.post("chat/upload/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachedFile(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || "Could not read this file. Try another one.";
      alert(msg);
    } finally {
      setFileUploading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-100px)] gap-5 overflow-hidden">

        {/* ── LEFT: Sessions + Controls ───────────────────────────── */}
        <div className="flex w-72 shrink-0 flex-col gap-3 overflow-hidden rounded-[var(--radius-xl)] p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>

          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-white/30">Sessions</p>
            <button onClick={createSession}
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20 transition">
              <Plus className="h-3.5 w-3.5" /> New
            </button>
          </div>

          {/* Course selector */}
          {courses.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-white/30" />
              <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                className="w-full bg-transparent text-xs text-white/60 outline-none">
                <option value="">All courses</option>
                {courses.map(c => <option key={c.id} value={c.id} className="bg-[#0c1120]">{c.title}</option>)}
              </select>
            </div>
          )}

          {/* ── Mode selector ── */}
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-white/20">Agent mode</p>
            <div className="grid grid-cols-2 gap-1.5">
              {MODES.map(({ id, label, icon: Icon, color, active }) => (
                <button key={id} onClick={() => setSelectedMode(id)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                    selectedMode === id ? active : `border-white/[0.07] bg-transparent ${color} hover:bg-white/[0.04]`
                  }`}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Session list */}
          <div className="flex-1 space-y-2 overflow-y-auto">
            {sessionsLoading && <p className="mt-6 text-center text-xs text-white/20">Loading…</p>}
            {!sessionsLoading && sessions.length === 0 && (
              <div className="mt-8 flex flex-col items-center gap-2 text-center">
                <MessageSquare className="h-8 w-8 text-white/10" />
                <p className="text-xs text-white/20">No sessions yet.</p>
                <p className="text-xs text-white/15">Click New to start.</p>
              </div>
            )}
            {sessions.map(s => (
              <div key={s.id} onClick={() => openSession(s)}
                className={`group relative cursor-pointer rounded-xl border p-3 transition ${
                  activeSession?.id === s.id
                    ? "border-violet-500/40 bg-violet-500/15"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <p className={`truncate text-xs font-medium ${activeSession?.id === s.id ? "text-violet-200" : "text-white/70"}`}>
                    {s.title}
                  </p>
                  <button onClick={e => deleteSession(s.id, e)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/25">
                  <Clock className="h-3 w-3" /> {formatDate(s.started_at)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Chat Panel ────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)]" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>

          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20">
                <Sparkles className="h-4 w-4 text-violet-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {activeSession ? activeSession.title : "AI Tutor"}
                </p>
                <p className="text-[10px] text-white/30">
                  {activeSession ? formatDate(activeSession.started_at) : "Start a new session"}
                </p>
              </div>
            </div>

            {activeSession && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                  <span className="font-mono text-xs text-white/50">{formatDuration(elapsed)}</span>
                </div>
                <button onClick={() => { stopTimer(); setActiveSession(null); setMessages([]); setElapsed(0); }}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 transition">
                  <X className="h-3.5 w-3.5" /> Stop
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {!activeSession && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-violet-500/10">
                  <Sparkles className="h-8 w-8 text-violet-300" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">AI Tutor</p>
                  <p className="mt-1 text-sm text-white/30">Select a session or start a new one.</p>
                </div>
                <button onClick={createSession}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 py-2.5 text-sm font-medium text-violet-300 hover:bg-violet-500/20 transition">
                  <Plus className="h-4 w-4" /> Start Nouvelle séance
                </button>
              </div>
            )}
            {activeSession && messages.length === 0 && !aiLoading && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-white/30">Ask me anything about your course material.</p>
                <p className="text-xs text-white/20">
                  Current mode: <span className="text-white/40 font-medium">
                    {MODES.find(m => m.id === selectedMode)?.label ?? "Auto"}
                  </span>
                </p>
              </div>
            )}
            {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
            {aiLoading && <Typing />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {activeSession && (
            <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.py,.js,.ts,.jsx,.tsx,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.swift,.kt,.html,.css,.sql,.sh,.json,.xml,.yaml,.yml,.txt,.md,.csv"
                onChange={handleFileSelect}
              />

              {/* Active mode indicator */}
              <div className="mb-2 flex items-center gap-2">
                {(() => {
                  const m = MODES.find(x => x.id === selectedMode);
                  return m ? (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      selectedMode === "auto" ? "bg-white/[0.06] text-white/40" : MODE_BADGE[selectedMode] ?? "bg-white/[0.06] text-white/40"
                    }`}>
                      <m.icon className="h-2.5 w-2.5" /> {m.label}
                    </span>
                  ) : null;
                })()}
                <span className="text-[10px] text-white/20">
                  {selectedMode === "auto" ? "AI will pick the best agent" : "Mode forced — AI will use this agent"}
                </span>
              </div>

              {/* Attached file pill */}
              {attachedFile && (
                <div className="mb-2 flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-cyan-300">{attachedFile.filename}</p>
                    {attachedFile.truncated && (
                      <p className="text-[10px] text-cyan-500/70">Truncated to 12 000 chars for context</p>
                    )}
                  </div>
                  <button onClick={() => setAttachedFile(null)}
                    className="shrink-0 text-cyan-500/60 hover:text-cyan-300 transition">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-3 rounded-[var(--radius-lg)] px-4 py-3 transition" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                {/* Attach button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={fileUploading || aiLoading}
                  title="Attach a file (PDF, DOCX, or code)"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
                    attachedFile
                      ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-400"
                      : "border-white/10 bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.08]"
                  } disabled:cursor-not-allowed disabled:opacity-30`}>
                  {fileUploading
                    ? <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white/60" />
                    : <Paperclip className="h-3.5 w-3.5" />
                  }
                </button>

                <textarea ref={inputRef} rows={1} value={input}
                  onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder={attachedFile ? `Ask about "${attachedFile.filename}"…` : "Ask about your course material…"}
                  className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
                  style={{ maxHeight: 120 }} />
                <button onClick={sendMessage} disabled={!input.trim() || aiLoading}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-30 transition">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-white/15">Powered by CampusEye AI · Enter to send · 📎 attach PDF, DOCX or code</p>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default StudentChatPage;
