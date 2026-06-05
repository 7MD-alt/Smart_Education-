import { C, G, fmtTime } from "./constants";

/**
 * Top bar of the NOVAA HUD.
 *
 * Shows:
 *  - Animated NOVAA orb + wordmark
 *  - Boot text sequence / "ONLINE" status
 *  - Active session timer + End Session button
 *  - Authenticated username
 */
const NovaaHeader = ({ booted, bootText, activeSession, elapsed, username, onEndSession }) => (
  <div
    className="relative flex items-center justify-between px-5 py-3 shrink-0 nv-flick"
    style={{ background: "#000816", borderBottom: "1px solid rgba(0,210,255,.25)", boxShadow: "0 0 20px rgba(0,210,255,.08)" }}
  >
    {/* ── Left: branding ──────────────────────────────────────────────────── */}
    <div className="flex items-center gap-4">
      {/* Animated orbital rings */}
      <div className="relative flex h-10 w-10 items-center justify-center shrink-0">
        <div className="absolute inset-0 rounded-full nv-ring-1" style={{ border: `1px solid ${C}33` }} />
        <div className="absolute inset-1 rounded-full nv-ring-2" style={{ border: `1px dashed ${G}22` }} />
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full nv-orb"
          style={{
            background:  `radial-gradient(circle, ${C}22, transparent)`,
            border:      `1px solid ${C}88`,
            boxShadow:   `0 0 12px ${C}44`,
          }}
        >
          <span className="nv-mono text-[9px]" style={{ color: C }}>N</span>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className="nv-mono text-sm font-bold tracking-widest" style={{ color: C, textShadow: `0 0 10px ${C}66` }}>
            NOVAA
          </span>
          <span
            className="nv-mono text-[9px] rounded px-1.5 py-0.5"
            style={{ background: `${G}18`, border: `1px solid ${G}33`, color: G }}
          >
            v2.0
          </span>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: G, boxShadow: `0 0 6px ${G}`, animation: "nv-pulse 2s ease-in-out infinite" }}
          />
        </div>
        <div className="nv-mono text-[9px] truncate max-w-xs" style={{ color: `${C}55` }}>
          {booted ? "NEURAL OPERATIONAL VIRTUAL ACADEMIC ASSISTANT · ONLINE" : bootText}
        </div>
      </div>
    </div>

    {/* ── Right: session controls + username ──────────────────────────────── */}
    <div className="flex items-center gap-4">
      {activeSession && (
        <>
          <div className="nv-mono text-[10px] flex items-center gap-1.5" style={{ color: `${C}77` }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: G, boxShadow: `0 0 4px ${G}` }} />
            SESSION {fmtTime(elapsed)}
          </div>
          <button
            onClick={onEndSession}
            className="nv-mono text-[10px] rounded px-2.5 py-1 tracking-widest transition-all"
            style={{ border: "1px solid rgba(239,68,68,.35)", background: "rgba(239,68,68,.08)", color: "#f87171" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,.18)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,.08)"; }}
          >
            ■ END SESSION
          </button>
        </>
      )}
      <div className="nv-mono text-[10px]" style={{ color: `${C}44` }}>
        {username?.toUpperCase() || "STUDENT"}
      </div>
    </div>

    {/* Scan line */}
    <div
      className="nv-scan pointer-events-none absolute inset-x-0 h-[2px]"
      style={{ background: `linear-gradient(90deg, transparent, ${C}44, transparent)` }}
    />
  </div>
);

export default NovaaHeader;
