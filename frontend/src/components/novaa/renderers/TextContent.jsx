import { C } from "../constants";
import { safeHtml } from "../../../lib/sanitize";

/** Renders plain-text AI responses with inline markdown: bold, code, bullets, headings. */
const TextContent = ({ text }) => {
  const lines = text.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        const isBullet  = /^[-*•]\s/.test(line.trim());
        const isHeading = /^#+\s/.test(line.trim());
        const isTable   = /^\|/.test(line.trim());

        const fmt = line
          .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C}">$1</strong>`)
          .replace(/`(.+?)`/g, `<code style="background:rgba(0,210,255,.1);border:1px solid rgba(0,210,255,.2);border-radius:3px;padding:1px 5px;font-family:monospace;font-size:11px">$1</code>`);

        if (isHeading) {
          const clean = fmt.replace(/^#+\s/, "");
          return (
            <p key={i} className="mt-3 font-semibold nv-mono" style={{ color: C }}
               dangerouslySetInnerHTML={{ __html: safeHtml(clean) }} />
          );
        }
        if (isBullet) return (
          <div key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: C, boxShadow: `0 0 4px ${C}` }} />
            <p style={{ color: "#9acfe8" }}
               dangerouslySetInnerHTML={{ __html: safeHtml(fmt.replace(/^[-*•]\s/, "")) }} />
          </div>
        );
        if (isTable)
          return <p key={i} className="nv-mono text-xs" style={{ color: "#7ab8d4" }}
                    dangerouslySetInnerHTML={{ __html: safeHtml(fmt) }} />;

        return <p key={i} style={{ color: "#9acfe8" }}
                  dangerouslySetInnerHTML={{ __html: safeHtml(fmt) }} />;
      })}
    </div>
  );
};

export default TextContent;
