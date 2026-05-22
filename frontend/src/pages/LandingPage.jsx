import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, GraduationCap, Users,
  ShieldCheck, Brain, Zap, BarChart3, TrendingUp,
  CheckCircle2, MessageCircle, ScanLine,
} from "lucide-react";

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
});

/* ── Noise texture overlay ───────────────────────────────────── */
const Noise = () => (
  <svg className="pointer-events-none fixed inset-0 h-full w-full opacity-[0.035] z-0" xmlns="http://www.w3.org/2000/svg">
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
    <rect width="100%" height="100%" filter="url(#n)" />
  </svg>
);

/* ── Section label pill ──────────────────────────────────────── */
const Pill = ({ children }) => (
  <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-widest"
        style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-3)" }}>
    {children}
  </span>
);

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden antialiased" style={{ background: "var(--bg)", color: "var(--text-1)" }}>
      <Noise />

      {/* Subtle dot grid */}
      <div className="pointer-events-none fixed inset-0 z-0"
           style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      <div className="relative z-10">

        {/* ── NAVBAR ──────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 px-4 pt-4 md:px-8">
          <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-[var(--radius-xl)] px-5 py-3"
               style={{ background: "rgba(9,9,14,0.88)", backdropFilter: "blur(14px)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-violet-400"
                   style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.2)" }}>CE</div>
              <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>CampusEye</span>
            </div>
            <div className="hidden items-center gap-1 md:flex">
              {[["Platform", "#features"], ["Roles", "#roles"], ["Preview", "#preview"]].map(([label, href]) => (
                <a key={label} href={href} className="rounded-lg px-3 py-1.5 text-sm transition-colors"
                   style={{ color: "var(--text-2)" }}
                   onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                   onMouseLeave={e => e.currentTarget.style.color = "var(--text-2)"}>
                  {label}
                </a>
              ))}
            </div>
            <Link to="/login">
              <button className="btn-primary px-4 py-1.5 text-sm">Sign in</button>
            </Link>
          </nav>
        </header>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-4xl px-6 pb-24 pt-24 text-center md:pt-32">
          <motion.div {...rise(0)}>
            <Pill>AI-Powered Academic Platform</Pill>
          </motion.div>

          <motion.h1 {...rise(0.06)}
            className="mx-auto mt-7 max-w-3xl text-5xl font-semibold leading-[1.08] tracking-[-0.04em] md:text-6xl lg:text-7xl"
            style={{ color: "var(--text-1)" }}>
            The campus platform that{" "}
            <span style={{ color: "var(--text-2)" }}>actually works.</span>
          </motion.h1>

          <motion.p {...rise(0.1)}
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed md:text-lg"
            style={{ color: "var(--text-2)" }}>
            Face-scan attendance, AI tutoring, and full academic oversight — one platform for students, teachers, and administrators.
          </motion.p>

          <motion.div {...rise(0.14)} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login">
              <button className="btn-primary gap-2 px-6 py-3 text-sm font-semibold">
                Open platform <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <a href="#features">
              <button className="btn-ghost gap-2 px-6 py-3 text-sm">Explore features</button>
            </a>
          </motion.div>

          {/* Stats strip */}
          <motion.div {...rise(0.18)}
            className="mx-auto mt-16 grid max-w-lg grid-cols-3 divide-x rounded-[var(--radius-lg)]"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", divideColor: "var(--border)" }}>
            {[["3 roles", "Student · Teacher · Admin"], ["9 AI agents", "Specialist tutor modes"], ["Live scan", "Face recognition"]].map(([val, sub]) => (
              <div key={val} className="px-6 py-4 text-center" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{val}</p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-3)" }}>{sub}</p>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-5xl px-6 pb-24 md:pb-32">
          <motion.div {...rise(0)} className="text-center mb-12">
            <Pill>Platform overview</Pill>
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: "var(--text-1)" }}>
              Everything your institution needs.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
              From AI tutoring to live face-scan attendance — one platform built for every academic role.
            </p>
          </motion.div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Sparkles,    title: "AI Tutoring",             text: "9 specialist agents for Q&A, quizzes, code help, summaries, flashcards and more.", accent: "text-violet-400", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.15)" },
              { icon: ScanLine,    title: "Face-scan Attendance",    text: "Teachers open a webcam — the system auto-recognizes enrolled students every 2 seconds.", accent: "text-cyan-400", bg: "rgba(8,145,178,0.08)", border: "rgba(8,145,178,0.15)" },
              { icon: GraduationCap, title: "Progress Clarity",      text: "Students see their attendance rate, at-risk alerts, and course progress in one view.", accent: "text-green-400", bg: "rgba(21,128,61,0.08)", border: "rgba(21,128,61,0.15)" },
              { icon: ShieldCheck, title: "Institutional Oversight", text: "Admins manage departments, filieres, courses, and users from a single dashboard.", accent: "text-pink-400", bg: "rgba(190,24,93,0.08)", border: "rgba(190,24,93,0.15)" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title} {...rise(0.06 * i)}
                  className="rounded-[var(--radius-lg)] p-6 transition-colors duration-150"
                  style={{ border: `1px solid ${f.border}`, background: f.bg }}>
                  <Icon className={`h-5 w-5 ${f.accent}`} />
                  <h3 className="mt-4 text-sm font-semibold" style={{ color: "var(--text-1)" }}>{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{f.text}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── ROLES ────────────────────────────────────────────── */}
        <section id="roles" className="mx-auto max-w-5xl px-6 pb-24 md:pb-32">
          <motion.div {...rise(0)} className="text-center mb-12">
            <Pill>Built for every role</Pill>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: "var(--text-1)" }}>
              One platform, three experiences.
            </h2>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                role: "Students", color: "text-violet-400", border: "rgba(124,58,237,0.2)", bg: "rgba(124,58,237,0.06)", dot: "bg-violet-400",
                items: ["Ask the AI tutor anything", "Track attendance & at-risk status", "View course materials"],
                stat: [{ l: "Progress", v: "82%" }, { l: "Score", v: "91%" }, { l: "Level", v: "High" }],
              },
              {
                role: "Teachers", color: "text-cyan-400", border: "rgba(8,145,178,0.2)", bg: "rgba(8,145,178,0.06)", dot: "bg-cyan-400",
                items: ["Live face-scan attendance", "Upload course materials", "Danger-zone alerts"],
                stat: [{ l: "Students", v: "34" }, { l: "At-risk", v: "07" }, { l: "Materials", v: "12" }],
              },
              {
                role: "Admins", color: "text-pink-400", border: "rgba(190,24,93,0.2)", bg: "rgba(190,24,93,0.06)", dot: "bg-pink-400",
                items: ["Manage departments & filieres", "User creation & roles", "Platform-wide reporting"],
                stat: [{ l: "Departments", v: "04" }, { l: "Filieres", v: "08" }, { l: "Uptime", v: "98%" }],
              },
            ].map((r, i) => (
              <motion.div key={r.role} {...rise(0.06 * i)}
                className="rounded-[var(--radius-lg)] p-6"
                style={{ border: `1px solid ${r.border}`, background: r.bg }}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${r.dot}`} style={{ opacity: 0.9 }}>
                  <span className="text-xs font-bold text-white">{r.role[0]}</span>
                </div>
                <h3 className={`mt-4 text-lg font-semibold ${r.color}`}>{r.role}</h3>
                <div className="mt-3 space-y-1.5">
                  {r.items.map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-2)" }}>
                      <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${r.color}`} />{item}
                    </div>
                  ))}
                </div>
                {/* Mini stats */}
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {r.stat.map(({ l, v }) => (
                    <div key={l} className="rounded-[var(--radius)] p-2.5 text-center"
                         style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <p className={`text-base font-semibold ${r.color}`}>{v}</p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{l}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── AI TUTOR SHOWCASE ─────────────────────────────────── */}
        <section id="preview" className="mx-auto max-w-5xl px-6 pb-24 md:pb-32">
          <motion.div {...rise(0)}
            className="rounded-[var(--radius-xl)] overflow-hidden"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div className="grid xl:grid-cols-2">
              {/* Left */}
              <div className="p-8 xl:p-10 xl:border-r" style={{ borderColor: "var(--border)" }}>
                <Pill>AI Tutoring</Pill>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl" style={{ color: "var(--text-1)" }}>
                  Academic help built into the platform.
                </h2>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                  Students get context-aware answers, lesson summaries, and revision support — without leaving their course.
                </p>
                <div className="mt-6 space-y-2.5">
                  {["Context-aware answers from course materials", "Instant lesson summaries on demand", "Auto-generated quiz & flashcard modes", "File upload — ask about your own PDFs"].map(f => (
                    <div key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400" />{f}
                    </div>
                  ))}
                </div>
                <Link to="/login">
                  <button className="btn-violet mt-8 gap-2 px-5 py-2.5 text-sm">
                    Try the AI tutor <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
              {/* Right — chat mockup */}
              <div className="p-8 xl:p-10">
                <div className="rounded-[var(--radius-lg)] p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(124,58,237,0.15)" }}>
                        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: "var(--text-1)" }}>AI Tutor</p>
                        <p className="text-[10px]" style={{ color: "var(--text-3)" }}>Connected to course</p>
                      </div>
                    </div>
                    <span className="badge badge-green"><span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />Online</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { side: "user", text: "Explain backpropagation simply." },
                      { side: "ai",   text: "Neural networks learn by adjusting weights based on prediction errors — that adjustment process is backpropagation." },
                      { side: "user", text: "Give me 3 quiz questions on this." },
                    ].map((m, i) => (
                      <div key={i} className={`flex ${m.side === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          m.side === "user"
                            ? "rounded-tr-sm bg-white text-black"
                            : "rounded-tl-sm text-[var(--text-2)]"
                        }`} style={m.side === "ai" ? { background: "var(--surface-2)", border: "1px solid var(--border)" } : {}}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-[var(--radius)] px-3 py-2.5"
                       style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <input readOnly placeholder="Ask anything about your course…"
                           className="w-full bg-transparent text-xs outline-none" style={{ color: "var(--text-3)" }} />
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── FACE SCAN SHOWCASE ───────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 pb-24 md:pb-32">
          <motion.div {...rise(0)}
            className="rounded-[var(--radius-xl)] overflow-hidden"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div className="grid xl:grid-cols-[1.1fr_0.9fr]">
              <div className="p-8 xl:p-10 xl:border-r" style={{ borderColor: "var(--border)" }}>
                <Pill>Face recognition attendance</Pill>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl" style={{ color: "var(--text-1)" }}>
                  Attendance that marks itself.
                </h2>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                  Teachers open a live camera scan and the system automatically recognizes enrolled students — no manual entry needed.
                </p>
                <div className="mt-6 space-y-2.5">
                  {[
                    { icon: Brain,     text: "Face recognition via webcam" },
                    { icon: Zap,       text: "Auto-scan every 2 seconds" },
                    { icon: BarChart3, text: "Results logged to attendance records" },
                    { icon: TrendingUp,text: "Email alerts on danger-zone threshold" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                      <Icon className="h-4 w-4 shrink-0 text-cyan-400" />{text}
                    </div>
                  ))}
                </div>
              </div>
              {/* Right — scan mockup */}
              <div className="p-8 xl:p-10">
                <div className="rounded-[var(--radius-lg)] p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="label">Live scan</p>
                    <span className="badge badge-amber"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />Scanning</span>
                  </div>
                  {/* Camera placeholder */}
                  <div className="flex aspect-video items-center justify-center rounded-[var(--radius)] mb-4"
                       style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)" }}>
                    <div className="relative flex items-center justify-center">
                      <div className="h-16 w-12 rounded-full border-2 border-dashed border-amber-400/50 animate-pulse" />
                      <p className="absolute -bottom-6 text-[10px] text-amber-400/70">Detecting…</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: "Ahmed Benali",  s: "PRESENT", cls: "badge-green" },
                      { name: "Fatima Zahra",  s: "PRESENT", cls: "badge-green" },
                      { name: "Omar Idrissi",  s: "ABSENT",  cls: "badge-red"   },
                    ].map(({ name, s, cls }) => (
                      <div key={name} className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2"
                           style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <span className="text-xs" style={{ color: "var(--text-2)" }}>{name}</span>
                        <span className={`badge ${cls}`}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 pb-28 md:pb-36">
          <motion.div {...rise(0)}
            className="rounded-[var(--radius-xl)] px-8 py-20 text-center md:py-24"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Pill>Get started</Pill>
            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: "var(--text-1)" }}>
              Your academic workspace is ready.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
              Sign in to access your role-based dashboard — whether you're a student, teacher, or administrator.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/login">
                <button className="btn-primary gap-2 px-7 py-3 text-sm font-semibold">
                  Sign in to platform <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <a href="#features">
                <button className="btn-ghost gap-2 px-7 py-3 text-sm">Explore features</button>
              </a>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t px-6 py-8 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            CampusEye · PFE Project · EST 2026 · AI-Powered Academic Platform
          </p>
        </footer>

      </div>
    </div>
  );
}