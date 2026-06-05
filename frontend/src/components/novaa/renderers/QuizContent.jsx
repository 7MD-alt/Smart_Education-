import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { G } from "../constants";
import TextContent from "./TextContent";

/** Interactive MCQ renderer — reveals the correct answer on demand. */
const QuizContent = ({ text }) => {
  const [revealed, setRevealed] = useState({});
  const blocks = text.split(/\n(?=Q\d+:)/g).filter(Boolean);

  if (!blocks.length) return <TextContent text={text} />;

  return (
    <div className="space-y-4">
      {blocks.map((block, qi) => {
        const lines    = block.split("\n").map(l => l.trim()).filter(Boolean);
        const question = lines[0]?.replace(/^Q\d+:\s*/, "") ?? "";
        const options  = lines.filter(l => /^[A-D]\)/.test(l));
        const answer   = lines.find(l => /^Answer:/i.test(l))
          ?.replace(/^Answer:\s*/i, "").trim().toUpperCase();

        return (
          <div key={qi} className="rounded-lg p-4"
               style={{ border: "1px solid rgba(168,85,247,.3)", background: "rgba(168,85,247,.06)" }}>
            <p className="mb-3 text-sm font-semibold" style={{ color: "#e2c6ff" }}>
              <span className="nv-mono mr-2 text-xs" style={{ color: "#a855f7" }}>Q{qi + 1}</span>
              {question}
            </p>

            <div className="space-y-2">
              {options.map((opt, oi) => {
                const isCorrect = opt[0] === answer;
                const isRev     = revealed[qi];
                return (
                  <div key={oi} className="rounded px-3 py-2 text-sm transition-all"
                       style={{
                         border:     `1px solid ${isRev ? (isCorrect ? "rgba(0,255,130,.4)" : "rgba(255,255,255,.07)") : "rgba(168,85,247,.2)"}`,
                         background: isRev ? (isCorrect ? "rgba(0,255,130,.1)"  : "rgba(255,255,255,.02)") : "rgba(168,85,247,.05)",
                         color:      isRev ? (isCorrect ? G : "#ffffff40") : "#c4b5fd",
                       }}>
                    {opt}
                  </div>
                );
              })}
            </div>

            <button onClick={() => setRevealed(p => ({ ...p, [qi]: !p[qi] }))}
                    className="mt-3 flex items-center gap-1.5 text-xs transition nv-mono"
                    style={{ color: "#a855f7" }}>
              {revealed[qi] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {revealed[qi] ? "HIDE ANSWER" : "REVEAL ANSWER"}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default QuizContent;
