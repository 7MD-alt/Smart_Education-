import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Minimize2, ChevronDown, Paperclip, XCircle, Zap,
         FileDown, Mail, CheckCircle, AlertCircle } from "lucide-react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// NOVAA HUD CSS
// ─────────────────────────────────────────────────────────────────────────────
const HUD_CSS = `
  @keyframes novaa-ring-cw   { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
  @keyframes novaa-ring-ccw  { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
  @keyframes novaa-orb-pulse { 0%,100%{ opacity:.7; transform:scale(1); } 50%{ opacity:1; transform:scale(1.08); } }
  @keyframes novaa-scanline  { 0%{ top:-6%; opacity:.6; } 80%{ opacity:.3; } 100%{ top:106%; opacity:0; } }
  @keyframes novaa-flicker   { 0%,100%{ opacity:1; } 92%{ opacity:1; } 93%{ opacity:.6; } 95%{ opacity:1; } 97%{ opacity:.8; } }
  @keyframes novaa-glow-in   { from{ opacity:0; transform:scale(.92); } to{ opacity:1; transform:scale(1); } }
  @keyframes novaa-float     { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-4px); } }
  @keyframes novaa-thinking  { 0%,100%{ opacity:.3; transform:scaleX(1); } 50%{ opacity:1; transform:scaleX(1.15); } }
  @keyframes novaa-dots      { 0%,80%,100%{ transform:scale(0); opacity:0; } 40%{ transform:scale(1); opacity:1; } }
  @keyframes novaa-msg-in    { from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:translateY(0); } }
  @keyframes novaa-action-in { from{ opacity:0; transform:translateY(8px) scale(.97); } to{ opacity:1; transform:translateY(0) scale(1); } }

  .novaa-hud-panel  { animation: novaa-glow-in .25s ease both; }
  .novaa-orb        { animation: novaa-orb-pulse 3s ease-in-out infinite, novaa-float 6s ease-in-out infinite; }
  .novaa-ring-1     { animation: novaa-ring-cw  8s linear infinite; }
  .novaa-ring-2     { animation: novaa-ring-ccw 12s linear infinite; }
  .novaa-scanline   { animation: novaa-scanline 4s linear infinite; }
  .novaa-flicker    { animation: novaa-flicker  8s ease-in-out infinite; }
  .novaa-btn-float  { animation: novaa-float 4s ease-in-out infinite; }
  .novaa-msg-in     { animation: novaa-msg-in .2s ease both; }
  .novaa-action-in  { animation: novaa-action-in .3s ease both; }
  .novaa-thinking-bar { animation: novaa-thinking 1.2s ease-in-out infinite; }
  .novaa-dot-1 { animation: novaa-dots 1.4s ease-in-out .0s infinite; }
  .novaa-dot-2 { animation: novaa-dots 1.4s ease-in-out .2s infinite; }
  .novaa-dot-3 { animation: novaa-dots 1.4s ease-in-out .4s infinite; }

  .novaa-scrollbar::-webkit-scrollbar       { width: 3px; }
  .novaa-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .novaa-scrollbar::-webkit-scrollbar-thumb { background: #006eff44; border-radius: 99px; }

  .novaa-input::placeholder { color: #4a7aaa; }
  .novaa-input { caret-color: #00d2ff; }
  .novaa-input:focus { outline: none; }

  .novaa-msg-user .novaa-bubble {
    background: linear-gradient(135deg, rgba(0,110,255,.18), rgba(140,40,255,.12));
    border: 1px solid rgba(0,180,255,.25); color: #cce8ff;
  }
  .novaa-msg-ai .novaa-bubble {
    background: rgba(0,18,40,.7);
    border: 1px solid rgba(0,210,255,.12); color: #aadcff;
  }
  .novaa-action-btn {
    transition: all .15s ease;
  }
  .novaa-action-btn:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }
`;

function useHudStyle() {
  useEffect(() => {
    if (document.getElementById("novaa-hud-style")) return;
    const el = document.createElement("style");
    el.id = "novaa-hud-style";
    el.textContent = HUD_CSS;
    document.head.appendChild(el);
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// Role config — updated with new action task chips
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_CFG = {
  STUDENT: {
    label: "STUDENT",
    color: "#006eff",
    glow:  "rgba(0,110,255,.5)",
    tasks: [
      { e: "📊", t: "Check my absences",       p: "How many absences do I have in each course? Am I in the danger zone?" },
      { e: "🎯", t: "Generate a quiz",          p: "Generate a mixed quiz (MCQ + True/False + fill-in-blank) from my course material." },
      { e: "🧠", t: "Explain a concept",        p: "Explain this concept step by step with prerequisites, ELI5, and real-world examples:" },
      { e: "📋", t: "Build a study plan",       p: "Build me a 2-week Pomodoro-based exam study plan based on my courses." },
      { e: "🃏", t: "Create flashcards",        p: "Create 15 flashcards for the key terms in my course material." },
      { e: "🎓", t: "Predict exam questions",   p: "Analyse my course material and predict the most likely exam questions." },
      { e: "💡", t: "Get hints",                p: "Give me progressive hints to solve this problem without giving the answer:" },
      { e: "⚖️", t: "Compare two concepts",    p: "Compare these two concepts side by side with a table:" },
      { e: "⚙️", t: "Solve a problem",          p: "Solve this step-by-step showing all working:" },
      { e: "🗺️", t: "Build a mind map",         p: "Build a complete mind map for this topic:" },
      { e: "🔍", t: "Research a topic",         p: "Research this topic for me:" },
      { e: "📐", t: "Formula help",             p: "Explain this formula with derivation and a worked example:" },
      { e: "📋", t: "Summarize material",       p: "Summarize the key points of my course material for exam revision." },
      { e: "🔤", t: "Translate content",        p: "Translate this to English / French / Darija:" },
      { e: "✉️", t: "Email my teacher",         p: "Draft a formal email to my teacher asking about my attendance status." },
      { e: "💻", t: "Debug my code",            p: "Help me debug this code:" },
      { e: "🗓️", t: "My upcoming sessions",    p: "What sessions do I have scheduled this week?" },
    ],
  },
  TEACHER: {
    label: "TEACHER",
    color: "#00d2ff",
    glow:  "rgba(0,210,255,.5)",
    tasks: [
      { e: "📅", t: "Programme une séance",     p: "Programme une séance pour mon cours." },
      { e: "▶️", t: "Démarrer la séance",       p: "Démarre la séance de présence pour mon cours." },
      { e: "⏹️", t: "Terminer la séance",       p: "Termine la séance active en cours." },
      { e: "📝", t: "Créer un devoir",          p: "Crée un nouveau devoir pour mon cours." },
      { e: "🚨", t: "Alerter les étudiants",    p: "Envoie des emails d'avertissement à tous les étudiants en zone de danger de mon cours." },
      { e: "📈", t: "Stats de présence",        p: "Donne-moi un résumé de présence pour tous mes cours ce mois-ci." },
      { e: "🧠", t: "Expliquer un concept",     p: "Explique ce concept étape par étape:" },
      { e: "⚖️", t: "Comparer deux concepts",  p: "Compare ces deux concepts côte à côte avec un tableau:" },
      { e: "🗺️", t: "Carte mentale",            p: "Construis une carte mentale complète pour ce sujet:" },
      { e: "🔍", t: "Rechercher un sujet",      p: "Fais des recherches sur ce sujet:" },
      { e: "✉️", t: "Rédiger un email",         p: "Rédige un email formal d'avertissement pour un étudiant ayant atteint le maximum d'absences." },
      { e: "💻", t: "Aide code",                p: "Aide-moi à déboguer ce code:" },
    ],
  },
  ADMIN: {
    label: "ADMIN",
    color: "#8c28ff",
    glow:  "rgba(140,40,255,.5)",
    tasks: [
      { e: "📊", t: "Vue d'ensemble",           p: "Donne-moi une vue d'ensemble complète de la plateforme : étudiants, enseignants, cours, taux de présence." },
      { e: "🚨", t: "Rapport zone de danger",   p: "Liste tous les étudiants de la plateforme actuellement en zone de danger." },
      { e: "✅", t: "Approuver face ID",        p: "Approuve la demande d'enregistrement facial #" },
      { e: "👥", t: "Inscrire un étudiant",     p: "Inscris l'étudiant [username] dans la filière [code]." },
      { e: "📧", t: "Annonce plateforme",       p: "Envoie un email de rappel de politique de présence à tous les étudiants." },
      { e: "📋", t: "Demandes face en attente", p: "Combien de demandes d'enregistrement facial sont en attente de validation ?" },
      { e: "📈", t: "Présence ce mois",         p: "Quel est le taux de présence global ce mois-ci et quels sont les cours les moins performants ?" },
      { e: "🔍", t: "Étudiants inactifs",       p: "Quels étudiants n'ont eu aucune présence ces 2 dernières semaines ?" },
      { e: "✉️", t: "Rédiger un email admin",   p: "Rédige un email administratif formel:" },
      { e: "🔬", t: "Rechercher un sujet",      p: "Fais des recherches sur ce sujet pour une décision de plateforme:" },
      { e: "🧠", t: "Expliquer un concept",     p: "Explique ce concept:" },
      { e: "⚖️", t: "Comparer des solutions",  p: "Compare ces deux approches côte à côte:" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Action intents that produce an action_result (not just text)
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_INTENTS = new Set([
  "start_session", "end_session", "create_assignment", "create_seance",
  "send_bulk_email", "send_single_email",
  "approve_face_request", "reject_face_request", "enroll_student",
]);

// Intents whose text response is PDF-exportable
const PDF_INTENTS = new Set([
  "quiz", "study_plan", "summarize", "explain", "flashcard",
  "mindmap", "rag_qa", "research", "platform_query", "email_draft",
  "problem_solver", "exam_predict", "compare", "hint",
]);

// Intents whose response likely contains an email draft → show Send button
const EMAIL_DRAFT_INTENTS = new Set(["email_draft"]);

// ─────────────────────────────────────────────────────────────────────────────
// Minimal markdown renderer
// ─────────────────────────────────────────────────────────────────────────────
function renderMd(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith("```")) {
      const lang = l.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      out.push(
        <pre key={i} style={{ background: "rgba(0,0,0,.5)", border: "1px solid #006eff33", borderRadius: 6, padding: "8px 10px", overflowX: "auto", fontSize: 11, color: "#00ff82", fontFamily: "monospace", margin: "6px 0" }}>
          {lang && <span style={{ display: "block", fontSize: 9, color: "#4a7aaa", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{lang}</span>}
          <code>{code.join("\n")}</code>
        </pre>
      );
      i++; continue;
    }
    if (l.startsWith("### ")) { out.push(<h3 key={i} style={{ color: "#00d2ff", fontSize: 12, fontWeight: 700, margin: "8px 0 3px" }}>{inlineF(l.slice(4))}</h3>); i++; continue; }
    if (l.startsWith("## "))  { out.push(<h2 key={i} style={{ color: "#00d2ff", fontSize: 13, fontWeight: 700, margin: "8px 0 3px" }}>{inlineF(l.slice(3))}</h2>); i++; continue; }
    if (l.startsWith("# "))   { out.push(<h1 key={i} style={{ color: "#00d2ff", fontSize: 14, fontWeight: 700, margin: "8px 0 3px" }}>{inlineF(l.slice(2))}</h1>); i++; continue; }
    if (l.trim() === "---") { out.push(<hr key={i} style={{ border: "none", borderTop: "1px solid #006eff22", margin: "6px 0" }} />); i++; continue; }
    if (l.match(/^[-*] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) { items.push(<li key={i}>{inlineF(lines[i].replace(/^[-*] /, ""))}</li>); i++; }
      out.push(<ul key={`ul${i}`} style={{ margin: "4px 0", paddingLeft: 18, color: "#8ab8d8" }}>{items}</ul>); continue;
    }
    if (l.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(<li key={i}>{inlineF(lines[i].replace(/^\d+\. /, ""))}</li>); i++; }
      out.push(<ol key={`ol${i}`} style={{ margin: "4px 0", paddingLeft: 18, color: "#8ab8d8" }}>{items}</ol>); continue;
    }
    if (l.trim() === "") { out.push(<div key={`sp${i}`} style={{ height: 6 }} />); i++; continue; }
    out.push(<p key={i} style={{ margin: "2px 0", lineHeight: 1.55, color: "#aadcff" }}>{inlineF(l)}</p>);
    i++;
  }
  return out;
}

function inlineF(text) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const r = m[0];
    if (r.startsWith("**")) parts.push(<strong key={m.index} style={{ color: "#00d2ff", fontWeight: 700 }}>{r.slice(2, -2)}</strong>);
    else if (r.startsWith("*")) parts.push(<em key={m.index} style={{ color: "#aadcff" }}>{r.slice(1, -1)}</em>);
    else parts.push(<code key={m.index} style={{ background: "rgba(0,0,0,.5)", color: "#00ff82", fontFamily: "monospace", fontSize: 11, padding: "1px 5px", borderRadius: 3 }}>{r.slice(1, -1)}</code>);
    last = m.index + r.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

const MODE_CLR = {
  rag_qa: "#006eff", quiz: "#f59e0b", code: "#00ff82", study_plan: "#8c28ff",
  explain: "#00d2ff", summarize: "#14b8a6", translate: "#ec4899",
  formula: "#f97316", flashcard: "#eab308", research: "#6366f1",
  platform_query: "#00d2ff", email_draft: "#f43f5e",
  problem_solver: "#ef4444", mindmap: "#84cc16",
  start_session: "#00ff82", end_session: "#f59e0b",
  create_assignment: "#8c28ff", send_bulk_email: "#f43f5e",
  approve_face_request: "#00ff82", reject_face_request: "#ef4444",
  enroll_student: "#00d2ff",
};

// ─────────────────────────────────────────────────────────────────────────────
// NovaaOrb
// ─────────────────────────────────────────────────────────────────────────────
function NovaaOrb({ size = 56, color, glow, state = "standby" }) {
  const r = size / 2;
  const ring1R = r * 0.88;
  const ring2R = r * 0.76;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: -6, borderRadius: "50%", background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`, opacity: state === "processing" ? 1 : 0.5, pointerEvents: "none" }} />
      <div className="novaa-ring-1" style={{ position: "absolute", inset: 0, borderRadius: "50%" }}>
        <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
          <ellipse cx={r} cy={r} rx={ring1R} ry={ring1R * 0.38} fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={0.5} strokeDasharray="4 6" />
        </svg>
      </div>
      <div className="novaa-ring-2" style={{ position: "absolute", inset: 0, borderRadius: "50%" }}>
        <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
          <ellipse cx={r} cy={r} rx={ring2R} ry={ring2R * 0.42} fill="none" stroke={color} strokeWidth={0.8} strokeOpacity={0.35} strokeDasharray="2 8" />
        </svg>
      </div>
      <div className="novaa-orb" style={{ position: "absolute", inset: "22%", borderRadius: "50%", background: `radial-gradient(circle at 38% 35%, ${color}cc, ${color}44 60%, transparent)`, boxShadow: `0 0 ${size * 0.3}px ${color}99, inset 0 0 ${size * 0.15}px ${color}44` }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: size * 0.12, height: size * 0.12, borderRadius: "50%", background: "#fff", opacity: 0.9, boxShadow: `0 0 ${size * 0.12}px #fff` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActionResultCard — shown when NOVAA executes a platform action
// ─────────────────────────────────────────────────────────────────────────────
function ActionResultCard({ actionResult, color }) {
  if (!actionResult) return null;
  const ok = actionResult.success;
  const Icon = ok ? CheckCircle : AlertCircle;
  const borderColor = ok ? `${color}44` : "#f4433544";
  const bgColor     = ok ? `${color}08` : "rgba(244,67,53,.06)";
  const iconColor   = ok ? color : "#f44335";

  return (
    <div className="novaa-action-in" style={{
      borderRadius: 10, border: `1px solid ${borderColor}`,
      background: bgColor, padding: "10px 12px", marginTop: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
        <Icon size={14} color={iconColor} />
        <span style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: 1.5, color: iconColor, fontWeight: 700 }}>
          {ok ? "ACTION EXECUTED" : "ACTION FAILED"}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: "#aadcff", lineHeight: 1.5 }}>
        {renderMd(actionResult.message)}
      </div>
      {ok && actionResult.data && Object.keys(actionResult.data).length > 0 && (
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
          {Object.entries(actionResult.data).map(([k, v]) =>
            v != null && (
              <span key={k} style={{
                fontSize: 9, fontFamily: "monospace", padding: "2px 7px",
                borderRadius: 99, background: `${color}14`,
                border: `1px solid ${color}33`, color: color,
              }}>
                {k}: {String(v)}
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmailSendBar — shown below email_draft responses
// ─────────────────────────────────────────────────────────────────────────────
function EmailSendBar({ content, color }) {
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  // Extract subject and body from the drafted email text
  const extractEmail = useCallback(() => {
    const subjectMatch = content.match(/\*\*Subject:\*\*\s*(.+)/i)
      || content.match(/Objet\s*:\s*(.+)/i)
      || content.match(/Subject:\s*(.+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : "Message from CampusEye";

    // Strip markdown, get clean body
    const body = content
      .replace(/\*\*[^*]+\*\*/g, m => m.slice(2, -2))
      .replace(/\*[^*]+\*/g, m => m.slice(1, -1))
      .trim();

    return { subject, body };
  }, [content]);

  const handleSend = async () => {
    setSending(true); setError("");
    const { subject, body } = extractEmail();
    try {
      await axiosClient.post("ai/send-email/", {
        to_email: "", // user will be prompted if blank — for now post as-is
        to_name: "",
        subject,
        body,
      });
      setSent(true);
    } catch (e) {
      setError("Send failed. Check your connection.");
    } finally { setSending(false); }
  };

  if (sent) return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 10, color: "#00ff82", fontFamily: "monospace" }}>
      <CheckCircle size={12} /> EMAIL SENT SUCCESSFULLY
    </div>
  );

  return (
    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <button
        onClick={handleSend} disabled={sending}
        className="novaa-action-btn"
        style={{
          display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
          background: `${color}18`, border: `1px solid ${color}55`,
          borderRadius: 7, cursor: "pointer", color: color,
          fontSize: 10, fontFamily: "monospace", letterSpacing: 1,
        }}
      >
        <Mail size={11} />
        {sending ? "SENDING..." : "SEND THIS EMAIL"}
      </button>
      {error && <span style={{ fontSize: 10, color: "#f44335" }}>{error}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PdfExportBar — shown below exportable AI responses
// ─────────────────────────────────────────────────────────────────────────────
function PdfExportBar({ content, title, mode, role, courseTitle, color }) {
  const [exporting, setExporting] = useState(false);
  const [done,      setDone]      = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axiosClient.post(
        "ai/pdf/",
        { content, title, doc_type: mode, course_title: courseTitle || "" },
        { responseType: "blob" },
      );
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `novaa_${(title || "document").replace(/\s+/g, "_").slice(0, 40)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch {
      // silently fail — PDF service might not have reportlab installed yet
    } finally { setExporting(false); }
  };

  return (
    <div style={{ marginTop: 6 }}>
      <button
        onClick={handleExport} disabled={exporting}
        className="novaa-action-btn"
        style={{
          display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
          background: done ? "rgba(0,255,130,.1)" : "rgba(255,255,255,.04)",
          border: `1px solid ${done ? "#00ff8244" : "#ffffff18"}`,
          borderRadius: 6, cursor: "pointer",
          color: done ? "#00ff82" : "#4a7aaa",
          fontSize: 9, fontFamily: "monospace", letterSpacing: 1,
          transition: "all .2s",
        }}
      >
        <FileDown size={10} />
        {done ? "PDF DOWNLOADED ✓" : exporting ? "GENERATING..." : "EXPORT PDF"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Widget
// ─────────────────────────────────────────────────────────────────────────────
export default function AIChatWidget() {
  useHudStyle();
  const { user } = useAuth();
  const role = user?.role || "STUDENT";
  const cfg  = ROLE_CFG[role] || ROLE_CFG.STUDENT;
  const name = user?.first_name || user?.username || "there";

  const [open,       setOpen]       = useState(false);
  const [minimized,  setMinimized]  = useState(false);

  // Course picker — fetched once when the widget first opens
  const [courses,        setCourses]       = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);   // course id (int) or null
  const [coursesLoaded,  setCoursesLoaded]  = useState(false);
  const [messages,   setMessages]   = useState([{
    role: "assistant",
    content: `**NOVAA ONLINE** — ${cfg.label} interface active.\n\nHello ${name}. I'm linked to your platform data. Select a task or type your query.`,
    mode: null, modeLabel: null,
  }]);
  const [input,        setInput]      = useState("");
  const [loading,      setLoading]    = useState(false);
  const [uploadedFile, setUploaded]   = useState(null);
  const [uploadBusy,   setUpBusy]     = useState(false);
  const [showAll,      setShowAll]    = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);
  const textaRef  = useRef(null);

  const aiState = loading ? "processing" : "standby";
  const hasUser = messages.some(m => m.role === "user");
  const tasks   = showAll ? cfg.tasks : cfg.tasks.slice(0, 4);

  useEffect(() => {
    if (open && !minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, minimized]);

  // Fetch the user's courses once on first open — activates RAG on platform materials
  useEffect(() => {
    if (open && !coursesLoaded) {
      axiosClient.get("me/courses/")
        .then(res => {
          const list = (res.data || []).map(c => ({
            id:            c.id,
            name:          c.name || c.title || `Course ${c.id}`,
            materialCount: c.material_count ?? 0,
          }));
          setCourses(list);
          // Auto-select the first course that has uploaded materials
          const withMaterial = list.find(c => c.materialCount > 0);
          if (withMaterial) setSelectedCourse(withMaterial.id);
        })
        .catch(() => {})
        .finally(() => setCoursesLoaded(true));
    }
  }, [open, coursesLoaded]);

  // File upload
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await axiosClient.post("chat/upload/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setUploaded({ name: file.name, text: r.data.text });
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "Could not read that file. Try PDF, DOCX, or a code file.", mode: null }]);
    } finally { setUpBusy(false); e.target.value = ""; }
  };

  // Send
  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setMessages(p => [...p, { role: "user", content: q }]);
    setInput("");
    if (textaRef.current) textaRef.current.style.height = "auto";
    setLoading(true);
    try {
      const payload = { question: q };
      if (selectedCourse)  payload.course_id    = selectedCourse;
      if (uploadedFile) { payload.file_context = uploadedFile.text; setUploaded(null); }
      const res = await axiosClient.post("ai/ask/", payload);
      setMessages(p => [...p, {
        role:         "assistant",
        content:      res.data.answer || "No response.",
        mode:         res.data.mode || null,
        modeLabel:    res.data.mode_label || null,
        usedWeb:      res.data.used_web_research || false,
        actionResult: res.data.action_result || null,
        isAction:     !!res.data.action_result,
        followups:    res.data.followups || [],
        verification: res.data.verification || null,
      }]);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "Connection lost. Please try again.", mode: null }]);
    } finally { setLoading(false); }
  };

  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const C = cfg.color;
  const G = cfg.glow;

  return (
    <>
      {/* Floating orb button */}
      {!open && (
        <button onClick={() => setOpen(true)} className="novaa-btn-float"
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
          <NovaaOrb size={58} color={C} glow={G} state="standby" />
        </button>
      )}

      {/* HUD Panel */}
      {open && (
        <div className="novaa-hud-panel" style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: minimized ? 280 : 400,
          height: minimized ? 52 : 600,
          overflow: "hidden",
          background: "linear-gradient(160deg, #040d1a 0%, #020810 100%)",
          border: `1px solid ${C}33`, borderRadius: 16,
          boxShadow: `0 0 40px rgba(0,0,0,.8), 0 0 80px ${G.replace(".5", ".15")}`,
          display: "flex", flexDirection: "column",
          transition: "width .3s ease, height .3s ease",
        }}>

          {/* Scanline */}
          {!minimized && (
            <div className="novaa-scanline" style={{ position: "absolute", left: 0, right: 0, height: "3px", zIndex: 1, pointerEvents: "none", background: `linear-gradient(to bottom, transparent, ${C}44, transparent)` }} />
          )}

          {/* Corner accents */}
          {!minimized && <>
            <div style={{ position: "absolute", top: 0, left: 0, width: 18, height: 18, borderTop: `2px solid ${C}`, borderLeft: `2px solid ${C}`, borderRadius: "16px 0 0 0", opacity: .7 }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: 18, height: 18, borderTop: `2px solid ${C}`, borderRight: `2px solid ${C}`, borderRadius: "0 16px 0 0", opacity: .7 }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 18, height: 18, borderBottom: `2px solid ${C}`, borderLeft: `2px solid ${C}`, borderRadius: "0 0 0 16px", opacity: .7 }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 18, height: 18, borderBottom: `2px solid ${C}`, borderRight: `2px solid ${C}`, borderRadius: "0 0 16px 0", opacity: .7 }} />
          </>}

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${C}1a`, flexShrink: 0, background: `linear-gradient(90deg, ${C}0a, transparent)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <NovaaOrb size={36} color={C} glow={G} state={aiState} />
              <div>
                <div className="novaa-flicker" style={{ fontSize: 13, fontWeight: 700, color: C, fontFamily: "monospace", letterSpacing: 2 }}>N.O.V.A.A</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: loading ? "#8c28ff" : "#00ff82", boxShadow: `0 0 6px ${loading ? "#8c28ff" : "#00ff82"}` }} />
                  <span style={{ fontSize: 9, color: C, fontFamily: "monospace", letterSpacing: 2, opacity: .8 }}>
                    {loading ? "PROCESSING" : "ONLINE"} · {cfg.label}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setMinimized(v => !v)} style={btnStyle}>
                {minimized ? <ChevronDown size={14} /> : <Minimize2 size={14} />}
              </button>
              <button onClick={() => setOpen(false)} style={btnStyle}><X size={14} /></button>
            </div>
          </div>

          {!minimized && (<>

            {/* Course picker bar — activates RAG on platform materials */}
            {courses.length > 0 && (
              <div style={{
                padding: "5px 12px", borderBottom: `1px solid ${C}15`,
                flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
                overflowX: "auto", background: `${C}05`,
              }}>
                <span style={{ fontSize: 8, color: `${C}66`, fontFamily: "monospace", letterSpacing: 1, flexShrink: 0 }}>📚</span>
                {/* ALL chip */}
                <button onClick={() => setSelectedCourse(null)} style={{
                  flexShrink: 0, cursor: "pointer", fontFamily: "monospace", letterSpacing: 0.5,
                  whiteSpace: "nowrap", fontSize: 9, borderRadius: 99, padding: "2px 9px",
                  border: `1px solid ${!selectedCourse ? C + "77" : C + "22"}`,
                  background: !selectedCourse ? `${C}22` : "transparent",
                  color: !selectedCourse ? C : `${C}66`,
                }}>ALL</button>
                {courses.map(c => {
                  const isActive  = selectedCourse === c.id;
                  const hasMat    = c.materialCount > 0;
                  const chipColor = hasMat ? C : "#ffffff";
                  const tooltip   = hasMat
                    ? `${c.materialCount} file${c.materialCount > 1 ? "s" : ""} uploaded — RAG active`
                    : "No files uploaded yet — general answers only";
                  return (
                    <button key={c.id} onClick={() => setSelectedCourse(c.id)}
                      title={tooltip}
                      style={{
                        flexShrink: 0, cursor: "pointer", fontFamily: "monospace", letterSpacing: 0.5,
                        whiteSpace: "nowrap", fontSize: 9, borderRadius: 99, padding: "2px 9px",
                        border: `1px solid ${isActive ? chipColor + "77" : chipColor + "18"}`,
                        background: isActive ? `${chipColor}18` : "transparent",
                        color: isActive ? chipColor : `${chipColor}44`,
                        opacity: hasMat ? 1 : 0.45,
                      }}>
                      {c.name.length > 18 ? c.name.slice(0, 17) + "…" : c.name}
                      {hasMat
                        ? <span style={{ marginLeft: 4, opacity: .7, color: "#00ff82" }}>·{c.materialCount}</span>
                        : <span style={{ marginLeft: 4, opacity: .5 }}>∅</span>
                      }
                    </button>
                  );
                })}
              </div>
            )}

            {/* Messages */}
            <div className="novaa-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

              {messages.map((msg, i) => (
                <div key={i} className={`novaa-msg-in ${msg.role === "user" ? "novaa-msg-user" : "novaa-msg-ai"}`}
                  style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>

                  {msg.role === "assistant" && (
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${C}44`, background: `radial-gradient(circle, ${C}22, transparent)`, flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: C, boxShadow: `0 0 6px ${C}` }} />
                    </div>
                  )}

                  <div style={{ maxWidth: "84%", display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Mode badge + quality score row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {msg.role === "assistant" && msg.modeLabel && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1.5, color: MODE_CLR[msg.mode] || C, border: `1px solid ${(MODE_CLR[msg.mode] || C)}44`, background: `${(MODE_CLR[msg.mode] || C)}12`, borderRadius: 99, padding: "2px 8px" }}>
                          <Zap size={8} />
                          {msg.modeLabel.toUpperCase()}
                        </span>
                      )}
                      {/* Quality score badge — only shown when verification ran */}
                      {msg.role === "assistant" && msg.verification && msg.verification.score != null && (() => {
                        const s = msg.verification.score;
                        const retried = msg.verification.was_retried;
                        const clr = s >= 9 ? "#00ff82" : s >= 7 ? "#00d2ff" : s >= 5 ? "#f59e0b" : "#ef4444";
                        const lbl = s >= 9 ? "EXCELLENT" : s >= 7 ? "GOOD" : s >= 5 ? "FAIR" : "LOW";
                        return (
                          <span title={retried ? "Answer was refined by the verification layer" : `Quality score: ${s}/10`}
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 8, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1, color: clr, border: `1px solid ${clr}44`, background: `${clr}12`, borderRadius: 99, padding: "2px 7px", cursor: "default" }}>
                            {retried ? "✦ REFINED" : `◈ ${lbl} ${s}/10`}
                          </span>
                        );
                      })()}
                      {msg.usedWeb && (
                        <span style={{ fontSize: 9, color: "#6366f1", fontFamily: "monospace", letterSpacing: 1 }}>⬡ WEB</span>
                      )}
                    </div>

                    {/* Bubble */}
                    <div className="novaa-bubble" style={{ borderRadius: 12, borderTopLeftRadius: msg.role === "assistant" ? 3 : 12, borderTopRightRadius: msg.role === "user" ? 3 : 12, padding: "9px 12px", fontSize: 12.5, lineHeight: 1.55 }}>
                      {msg.role === "assistant" ? renderMd(msg.content) : msg.content}
                    </div>

                    {/* Action result card */}
                    {msg.role === "assistant" && msg.actionResult && (
                      <ActionResultCard actionResult={msg.actionResult} color={C} />
                    )}

                    {/* Email send bar */}
                    {msg.role === "assistant" && EMAIL_DRAFT_INTENTS.has(msg.mode) && !msg.isAction && (
                      <EmailSendBar content={msg.content} color={C} />
                    )}

                    {/* PDF export bar */}
                    {msg.role === "assistant" && PDF_INTENTS.has(msg.mode) && !msg.isAction && (
                      <PdfExportBar
                        content={msg.content}
                        title={msg.modeLabel || "NOVAA Document"}
                        mode={msg.mode}
                        role={role}
                        color={C}
                      />
                    )}

                    {/* Follow-up suggestion chips */}
                    {msg.role === "assistant" && msg.followups && msg.followups.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
                        <span style={{ fontSize: 8, color: `${C}77`, fontFamily: "monospace", letterSpacing: 2, marginBottom: 1 }}>
                          ↪ EXPLORE FURTHER
                        </span>
                        {msg.followups.map((fq, fi) => (
                          <button
                            key={fi}
                            onClick={() => send(fq)}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              background: `${C}09`, border: `1px solid ${C}22`,
                              borderRadius: 7, padding: "5px 9px", cursor: "pointer",
                              color: "#7ab0d8", fontSize: 11, textAlign: "left",
                              fontFamily: "inherit", transition: "all .15s ease",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${C}1a`; e.currentTarget.style.borderColor = `${C}55`; e.currentTarget.style.color = "#c0ddf5"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${C}09`; e.currentTarget.style.borderColor = `${C}22`; e.currentTarget.style.color = "#7ab0d8"; }}
                          >
                            <span style={{ fontSize: 9, opacity: .6 }}>↗</span>
                            {fq}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Processing indicator */}
              {loading && (
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${C}44`, background: `radial-gradient(circle, ${C}22, transparent)`, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ padding: "10px 14px", borderRadius: "12px 12px 12px 3px", background: "rgba(0,18,40,.7)", border: `1px solid ${C}22`, display: "flex", flexDirection: "column", gap: 5 }}>
                    <div className="novaa-thinking-bar" style={{ height: 1.5, width: 80, background: `linear-gradient(90deg, transparent, ${C}, transparent)`, borderRadius: 99 }} />
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <div className="novaa-dot-1" style={{ width: 5, height: 5, borderRadius: "50%", background: C }} />
                      <div className="novaa-dot-2" style={{ width: 5, height: 5, borderRadius: "50%", background: C }} />
                      <div className="novaa-dot-3" style={{ width: 5, height: 5, borderRadius: "50%", background: C }} />
                      <span style={{ fontSize: 9, color: C, fontFamily: "monospace", letterSpacing: 2, opacity: .7 }}>PROCESSING</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggested tasks */}
              {!hasUser && !loading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
                  <div style={{ fontSize: 9, color: C, fontFamily: "monospace", letterSpacing: 3, opacity: .5, marginBottom: 2 }}>— SELECT OPERATION —</div>
                  {tasks.map(t => (
                    <button key={t.p} onClick={() => send(t.p)} style={{ display: "flex", alignItems: "center", gap: 8, background: `${C}0a`, border: `1px solid ${C}1a`, borderRadius: 8, padding: "7px 10px", cursor: "pointer", color: "#8ab8d8", fontSize: 12, textAlign: "left", transition: "all .15s ease" }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${C}18`; e.currentTarget.style.borderColor = `${C}44`; e.currentTarget.style.color = "#cce8ff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${C}0a`; e.currentTarget.style.borderColor = `${C}1a`; e.currentTarget.style.color = "#8ab8d8"; }}
                    >
                      <span style={{ fontSize: 15 }}>{t.e}</span>
                      <span>{t.t}</span>
                    </button>
                  ))}
                  {cfg.tasks.length > 4 && (
                    <button onClick={() => setShowAll(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: `${C}66`, fontFamily: "monospace", letterSpacing: 1, padding: "3px 0" }}>
                      {showAll ? "▲ COLLAPSE" : `▼ +${cfg.tasks.length - 4} MORE`}
                    </button>
                  )}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Uploaded file pill */}
            {uploadedFile && (
              <div style={{ margin: "0 12px", padding: "6px 10px", borderRadius: 8, background: "rgba(0,255,130,.07)", border: "1px solid rgba(0,255,130,.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#00ff82", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {uploadedFile.name}</span>
                <button onClick={() => setUploaded(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ffffff44", padding: 0 }}>
                  <XCircle size={14} />
                </button>
              </div>
            )}

            {/* Input */}
            <div style={{ padding: "10px 12px", borderTop: `1px solid ${C}1a`, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "rgba(0,18,40,.6)", border: `1px solid ${C}2a`, borderRadius: 10, padding: "8px 10px", transition: "border-color .2s" }}>
                <button onClick={() => fileRef.current?.click()} disabled={uploadBusy}
                  style={{ background: "none", border: "none", cursor: "pointer", color: `${C}66`, padding: 0, flexShrink: 0, marginBottom: 1 }}>
                  {uploadBusy
                    ? <div style={{ width: 16, height: 16, border: `1.5px solid ${C}44`, borderTopColor: C, borderRadius: "50%", animation: "novaa-ring-cw .8s linear infinite" }} />
                    : <Paperclip size={15} />}
                </button>
                <input ref={fileRef} type="file" style={{ display: "none" }}
                  accept=".pdf,.docx,.txt,.md,.py,.js,.ts,.jsx,.tsx,.java,.c,.cpp,.cs,.html,.css,.sql,.json,.yaml,.yml,.csv"
                  onChange={handleFile} />
                <textarea
                  ref={el => { inputRef.current = el; textaRef.current = el; }}
                  rows={1} value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
                  }}
                  onKeyDown={onKey}
                  placeholder="Enter command..."
                  className="novaa-input"
                  style={{ flex: 1, resize: "none", background: "transparent", border: "none", color: "#aadcff", fontSize: 13, fontFamily: "monospace", lineHeight: 1.5, maxHeight: 80 }}
                />
                <button onClick={() => send()} disabled={!input.trim() || loading} style={{ background: input.trim() && !loading ? `${C}22` : "transparent", border: `1px solid ${input.trim() && !loading ? C + "66" : "#ffffff11"}`, borderRadius: 7, width: 30, height: 30, flexShrink: 0, cursor: input.trim() && !loading ? "pointer" : "default", color: input.trim() && !loading ? C : "#ffffff22", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>
                  <Send size={13} />
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 6, gap: 8 }}>
                <span style={{ fontSize: 9, color: `${C}44`, fontFamily: "monospace", letterSpacing: 2 }}>
                  N.O.V.A.A · CAMPUSEYE · {cfg.label}
                </span>
              </div>
            </div>
          </>)}
        </div>
      )}
    </>
  );
}

const btnStyle = {
  background: "none", border: "1px solid #ffffff11", borderRadius: 6,
  width: 26, height: 26, cursor: "pointer", color: "#4a7aaa",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "all .15s",
};
