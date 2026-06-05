import { useState } from "react";
import { Download, Copy, Check } from "lucide-react";
import { C, G } from "../constants";
import TextContent from "./TextContent";

// Map a fenced-block language tag → a real file extension.
const LANG_EXT = {
  python: "py", py: "py", javascript: "js", js: "js", jsx: "jsx",
  typescript: "ts", ts: "ts", tsx: "tsx", java: "java", c: "c",
  "c++": "cpp", cpp: "cpp", "c#": "cs", csharp: "cs", cs: "cs",
  go: "go", golang: "go", rust: "rs", rs: "rs", ruby: "rb", rb: "rb",
  php: "php", swift: "swift", kotlin: "kt", kt: "kt", scala: "scala",
  r: "r", matlab: "m", sql: "sql", bash: "sh", sh: "sh", shell: "sh",
  powershell: "ps1", html: "html", css: "css", scss: "scss",
  json: "json", yaml: "yaml", yml: "yml", xml: "xml", markdown: "md",
  md: "md", dart: "dart", lua: "lua", perl: "pl", haskell: "hs",
  dockerfile: "dockerfile", text: "txt", code: "txt",
};

const extFor = (lang) => LANG_EXT[lang.toLowerCase()] || "txt";

/** A single fenced code block with copy + download actions. */
const CodeBlock = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — ignore */ }
  };

  const download = () => {
    const ext  = extFor(lang);
    const name = ext === "dockerfile" ? "Dockerfile" : `novaa_snippet.${ext}`;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const btn = {
    border: `1px solid ${C}33`, background: `${C}10`, color: `${C}cc`,
  };

  return (
    <div className="overflow-hidden rounded-lg" style={{ border: "1px solid rgba(0,210,255,.25)" }}>
      <div className="flex items-center justify-between px-4 py-2 nv-mono"
           style={{ background: "rgba(0,210,255,.07)", borderBottom: "1px solid rgba(0,210,255,.15)" }}>
        <span className="text-[10px] tracking-widest" style={{ color: C }}>
          ▸ {lang.toUpperCase()}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={copy}
            title="Copier le code"
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[9px] tracking-widest transition-all"
            style={btn}
          >
            {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
            {copied ? "COPIÉ" : "COPIER"}
          </button>
          <button
            onClick={download}
            title={`Télécharger en .${extFor(lang)}`}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[9px] tracking-widest transition-all"
            style={btn}
          >
            <Download className="h-2.5 w-2.5" />
            .{extFor(lang).toUpperCase()}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto p-4 text-xs" style={{ background: "#000a14", color: G }}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

/** Splits a response into fenced code blocks and prose sections. */
const CodeContent = ({ text }) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-3 text-sm">
      {parts.map((part, i) => {
        if (!part.startsWith("```")) {
          return part.trim() ? <TextContent key={i} text={part} /> : null;
        }
        const lines = part.split("\n");
        const lang  = lines[0].replace("```", "").trim() || "code";
        const code  = lines.slice(1, -1).join("\n");
        return <CodeBlock key={i} lang={lang} code={code} />;
      })}
    </div>
  );
};

export default CodeContent;
