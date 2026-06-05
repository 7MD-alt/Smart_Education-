import { C } from "./constants";

/** Animated "NOVAA THINKING" indicator shown while the AI is responding. */
const NovaaTyping = () => (
  <div className="flex gap-3 nv-in">
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full nv-orb"
      style={{ border: `1px solid ${C}44`, background: "rgba(0,210,255,.08)", boxShadow: `0 0 10px ${C}33` }}
    >
      <span className="nv-mono text-[9px]" style={{ color: C }}>N</span>
    </div>

    <div
      className="flex items-center gap-2 rounded-lg px-4 py-3"
      style={{ border: `1px solid rgba(0,210,255,.2)`, background: "rgba(0,14,30,.8)" }}
    >
      <span className="nv-mono text-[9px]" style={{ color: `${C}88` }}>NOVAA THINKING</span>
      <div className="flex gap-1.5 ml-2">
        {[1, 2, 3].map(i => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full nv-dot-${i}`}
            style={{ background: C, boxShadow: `0 0 4px ${C}` }}
          />
        ))}
      </div>
    </div>
  </div>
);

export default NovaaTyping;
