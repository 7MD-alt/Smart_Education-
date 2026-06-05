import { useState } from "react";
import { C, G } from "../constants";
import TextContent from "./TextContent";

/** 3D CSS flip-card renderer for TERM / DEFINITION flashcard pairs. */
const FlashcardContent = ({ text }) => {
  const [flipped, setFlipped] = useState({});

  const pairs = [];
  let cur = null;
  for (const line of text.split("\n").map(l => l.trim()).filter(Boolean)) {
    if (/^TERM:/i.test(line))
      cur = { term: line.replace(/^TERM:\s*/i, ""), definition: "" };
    else if (/^DEFINITION:/i.test(line) && cur) {
      cur.definition = line.replace(/^DEFINITION:\s*/i, "");
      pairs.push(cur);
      cur = null;
    }
  }

  if (!pairs.length) return <TextContent text={text} />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {pairs.map((card, i) => {
        const isFlipped = !!flipped[i];
        return (
          <div
            key={i}
            onClick={() => setFlipped(p => ({ ...p, [i]: !p[i] }))}
            className="cursor-pointer"
            style={{ perspective: "1000px", minHeight: 110 }}
          >
            {/* 3D inner card */}
            <div style={{
              position: "relative", width: "100%", minHeight: 110,
              transformStyle: "preserve-3d",
              transform:   isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              transition:  "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}>

              {/* Front — TERM */}
              <div style={{
                position: "absolute", inset: 0,
                backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                borderRadius: 8, padding: "14px 16px",
                border: "1px solid rgba(0,210,255,.22)", background: "rgba(0,210,255,.05)",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div className="flex items-center justify-between">
                  <span className="nv-mono text-[9px] tracking-widest" style={{ color: C }}>◈ TERM</span>
                  <span className="nv-mono text-[9px]" style={{ color: "#ffffff20" }}>tap to flip</span>
                </div>
                <p className="text-sm font-medium" style={{ color: "#a8e0f5" }}>{card.term}</p>
              </div>

              {/* Back — DEFINITION (pre-rotated 180°) */}
              <div style={{
                position: "absolute", inset: 0,
                backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                borderRadius: 8, padding: "14px 16px",
                border: "1px solid rgba(0,255,130,.32)", background: "rgba(0,255,130,.06)",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div className="flex items-center justify-between">
                  <span className="nv-mono text-[9px] tracking-widest" style={{ color: G }}>◈ DEFINITION</span>
                  <span className="nv-mono text-[9px]" style={{ color: "#ffffff20" }}>tap to flip</span>
                </div>
                <p className="text-sm font-medium" style={{ color: "#a7f3d0" }}>{card.definition}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FlashcardContent;
