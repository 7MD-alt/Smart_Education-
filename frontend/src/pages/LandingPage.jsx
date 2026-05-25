import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, Sparkles, GraduationCap, Users,
  ShieldCheck, Brain, Zap, BarChart3, TrendingUp,
  CheckCircle2, MessageCircle, ScanLine, Star,
  BookOpen, Activity, Camera,
} from "lucide-react";

/* ── Animation helpers ───────────────────────────────────────── */
const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});
const riseLeft = (delay = 0) => ({
  initial: { opacity: 0, x: -28 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

/* ── Section label pill ──────────────────────────────────────── */
const Pill = ({ children, accent }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
    style={{
      border: `1px solid ${accent || "var(--border)"}`,
      background: accent ? `${accent}15` : "var(--surface)",
      color: accent || "var(--text-3)",
    }}
  >
    {children}
  </span>
);

/* ── Animated mesh grid background ──────────────────────────── */
const Background = () => (
  <>
    {/* Dot grid */}
    <div
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />
    {/* Radial color blobs */}
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full"
           style={{ background: "radial-gradient(circle, rgba(124,58,237,0.08), transparent 70%)" }} />
      <div className="absolute -bottom-60 -right-40 h-[700px] w-[700px] rounded-full"
           style={{ background: "radial-gradient(circle, rgba(8,145,178,0.06), transparent 70%)" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full"
           style={{ background: "radial-gradient(circle, rgba(190,24,93,0.03), transparent 70%)" }} />
    </div>
  </>
);

/* ── Gradient separator line ─────────────────────────────────── */
const Sep = () => (
  <div className="mx-auto my-2 h-px max-w-5xl"
       style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.07) 70%, transparent)" }} />
);

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden antialiased" style={{ background: "var(--bg)", color: "var(--text-1)" }}>
      <Background />

      <div className="relative z-10">

        {/* ── NAVBAR ──────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 px-4 pt-4 pb-2 md:px-8">
          <nav
            className="mx-auto flex max-w-5xl items-center justify-between rounded-[var(--radius-xl)] px-5 py-3"
            style={{
              background: "rgba(7,7,13,0.88)",
              backdropFilter: "blur(18px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(8,145,178,0.3))",
                  border: "1px solid rgba(124,58,237,0.4)",
                  boxShadow: "0 0 14px rgba(124,58,237,0.25)",
                  color: "#a78bfa",
                }}
              >
                CE
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
                Campus<span style={{ color: "#a78bfa" }}>Eye</span>
              </span>
            </div>

            <div className="hidden items-center gap-1 md:flex">
              {[["Platform", "#features"], ["Roles", "#roles"], ["Preview", "#preview"]].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--text-1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "transparent"; }}
                >
                  {label}
                </a>
              ))}
            </div>

            <Link to="/login">
              <button
                className="btn text-sm font-semibold px-4 py-2"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "var(--text-1)",
                  borderRadius: "var(--radius)",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.13)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              >
                Sign in →
              </button>
            </Link>
          </nav>
        </header>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-20 text-center md:pt-28">
          <motion.div {...rise(0)}>
            <Pill accent="#a78bfa">✦ AI-Powered Academic Platform</Pill>
          </motion.div>

          <motion.h1
            {...rise(0.07)}
            className="mx-auto mt-8 max-w-3xl text-5xl font-bold leading-[1.06] tracking-[-0.04em] md:text-6xl lg:text-7xl"
            style={{ color: "var(--text-1)" }}
          >
            The campus{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #22d3ee 50%, #f472b6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              that thinks.
            </span>
          </motion.h1>

          <motion.p
            {...rise(0.12)}
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed md:text-lg"
            style={{ color: "var(--text-2)" }}
          >
            Face-scan attendance, AI tutoring, and full academic oversight — one unified platform for every role in your institution.
          </motion.p>

          <motion.div {...rise(0.16)} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login">
              <button
                className="btn gap-2 px-7 py-3 text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #0891b2)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius)",
                  boxShadow: "0 0 30px rgba(124,58,237,0.35), 0 4px 16px rgba(0,0,0,0.3)",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 50px rgba(124,58,237,0.5), 0 4px 20px rgba(0,0,0,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 30px rgba(124,58,237,0.35), 0 4px 16px rgba(0,0,0,0.3)"; e.currentTarget.style.transform = "none"; }}
              >
                Open platform <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <a href="#features">
              <button className="btn-ghost gap-2 px-7 py-3 text-sm font-medium">
                Explore features
              </button>
            </a>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            {...rise(0.2)}
            className="mx-auto mt-16 grid max-w-lg grid-cols-3 overflow-hidden rounded-[var(--radius-lg)]"
            style={{ border: "1px solid rgba(255,255,255,0.07)", background: "var(--surface)" }}
          >
            {[
              { val: "3 Roles", sub: "Student · Teacher · Admin" },
              { val: "9 AI Agents", sub: "Specialist tutor modes" },
              { val: "Live Scan", sub: "Face recognition" },
            ].map(({ val, sub }, i) => (
              <div
                key={val}
                className="px-5 py-4 text-center"
                style={{ borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
              >
                <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{val}</p>
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-3)" }}>{sub}</p>
              </div>
            ))}
          </motion.div>
        </section>

        <Sep />

        {/* ── FEATURES ─────────────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-5xl px-6 py-24">
          <motion.div {...rise(0)} className="text-center mb-14">
            <Pill accent="#22d3ee">Platform overview</Pill>
            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "var(--text-1)" }}>
              Everything your institution needs.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
              From AI tutoring to live face-scan attendance — one platform built for every academic role.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Sparkles, title: "AI Tutoring",
                text: "9 specialist agents: Q&A, quizzes, code, summaries, flashcards and more.",
                accent: "#a78bfa", glow: "rgba(124,58,237,0.12)",
              },
              {
                icon: Camera, title: "Face Attendance",
                text: "Webcam scans auto-recognize enrolled students every 2 seconds — zero manual entry.",
                accent: "#22d3ee", glow: "rgba(8,145,178,0.12)",
              },
              {
                icon: BarChart3, title: "Progress Clarity",
                text: "Students see attendance rates, at-risk alerts, and course progress in one view.",
                accent: "#4ade80", glow: "rgba(21,128,61,0.12)",
              },
              {
                icon: ShieldCheck, title: "Full Oversight",
                text: "Admins manage departments, filieres, courses, and users from one dashboard.",
                accent: "#f472b6", glow: "rgba(190,24,93,0.12)",
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  {...rise(0.06 * i)}
                  className="group relative overflow-hidden rounded-[var(--radius-lg)] p-6 transition-all duration-300"
                  style={{ border: `1px solid ${f.accent}25`, background: f.glow }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${f.accent}50`; e.currentTarget.style.boxShadow = `0 8px 32px ${f.glow}`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${f.accent}25`; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div className="absolute inset-x-0 top-0 h-px"
                       style={{ background: `linear-gradient(90deg, transparent, ${f.accent}60, transparent)` }} />
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] transition-transform duration-200 group-hover:scale-110"
                    style={{ background: `${f.accent}20`, border: `1px solid ${f.accent}30` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: f.accent, filter: `drop-shadow(0 0 6px ${f.accent})` }} />
                  </div>
                  <h3 className="mt-4 text-sm font-bold" style={{ color: "var(--text-1)" }}>{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{f.text}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        <Sep />

        {/* ── ROLES ────────────────────────────────────────────── */}
        <section id="roles" className="mx-auto max-w-5xl px-6 py-24">
          <motion.div {...rise(0)} className="text-center mb-14">
            <Pill accent="#f472b6">Built for every role</Pill>
            <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "var(--text-1)" }}>
              One platform, three experiences.
            </h2>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                role: "Students", letter: "S",
                accent: "#a78bfa", glow: "rgba(124,58,237,0.1)",
                items: ["Ask the AI tutor anything", "Track attendance & at-risk status", "View course materials & resources"],
                stats: [{ l: "Progress", v: "82%" }, { l: "Score", v: "91%" }, { l: "Level", v: "High" }],
              },
              {
                role: "Teachers", letter: "T",
                accent: "#22d3ee", glow: "rgba(8,145,178,0.1)",
                items: ["Live face-scan attendance", "Upload & manage materials", "Danger-zone email alerts"],
                stats: [{ l: "Students", v: "34" }, { l: "At-risk", v: "07" }, { l: "Materials", v: "12" }],
              },
              {
                role: "Admins", letter: "A",
                accent: "#f472b6", glow: "rgba(190,24,93,0.1)",
                items: ["Manage depts & filieres", "User creation & role control", "Platform-wide reporting"],
                stats: [{ l: "Departments", v: "04" }, { l: "Filieres", v: "08" }, { l: "Uptime", v: "98%" }],
              },
            ].map((r, i) => (
              <motion.div
                key={r.role}
                {...rise(0.08 * i)}
                className="group relative overflow-hidden rounded-[var(--radius-xl)] p-6 transition-all duration-300"
                style={{ border: `1px solid ${r.accent}25`, background: r.glow }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${r.accent}50`; e.currentTarget.style.boxShadow = `0 12px 40px ${r.glow}`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${r.accent}25`; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
              >
                <div className="absolute inset-x-0 top-0 h-0.5"
                     style={{ background: `linear-gradient(90deg, transparent, ${r.accent}80, transparent)` }} />
                <div className="absolute right-4 top-4 h-24 w-24 rounded-full pointer-events-none"
                     style={{ background: `radial-gradient(circle, ${r.accent}20, transparent 70%)` }} />

                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                     style={{ background: `${r.accent}25`, border: `1px solid ${r.accent}40`, color: r.accent, boxShadow: `0 0 14px ${r.accent}30` }}>
                  {r.letter}
                </div>
                <h3 className="mt-4 text-lg font-bold" style={{ color: r.accent }}>{r.role}</h3>

                <div className="mt-3 space-y-2">
                  {r.items.map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-2)" }}>
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: r.accent }} />
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {r.stats.map(({ l, v }) => (
                    <div key={l} className="rounded-[var(--radius)] p-2.5 text-center"
                         style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${r.accent}20` }}>
                      <p className="text-sm font-bold" style={{ color: r.accent }}>{v}</p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{l}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <Sep />

        {/* ── AI TUTOR SHOWCASE ─────────────────────────────────── */}
        <section id="preview" className="mx-auto max-w-5xl px-6 py-24">
          <motion.div {...rise(0)} className="overflow-hidden rounded-[var(--radius-xl)]"
                      style={{ border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.04)", boxShadow: "0 0 60px rgba(124,58,237,0.06)" }}>
            <div className="grid xl:grid-cols-2">
              <div className="p-8 xl:p-10 xl:border-r" style={{ borderColor: "rgba(124,58,237,0.15)" }}>
                <Pill accent="#a78bfa">AI Tutoring</Pill>
                <h2 className="mt-5 text-2xl font-bold tracking-tight md:text-3xl" style={{ color: "var(--text-1)" }}>
                  Academic help built{" "}
                  <span style={{ color: "#a78bfa" }}>into the platform.</span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                  Students get context-aware answers, lesson summaries, and revision support without leaving their course.
                </p>
                <div className="mt-6 space-y-2.5">
                  {[
                    "Context-aware answers from course materials",
                    "Instant lesson summaries on demand",
                    "Auto-generated quizzes & flashcards",
                    "File upload — ask about your own PDFs",
                  ].map(f => (
                    <div key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                      <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#a78bfa", filter: "drop-shadow(0 0 4px #a78bfa)" }} />
                      {f}
                    </div>
                  ))}
                </div>
                <Link to="/login">
                  <button className="btn-violet mt-8 gap-2 px-5 py-2.5 text-sm font-semibold">
                    Try the AI tutor <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>

              {/* Chat mockup */}
              <div className="p-8 xl:p-10">
                <div className="rounded-[var(--radius-lg)] overflow-hidden" style={{ background: "var(--bg)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(124,58,237,0.06)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(124,58,237,0.2)", boxShadow: "0 0 10px rgba(124,58,237,0.3)" }}>
                        <Sparkles className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>AI Tutor</p>
                        <p className="text-[10px]" style={{ color: "var(--text-3)" }}>Connected to course</p>
                      </div>
                    </div>
                    <span className="badge badge-green"><span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> Online</span>
                  </div>

                  <div className="space-y-3 p-4">
                    {[
                      { side: "user", text: "Explain backpropagation simply." },
                      { side: "ai",   text: "Neural networks learn by adjusting weights based on prediction errors — that adjustment process is backpropagation." },
                      { side: "user", text: "Give me 3 quiz questions on this." },
                      { side: "ai",   text: "Sure! Q1: What does backpropagation compute? Q2: What optimizer uses it? Q3: Name the chain rule's role..." },
                    ].map((m, i) => (
                      <div key={i} className={`flex ${m.side === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${m.side === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                          style={
                            m.side === "user"
                              ? { background: "linear-gradient(135deg, #7c3aed, #0891b2)", color: "white" }
                              : { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }
                          }
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mx-4 mb-4 flex items-center gap-2 rounded-[var(--radius)] px-3 py-2.5"
                       style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <input readOnly placeholder="Ask anything about your course…"
                           className="w-full bg-transparent text-xs outline-none" style={{ color: "var(--text-3)" }} />
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <Sep />

        {/* ── FACE SCAN SHOWCASE ───────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 py-24">
          <motion.div {...rise(0)} className="overflow-hidden rounded-[var(--radius-xl)]"
                      style={{ border: "1px solid rgba(8,145,178,0.2)", background: "rgba(8,145,178,0.03)", boxShadow: "0 0 60px rgba(8,145,178,0.05)" }}>
            <div className="grid xl:grid-cols-[1.1fr_0.9fr]">
              <div className="p-8 xl:p-10 xl:border-r" style={{ borderColor: "rgba(8,145,178,0.15)" }}>
                <Pill accent="#22d3ee">Face Recognition Attendance</Pill>
                <h2 className="mt-5 text-2xl font-bold tracking-tight md:text-3xl" style={{ color: "var(--text-1)" }}>
                  Attendance that{" "}
                  <span style={{ color: "#22d3ee" }}>marks itself.</span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                  Teachers open a live camera scan and the system automatically recognizes enrolled students — no manual entry needed.
                </p>
                <div className="mt-6 space-y-2.5">
                  {[
                    { icon: Brain,      text: "Face recognition via webcam" },
                    { icon: Zap,        text: "Auto-scan every 2 seconds" },
                    { icon: BarChart3,  text: "Results logged automatically" },
                    { icon: TrendingUp, text: "Email alerts on danger threshold" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                      <Icon className="h-4 w-4 shrink-0" style={{ color: "#22d3ee", filter: "drop-shadow(0 0 4px #22d3ee)" }} />
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Scan mockup */}
              <div className="p-8 xl:p-10">
                <div className="rounded-[var(--radius-lg)] overflow-hidden" style={{ background: "var(--bg)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,145,178,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <ScanLine className="h-4 w-4" style={{ color: "#22d3ee" }} />
                      <p className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>Live Scan</p>
                    </div>
                    <span className="badge badge-amber"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> Scanning</span>
                  </div>

                  <div className="p-4">
                    <div className="relative flex aspect-video items-center justify-center rounded-[var(--radius)] mb-4 overflow-hidden"
                         style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(8,145,178,0.2)" }}>
                      <div className="absolute inset-x-0 h-0.5 bg-cyan-400/40 animate-pulse" style={{ animation: "scan-line 2s linear infinite" }} />
                      <div className="relative flex flex-col items-center justify-center gap-2">
                        <div className="h-16 w-12 rounded-full border-2 border-dashed border-cyan-400/60 animate-pulse" />
                        <p className="text-[10px] font-medium" style={{ color: "#22d3ee" }}>Detecting faces…</p>
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
                          <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>{name}</span>
                          <span className={`badge ${cls}`}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <Sep />

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 pb-28 pt-8 md:pb-36">
          <motion.div
            {...rise(0)}
            className="relative overflow-hidden rounded-[var(--radius-xl)] px-8 py-20 text-center md:py-24"
            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "var(--surface)" }}
          >
            {/* Background glow */}
            <div className="pointer-events-none absolute inset-0"
                 style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(124,58,237,0.1), transparent)" }} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
                 style={{ background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.4) 30%, rgba(8,145,178,0.4) 70%, transparent)" }} />

            <div className="relative">
              <Pill accent="#a78bfa">Get started today</Pill>
              <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold tracking-tight md:text-5xl" style={{ color: "var(--text-1)" }}>
                Your academic workspace{" "}
                <span style={{
                  background: "linear-gradient(135deg, #a78bfa, #22d3ee)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>is ready.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                Sign in to access your role-based dashboard — whether you're a student, teacher, or administrator.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link to="/login">
                  <button
                    className="btn gap-2 px-8 py-3.5 text-sm font-bold"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #0891b2)",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--radius)",
                      boxShadow: "0 0 40px rgba(124,58,237,0.4), 0 4px 20px rgba(0,0,0,0.3)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 60px rgba(124,58,237,0.55), 0 4px 24px rgba(0,0,0,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 40px rgba(124,58,237,0.4), 0 4px 20px rgba(0,0,0,0.3)"; e.currentTarget.style.transform = "none"; }}
                  >
                    Sign in to platform <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <a href="#features">
                  <button className="btn-ghost gap-2 px-7 py-3 text-sm">Explore features</button>
                </a>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-8 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold"
                 style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.2)", color: "#a78bfa" }}>CE</div>
            <span className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>CampusEye</span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            PFE Project · EST · 2026 · AI-Powered Academic Platform
          </p>
        </footer>

      </div>
    </div>
  );
}