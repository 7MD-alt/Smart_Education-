import { useState } from "react";
import { Paperclip, Volume2, Square, FileDown } from "lucide-react";
import { C, AGENT_COLORS } from "./constants";
import SmartContent from "./renderers/SmartContent";
import { speak, stopSpeaking, speechSupported } from "./speech";
import axiosClient from "../../api/axiosClient";

// Intents whose text answer is worth exporting as a PDF.
const PDF_INTENTS = new Set([
  "quiz", "study_plan", "summarize", "explain", "flashcard", "mindmap",
  "rag_qa", "research", "problem_solver", "exam_predict", "compare", "hint",
  "code", "formula", "translate", "email_draft",
]);

/**
 * Renders a single chat message — either a student (right-aligned) or
 * an AI response with mode label, quality score, and follow-up suggestions.
 */
const NovaaMessage = ({ msg, onFollowup }) => {
  const isUser   = msg.sender_role === "STUDENT";
  const [speaking, setSpeaking]   = useState(false);
  const [pdfState, setPdfState]   = useState("idle"); // idle | working | done

  const toggleSpeak = () => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    const started = speak(msg.content, { onEnd: () => setSpeaking(false) });
    if (started) setSpeaking(true);
  };

  const exportPdf = async () => {
    if (pdfState === "working") return;
    setPdfState("working");
    try {
      const res = await axiosClient.post(
        "ai/pdf/",
        { content: msg.content, title: msg.mode_label || "NOVAA Document", doc_type: msg.mode || "general" },
        { responseType: "blob" },
      );
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href  = url;
      link.download = `novaa_${(msg.mode_label || "document").replace(/\s+/g, "_").slice(0, 40)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setPdfState("done");
      setTimeout(() => setPdfState("idle"), 3000);
    } catch {
      setPdfState("idle");
    }
  };
  const agentClr = AGENT_COLORS[msg.mode] || C;

  // ── User bubble ─────────────────────────────────────────────────────────────
  if (isUser) return (
    <div className="flex justify-end gap-3 nv-in">
      <div className="max-w-[75%]">
        <div
          className="rounded-lg px-4 py-3 text-sm leading-relaxed"
          style={{ background: "rgba(0,110,255,.14)", border: "1px solid rgba(0,150,255,.25)", color: "#b8d9ff" }}
        >
          {msg.content}
          {msg.attached_filename && (
            <div
              className="mt-2 flex items-center gap-1.5 rounded px-2 py-1.5"
              style={{ background: "rgba(0,0,0,.3)", border: "1px solid rgba(0,210,255,.2)" }}
            >
              <Paperclip className="h-3 w-3 shrink-0" style={{ color: C }} />
              <span className="truncate nv-mono text-[10px]" style={{ color: `${C}99` }}>
                {msg.attached_filename}
              </span>
            </div>
          )}
        </div>
        <div className="mt-1 flex justify-end">
          <span className="nv-mono text-[9px]" style={{ color: "#ffffff22" }}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: "rgba(0,110,255,.2)", border: "1px solid rgba(0,110,255,.4)" }}
      >
        <span className="nv-mono text-[9px]" style={{ color: "#7ab8ff" }}>YOU</span>
      </div>
    </div>
  );

  // ── AI bubble ───────────────────────────────────────────────────────────────
  const score    = msg.verification?.score;
  const retried  = msg.verification?.was_retried;
  const scoreClr = score >= 9 ? "#00ff82" : score >= 7 ? C : score >= 5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex gap-3 nv-in">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full nv-orb"
          style={{ border: `1px solid ${C}55`, background: "rgba(0,210,255,.1)", boxShadow: `0 0 10px ${C}22` }}
        >
          <span className="nv-mono text-[9px]" style={{ color: C }}>N</span>
        </div>
      </div>

      <div className="max-w-[80%] flex flex-col gap-2">
        {/* Mode + quality badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {msg.mode_label && (
            <span
              className="nv-mono rounded px-2 py-0.5 text-[9px] tracking-widest"
              style={{ border: `1px solid ${agentClr}44`, background: `${agentClr}14`, color: agentClr }}
            >
              ▸ {msg.mode_label.toUpperCase()}
            </span>
          )}
          {score != null && (
            <span
              className="nv-mono rounded px-2 py-0.5 text-[9px] tracking-widest"
              style={{ border: `1px solid ${scoreClr}44`, background: `${scoreClr}14`, color: scoreClr }}
            >
              {retried ? "✦ REFINED" : `◈ Q${score}/10`}
            </span>
          )}
          {/* Read-aloud (browser TTS — free, built-in) */}
          {speechSupported && (
            <button
              onClick={toggleSpeak}
              title={speaking ? "Arrêter la lecture" : "Lire à voix haute"}
              className="nv-mono flex items-center gap-1 rounded px-2 py-0.5 text-[9px] tracking-widest transition-all"
              style={{
                border: `1px solid ${speaking ? "#ff6b6b66" : `${C}33`}`,
                background: speaking ? "rgba(255,107,107,.1)" : `${C}10`,
                color: speaking ? "#ff8a8a" : `${C}cc`,
              }}
            >
              {speaking ? <Square className="h-2.5 w-2.5" /> : <Volume2 className="h-2.5 w-2.5" />}
              {speaking ? "STOP" : "LIRE"}
            </button>
          )}
          {/* PDF export — only on finished, exportable answers */}
          {!msg.streaming && msg.content && PDF_INTENTS.has(msg.mode) && (
            <button
              onClick={exportPdf}
              title="Télécharger la réponse en PDF"
              className="nv-mono flex items-center gap-1 rounded px-2 py-0.5 text-[9px] tracking-widest transition-all"
              style={{
                border: `1px solid ${pdfState === "done" ? "#00ff8244" : `${C}33`}`,
                background: pdfState === "done" ? "rgba(0,255,130,.1)" : `${C}10`,
                color: pdfState === "done" ? "#00ff82" : `${C}cc`,
              }}
            >
              <FileDown className="h-2.5 w-2.5" />
              {pdfState === "done" ? "PDF ✓" : pdfState === "working" ? "..." : "PDF"}
            </button>
          )}
        </div>

        {/* Content bubble */}
        <div
          className="rounded-lg px-4 py-3 relative"
          style={{ border: "1px solid rgba(0,210,255,.14)", background: "rgba(0,12,28,.75)" }}
        >
          {msg.streaming && !msg.content ? (
            <span className="nv-mono text-xs inline-flex items-center gap-1" style={{ color: `${C}99` }}>
              <span className="nv-cursor" style={{ color: C }}>▋</span> NOVAA réfléchit…
            </span>
          ) : (
            <>
              <SmartContent content={msg.content} mode={msg.mode} />
              {msg.streaming && (
                <span className="nv-cursor align-baseline" style={{ color: C }}>▋</span>
              )}
            </>
          )}
        </div>

        {/* Follow-up suggestions (students) or next-task suggestions (staff) */}
        {msg.followups?.length > 0 && (
          <div className="space-y-1.5">
            <span className="nv-mono text-[9px] tracking-widest" style={{ color: `${C}66` }}>
              {msg.followups_kind === "tasks" ? "⚡ TÂCHES SUGGÉRÉES" : "↪ EXPLORE FURTHER"}
            </span>
            <div className="flex flex-col gap-1.5">
              {msg.followups.map((fq, fi) => (
                <button
                  key={fi}
                  onClick={() => onFollowup(fq)}
                  className="rounded px-3 py-2 text-left text-xs transition-all"
                  style={{ border: "1px solid rgba(0,210,255,.18)", background: "rgba(0,210,255,.04)", color: "#7ab8d4" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,210,255,.45)"; e.currentTarget.style.background = "rgba(0,210,255,.09)"; e.currentTarget.style.color = C; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,210,255,.18)"; e.currentTarget.style.background = "rgba(0,210,255,.04)"; e.currentTarget.style.color = "#7ab8d4"; }}
                >
                  <span className="nv-mono mr-1.5" style={{ color: `${C}66` }}>›</span>{fq}
                </button>
              ))}
            </div>
          </div>
        )}

        <span className="nv-mono text-[9px]" style={{ color: "#ffffff18" }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
};

export default NovaaMessage;
