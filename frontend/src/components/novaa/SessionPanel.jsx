import { Plus, Trash2 } from "lucide-react";
import { C, G, fmtDate } from "./constants";

/**
 * Left sidebar of the NOVAA HUD.
 *
 * Contains:
 *  - New Session button + session list
 *  - Course / RAG target picker
 *  - System status footer (Tool Layer, RAG Engine, Agents)
 */
const SessionPanel = ({
  sessions,
  sessionsLoading,
  activeSession,
  courses,
  selectedCourse,
  activeCourse,
  onCreateSession,
  onOpenSession,
  onDeleteSession,
  onSelectCourse,
}) => (
  <div
    className="flex w-60 shrink-0 flex-col overflow-hidden"
    style={{ background: "#000612", borderRight: "1px solid rgba(0,210,255,.15)" }}
  >
    {/* ── Sessions header ──────────────────────────────────────────────────── */}
    <div
      className="flex items-center justify-between px-4 py-3 shrink-0"
      style={{ borderBottom: "1px solid rgba(0,210,255,.1)" }}
    >
      <span className="nv-mono text-[10px] tracking-widest" style={{ color: `${C}77` }}>◈ SESSIONS</span>
      <button
        onClick={onCreateSession}
        className="nv-mono flex items-center gap-1 rounded px-2 py-1 text-[10px] tracking-widest transition-all"
        style={{ border: `1px solid ${C}33`, background: `${C}0d`, color: C }}
        onMouseEnter={e => { e.currentTarget.style.background = `${C}1a`; e.currentTarget.style.boxShadow = `0 0 8px ${C}33`; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${C}0d`; e.currentTarget.style.boxShadow = "none"; }}
      >
        <Plus className="h-3 w-3" /> NEW
      </button>
    </div>

    {/* ── Course / RAG picker ──────────────────────────────────────────────── */}
    {courses.length > 0 && (
      <div className="px-4 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(0,210,255,.08)" }}>
        <div className="flex items-center justify-between mb-1">
          <span className="nv-mono text-[9px] tracking-widest" style={{ color: `${C}44` }}>
            COURSE / RAG TARGET <span style={{ color: `${C}33` }}>(optionnel)</span>
          </span>
          {selectedCourse && (
            <button
              onClick={() => onSelectCourse(null)}
              className="nv-mono text-[8px] tracking-widest"
              style={{ color: "#f59e0b" }}
              title="Revenir au mode général (aucun cours)"
            >
              ✕ GÉNÉRAL
            </button>
          )}
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto nv-scroll">
          {courses.map(c => {
            const hasMat  = (c.material_count ?? 0) > 0;
            const isSelec = String(c.id) === String(selectedCourse);
            return (
              <button
                key={c.id}
                onClick={() => onSelectCourse(isSelec ? null : String(c.id))}
                className="w-full rounded px-2.5 py-1.5 text-left text-xs transition-all"
                style={{
                  border:      `1px solid ${isSelec ? C : "rgba(0,210,255,.12)"}`,
                  background:  isSelec ? `${C}14` : "rgba(0,210,255,.03)",
                  color:       isSelec ? C : hasMat ? "#6ab8d4" : "#3a6a7a",
                  opacity:     hasMat ? 1 : 0.55,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-[11px]">{c.title}</span>
                  <span className="nv-mono text-[9px] ml-1 shrink-0" style={{ color: hasMat ? G : "#ffffff33" }}>
                    {hasMat ? `·${c.material_count}` : "∅"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    )}

    {/* ── Session list ─────────────────────────────────────────────────────── */}
    <div className="flex-1 overflow-y-auto nv-scroll px-3 py-3 space-y-2">
      {sessionsLoading && (
        <div className="mt-6 text-center nv-mono text-[10px]" style={{ color: `${C}44` }}>
          LOADING<span className="nv-blink">_</span>
        </div>
      )}
      {!sessionsLoading && sessions.length === 0 && (
        <div className="mt-8 text-center space-y-2">
          <div className="nv-mono text-[10px]" style={{ color: `${C}33` }}>NO SESSIONS FOUND</div>
          <div className="nv-mono text-[9px]"  style={{ color: `${C}22` }}>Press NEW to begin</div>
        </div>
      )}
      {sessions.map(s => (
        <div
          key={s.id}
          onClick={() => onOpenSession(s)}
          className={`nv-session group relative cursor-pointer rounded p-2.5 ${activeSession?.id === s.id ? "active" : ""}`}
        >
          <div className="flex items-start justify-between gap-1">
            <p className="truncate text-[11px] font-medium"
               style={{ color: activeSession?.id === s.id ? C : "#6ab8d4" }}>
              {s.title}
            </p>
            <button
              onClick={e => onDeleteSession(s.id, e)}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition"
              style={{ color: "#ff444455" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#ff444455"; }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-1 nv-mono text-[9px]" style={{ color: `${C}44` }}>
            {fmtDate(s.started_at)}
          </div>
        </div>
      ))}
    </div>

    {/* ── System status footer ─────────────────────────────────────────────── */}
    <div className="px-4 py-2 shrink-0" style={{ borderTop: "1px solid rgba(0,210,255,.1)" }}>
      <div className="space-y-1">
        {[
          { label: "TOOL LAYER", status: "ONLINE",  clr: G },
          {
            label:  "RAG ENGINE",
            status: activeCourse && (activeCourse.material_count ?? 0) > 0 ? "ACTIVE" : "IDLE",
            clr:    activeCourse && (activeCourse.material_count ?? 0) > 0 ? G : "#f59e0b",
          },
          { label: "AGENTS", status: "17 READY", clr: C },
        ].map(({ label, status, clr }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="nv-mono text-[9px]" style={{ color: `${C}44` }}>{label}</span>
            <span className="nv-mono text-[9px]" style={{ color: clr }}>▸ {status}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default SessionPanel;
