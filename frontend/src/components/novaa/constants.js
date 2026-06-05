// ─────────────────────────────────────────────────────────────────────────────
// NOVAA HUD — Design tokens, CSS, and static data
// Single source of truth for all NOVAA-specific constants.
// ─────────────────────────────────────────────────────────────────────────────

export const C  = "#00d2ff";   // primary cyan
export const G  = "#00ff82";   // accent green
export const BG = "#000d1a";   // deep background

// ── Injected stylesheet (once per session) ───────────────────────────────────
export const NOVAA_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

  @keyframes nv-ring-cw   { to { transform: rotate(360deg);  } }
  @keyframes nv-ring-ccw  { to { transform: rotate(-360deg); } }
  @keyframes nv-pulse     { 0%,100%{ opacity:.6; transform:scale(1); } 50%{ opacity:1; transform:scale(1.07); } }
  @keyframes nv-scanline  { 0%{ top:-8%; opacity:.5; } 90%{ opacity:.15; } 100%{ top:108%; opacity:0; } }
  @keyframes nv-flicker   { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:.5} 95%{opacity:1} 98%{opacity:.8} }
  @keyframes nv-blink     { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes nv-in        { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes nv-glow-in   { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
  @keyframes nv-dots      { 0%,80%,100%{transform:scale(0);opacity:0} 40%{transform:scale(1);opacity:1} }
  @keyframes nv-float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes nv-border-glow { 0%,100%{box-shadow:0 0 6px #00d2ff33} 50%{box-shadow:0 0 18px #00d2ff66} }
  @keyframes nv-mic-pulse {
    0%,100%{ box-shadow:0 0 6px #ff3b3b, 0 0 12px #ff3b3b44; border-color:#ff3b3b; }
    50%    { box-shadow:0 0 18px #ff3b3b, 0 0 32px #ff3b3b66; border-color:#ff6b6b; }
  }
  @keyframes nv-wave { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.8)} }

  .nv-mono    { font-family:'Share Tech Mono',monospace; }
  .nv-ring-1  { animation: nv-ring-cw  9s linear infinite; }
  .nv-ring-2  { animation: nv-ring-ccw 14s linear infinite; }
  .nv-orb     { animation: nv-pulse 3s ease-in-out infinite, nv-float 6s ease-in-out infinite; }
  .nv-scan    { animation: nv-scanline 5s linear infinite; }
  .nv-flick   { animation: nv-flicker 9s ease-in-out infinite; }
  .nv-blink   { animation: nv-blink 1.1s step-end infinite; }
  .nv-cursor  { display:inline-block; animation: nv-blink .9s step-end infinite; font-weight:700; margin-left:1px; }
  .nv-in      { animation: nv-in .22s ease both; }
  .nv-glow-in { animation: nv-glow-in .28s ease both; }
  .nv-dot-1   { animation: nv-dots 1.4s ease-in-out 0s   infinite; }
  .nv-dot-2   { animation: nv-dots 1.4s ease-in-out .2s  infinite; }
  .nv-dot-3   { animation: nv-dots 1.4s ease-in-out .4s  infinite; }
  .nv-border-glow  { animation: nv-border-glow 3s ease-in-out infinite; }
  .nv-mic-listening { animation: nv-mic-pulse 1.2s ease-in-out infinite; }
  .nv-wave-1  { animation: nv-wave 0.8s ease-in-out 0.0s infinite; }
  .nv-wave-2  { animation: nv-wave 0.8s ease-in-out 0.1s infinite; }
  .nv-wave-3  { animation: nv-wave 0.8s ease-in-out 0.2s infinite; }
  .nv-wave-4  { animation: nv-wave 0.8s ease-in-out 0.3s infinite; }
  .nv-wave-5  { animation: nv-wave 0.8s ease-in-out 0.4s infinite; }

  .nv-scroll::-webkit-scrollbar       { width:3px; }
  .nv-scroll::-webkit-scrollbar-track { background:transparent; }
  .nv-scroll::-webkit-scrollbar-thumb { background:#00d2ff33; border-radius:99px; }
  .nv-scroll::-webkit-scrollbar-thumb:hover { background:#00d2ff66; }

  .nv-input                 { caret-color:#00d2ff; }
  .nv-input::placeholder    { color:#1e4a6a; }
  .nv-input:focus           { outline:none; }

  .nv-task-chip { transition:all .15s ease; border:1px solid rgba(0,210,255,.15); }
  .nv-task-chip:hover  { border-color:rgba(0,210,255,.5); background:rgba(0,210,255,.08); transform:translateY(-1px); }
  .nv-task-chip.active { border-color:#00d2ff; background:rgba(0,210,255,.14); color:#00d2ff; box-shadow:0 0 8px rgba(0,210,255,.3); }

  .nv-session       { transition:all .15s ease; border:1px solid rgba(0,210,255,.1); }
  .nv-session:hover { border-color:rgba(0,210,255,.3); background:rgba(0,210,255,.05); }
  .nv-session.active { border-color:#00d2ff; background:rgba(0,210,255,.1); box-shadow:0 0 12px rgba(0,210,255,.15); }

  .nv-panel { border:1px solid rgba(0,210,255,.18); background:rgba(0,10,26,.85); backdrop-filter:blur(12px); }
  .nv-corner::before,.nv-corner::after { content:''; position:absolute; width:10px; height:10px; border-color:#00d2ff; border-style:solid; opacity:.6; }
  .nv-corner::before { top:0;    left:0;  border-width:1px 0 0 1px; }
  .nv-corner::after  { bottom:0; right:0; border-width:0 1px 1px 0; }
`;

// ── Inject CSS once ───────────────────────────────────────────────────────────
export function injectNovaaCSS() {
  if (!document.getElementById("novaa-hud-css")) {
    const el = document.createElement("style");
    el.id = "novaa-hud-css";
    el.textContent = NOVAA_CSS;
    document.head.appendChild(el);
  }
}

// ── Agent task chips ──────────────────────────────────────────────────────────
export const AGENT_TASKS = [
  { e: "📊", t: "My absences",      p: "How many absences do I have in each course? Am I in the danger zone?",                      mode: "platform_query" },
  { e: "🎯", t: "Generate quiz",     p: "Generate a mixed quiz (MCQ + True/False + fill-in-blank) from my course material.",         mode: "quiz"           },
  { e: "🧠", t: "Explain concept",   p: "Explain this concept step by step with prerequisites, ELI5 and real-world examples:",       mode: "explain"        },
  { e: "📋", t: "Study plan",        p: "Build me a 2-week Pomodoro exam study plan for my courses.",                                mode: "study_plan"     },
  { e: "🃏", t: "Flashcards",        p: "Create 15 flashcards for the key terms in my course material.",                             mode: "flashcard"      },
  { e: "🎓", t: "Predict exam Qs",   p: "Analyse my course material and predict the most likely exam questions with likelihood.",     mode: "exam_predict"   },
  { e: "💡", t: "Progressive hints", p: "Give me progressive hints to solve this problem without giving the full answer:",            mode: "hint"           },
  { e: "⚖️", t: "Compare concepts", p: "Compare these two concepts side by side with a table and key differences:",                 mode: "compare"        },
  { e: "⚙️", t: "Solve problem",     p: "Solve this step-by-step showing all working and checking the answer:",                      mode: "problem_solver" },
  { e: "🗺️", t: "Mind map",          p: "Build a complete hierarchical mind map for this topic:",                                    mode: "mindmap"        },
  { e: "🔍", t: "Research topic",    p: "Research this topic thoroughly for me with sources:",                                       mode: "research"       },
  { e: "📐", t: "Formula help",      p: "Explain this formula with derivation and a worked example:",                                mode: "formula"        },
  { e: "📋", t: "Summarize",         p: "Summarize the key exam-relevant points of my course material.",                             mode: "summarize"      },
  { e: "🔤", t: "Translate",         p: "Translate this to English / French / Darija:",                                              mode: "translate"      },
  { e: "✉️", t: "Email teacher",     p: "Draft a formal email to my teacher asking about my attendance status.",                     mode: "email_draft"    },
  { e: "💻", t: "Debug code",        p: "Help me debug and fix this code, explain the issue:",                                       mode: "code"           },
];

// ── Mode → display colour ─────────────────────────────────────────────────────
export const AGENT_COLORS = {
  rag_qa:         C,
  quiz:           "#a855f7",
  explain:        "#f59e0b",
  study_plan:     G,
  flashcard:      "#34d399",
  exam_predict:   "#f472b6",
  hint:           "#fbbf24",
  compare:        "#60a5fa",
  problem_solver: "#f87171",
  mindmap:        "#c084fc",
  research:       "#38bdf8",
  formula:        "#e879f9",
  summarize:      "#fb923c",
  translate:      "#4ade80",
  email_draft:    "#facc15",
  code:           "#6ee7b7",
  platform_query: C,
};

// ── Utility formatters ────────────────────────────────────────────────────────
export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "";

export const fmtTime = (s) => {
  if (!s || s < 60) return `${s || 0}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
};
