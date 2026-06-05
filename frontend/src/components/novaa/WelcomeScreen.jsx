import { C, G, AGENT_TASKS } from "./constants";

/**
 * Idle / no-session state shown in the chat area.
 * Displays the large NOVAA orb, tagline, and an 8-chip agent preview grid.
 */
const WelcomeScreen = ({ onInitialize }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 nv-glow-in">
    {/* Animated concentric rings + core orb */}
    <div className="relative flex h-28 w-28 items-center justify-center">
      <div className="absolute inset-0 rounded-full nv-ring-1"
           style={{ border: `1px solid ${C}44`, boxShadow: `0 0 20px ${C}22` }} />
      <div className="absolute inset-2 rounded-full nv-ring-2"
           style={{ border: `1px dashed ${G}33` }} />
      <div className="absolute inset-5 rounded-full nv-ring-1"
           style={{ border: `1px solid ${C}22`, animationDuration: "14s" }} />
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full nv-orb"
        style={{
          background: `radial-gradient(circle, ${C}22, transparent)`,
          border:     `1px solid ${C}`,
          boxShadow:  `0 0 30px ${C}55, inset 0 0 20px ${C}22`,
        }}
      >
        <span className="nv-mono text-lg font-bold" style={{ color: C, textShadow: `0 0 20px ${C}` }}>N</span>
      </div>
    </div>

    {/* Tagline */}
    <div className="text-center space-y-2">
      <h2 className="nv-mono text-xl font-bold tracking-widest" style={{ color: C, textShadow: `0 0 20px ${C}55` }}>
        NOVAA AI TUTOR
      </h2>
      <p className="nv-mono text-xs tracking-widest" style={{ color: `${C}66` }}>
        NEURAL OPERATIONAL VIRTUAL ACADEMIC ASSISTANT
      </p>
      <p className="text-sm mt-3" style={{ color: "#4a7a9a" }}>
        17 specialized agents · Live course material access · Verification layer active
      </p>
    </div>

    {/* Initialize button */}
    <button
      onClick={onInitialize}
      className="nv-mono rounded px-6 py-3 text-sm tracking-widest font-bold transition-all nv-border-glow"
      style={{ border: `1px solid ${C}`, background: `${C}14`, color: C, boxShadow: `0 0 20px ${C}33` }}
      onMouseEnter={e => { e.currentTarget.style.background = `${C}25`; e.currentTarget.style.boxShadow = `0 0 30px ${C}66`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${C}14`; e.currentTarget.style.boxShadow = `0 0 20px ${C}33`; }}
    >
      ▸ INITIALIZE SESSION
    </button>

    {/* Agent grid preview */}
    <div className="grid grid-cols-4 gap-2 max-w-lg">
      {AGENT_TASKS.slice(0, 8).map((t, i) => (
        <div
          key={i}
          className="rounded p-2 text-center"
          style={{ border: "1px solid rgba(0,210,255,.1)", background: "rgba(0,210,255,.03)" }}
        >
          <div className="text-lg mb-1">{t.e}</div>
          <div className="nv-mono text-[8px] tracking-widest" style={{ color: `${C}66` }}>
            {t.t.toUpperCase().slice(0, 10)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default WelcomeScreen;
