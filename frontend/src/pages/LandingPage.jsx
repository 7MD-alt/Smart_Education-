import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import {
  ArrowRight, Zap, ScanLine, Brain, BarChart3,
  ShieldCheck, BookOpen, Users, CalendarCheck,
  CheckCircle2, ChevronRight, Sparkles,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1];
const up = (d = 0, y = 30) => ({
  initial:     { opacity: 0, y },
  whileInView: { opacity: 1, y: 0 },
  viewport:    { once: true, amount: 0.15 },
  transition:  { duration: 0.65, delay: d, ease },
});
const left = (d = 0) => ({
  initial:     { opacity: 0, x: -30 },
  whileInView: { opacity: 1, x: 0 },
  viewport:    { once: true, amount: 0.15 },
  transition:  { duration: 0.65, delay: d, ease },
});

/* ────────────────────────────────────────────────────────────────
   LIVE SCAN TERMINAL MOCKUP (pure CSS)
──────────────────────────────────────────────────────────────── */
const TerminalMockup = () => {
  const [tick, setTick] = useState(0);
  const rows = [
    { id: "S4-001", name: "Ahmed Alaoui",    status: "PRESENT", conf: 98.2, time: "09:01:14" },
    { id: "S4-002", name: "Sara Benali",     status: "PRESENT", conf: 96.7, time: "09:01:16" },
    { id: "S4-003", name: "Imane Drissi",    status: "LATE",    conf: 94.1, time: "09:01:19" },
    { id: "S4-004", name: "Younes Idrissi",  status: "PRESENT", conf: 97.8, time: "09:01:21" },
    { id: "S4-005", name: "Kenza Moussaoui", status: "ABSENT",  conf: 0,   time: "—"         },
  ];

  useEffect(() => {
    const t = setInterval(() => setTick(v => (v + 1) % 4), 1800);
    return () => clearInterval(t);
  }, []);

  const statusColor = {
    PRESENT: { color: "#4ade80", bg: "rgba(21,128,61,0.15)" },
    LATE:    { color: "#fbbf24", bg: "rgba(180,83,9,0.15)"  },
    ABSENT:  { color: "#f87171", bg: "rgba(185,28,28,0.15)" },
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        background: "rgba(4,4,16,0.92)",
        border: "1px solid rgba(139,92,246,0.2)",
        boxShadow: "0 0 60px rgba(124,58,237,0.18), 0 40px 80px rgba(0,0,0,0.6)",
      }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(139,92,246,0.06)" }}>
        <div className="flex gap-1.5">
          {["#f87171","#fbbf24","#4ade80"].map(c => (
            <div key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c, opacity: 0.8 }} />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] font-mono" style={{ color: "rgba(139,92,246,0.7)" }}>
            campuseye — live_attendance.scan
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] font-mono" style={{ color: "#4ade80" }}>LIVE</span>
        </div>
      </div>

      {/* Session header */}
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div>
          <p className="text-xs font-semibold" style={{ color: "#f0f0ff", letterSpacing: "-0.01em" }}>
            Réseaux Informatiques — Cours
          </p>
          <p className="text-[10px] mt-0.5 font-mono" style={{ color: "rgba(120,120,160,0.8)" }}>
            Séance #42 · {new Date().toLocaleDateString("fr-FR")} · 09:00
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScanLine className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono" style={{ color: "#22d3ee" }}>
            SCANNING{".".repeat((tick % 3) + 1)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 py-2">
        <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-x-4"
          style={{ color: "rgba(80,80,120,0.8)", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <span>Student</span><span>Conf</span><span>Status</span>
        </div>
        <div className="space-y-1.5">
          {rows.map((r, i) => {
            const s = statusColor[r.status];
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12, ease }}
                className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center rounded-lg px-2 py-1.5"
                style={{ background: i === tick ? "rgba(139,92,246,0.07)" : "transparent" }}
              >
                <div className="min-w-0">
                  <span className="text-[11px] font-medium" style={{ color: i === tick ? "#f0f0ff" : "rgba(200,200,220,0.7)" }}>
                    {r.name}
                  </span>
                  <span className="ml-2 text-[9px] font-mono" style={{ color: "rgba(80,80,120,0.7)" }}>
                    {r.id}
                  </span>
                </div>
                <span className="text-[10px] font-mono tabular-nums" style={{ color: r.conf > 0 ? "rgba(160,160,200,0.8)" : "rgba(80,80,120,0.5)" }}>
                  {r.conf > 0 ? `${r.conf}%` : "—"}
                </span>
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ color: s.color, background: s.bg, letterSpacing: "0.04em" }}>
                  {r.status}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom stats */}
      <div className="mx-4 mt-2 mb-4 grid grid-cols-3 gap-2">
        {[
          { label: "Present", value: "3", color: "#4ade80" },
          { label: "Late",    value: "1", color: "#fbbf24" },
          { label: "Absent",  value: "1", color: "#f87171" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg px-3 py-2 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-base font-bold" style={{ color, letterSpacing: "-0.02em" }}>{value}</p>
            <p className="text-[9px] mt-0.5 font-mono uppercase" style={{ color: "rgba(100,100,130,0.7)", letterSpacing: "0.06em" }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────
   BENTO CARD
──────────────────────────────────────────────────────────────── */
const BentoCard = ({ children, className = "", style = {}, hover = true }) => {
  const [pos, setPos] = useState({ x: "50%", y: "50%" });
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background: "rgba(6,6,20,0.8)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.07)",
        /* Resting inner light + ambient violet glow */
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.3)",
        transition: "border-color 220ms, box-shadow 240ms, transform 220ms cubic-bezier(0.16,1,0.3,1)",
        ...style,
      }}
      onMouseEnter={hover ? (e) => { e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.09), 0 0 0 1px rgba(139,92,246,0.1), 0 8px 40px rgba(124,58,237,0.12), 0 4px 16px rgba(0,0,0,0.4)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.22)"; } : undefined}
      onMouseLeave={hover ? (e) => { e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.3)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; } : undefined}
      onMouseMove={hover ? (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: `${((e.clientX - r.left) / r.width) * 100}%`, y: `${((e.clientY - r.top) / r.height) * 100}%` });
      } : undefined}
    >
      {/* Static top-edge light — always visible */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.45) 30%, rgba(34,211,238,0.32) 70%, transparent 100%)" }}
      />
      {/* Pointer-tracked spotlight */}
      {hover && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${pos.x} ${pos.y}, rgba(139,92,246,0.08), transparent 60%)`,
          }}
        />
      )}
      {children}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────
   CHAT MOCKUP (for AI section)
──────────────────────────────────────────────────────────────── */
const ChatMockup = () => (
  <div className="space-y-3 p-4">
    {[
      { role: "user",   text: "Explique-moi le protocole TCP en 3 points clés" },
      { role: "novaa",  text: "TCP garantit la livraison ordonnée des données via :\n1. Établissement de connexion (3-way handshake)\n2. Numérotation de séquence\n3. Accusé de réception (ACK)" },
      { role: "user",   text: "Génère un quiz de 5 questions MCQ sur ce sujet" },
    ].map((m, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: i * 0.15, ease }}
        className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
      >
        {m.role === "novaa" && (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-bold mt-0.5"
            style={{ background: "rgba(124,58,237,0.3)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.4)" }}>N</div>
        )}
        <div
          className="max-w-[80%] rounded-xl px-3 py-2"
          style={{
            background: m.role === "user"
              ? "rgba(124,58,237,0.18)"
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${m.role === "user" ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.07)"}`,
          }}
        >
          <p className="text-[11px] leading-relaxed whitespace-pre-line" style={{ color: m.role === "user" ? "#d8b4fe" : "rgba(200,200,220,0.85)" }}>
            {m.text}
          </p>
        </div>
      </motion.div>
    ))}
    <div className="flex gap-2 items-center px-3 py-2 rounded-xl"
      style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)" }}>
      <Sparkles className="h-3 w-3 text-violet-400 animate-pulse" />
      <span className="text-[10px] font-mono" style={{ color: "rgba(139,92,246,0.7)" }}>Génération du quiz…</span>
    </div>
  </div>
);

/* ────────────────────────────────────────────────────────────────
   MAIN
──────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const rawHeroY = useTransform(scrollYProgress, [0, 0.2], [0, -50]);
  const heroY    = useSpring(rawHeroY, { stiffness: 80, damping: 25, restDelta: 0.001 });

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-x-hidden" style={{ background: "#030312", color: "#f0f0ff" }}>

      {/* ── BACKGROUND ─────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute rounded-full animate-orb-1"
          style={{ width: 900, height: 900, top: "-25%", left: "-20%",
            background: "radial-gradient(circle at 40% 40%, rgba(124,58,237,0.42) 0%, rgba(124,58,237,0.1) 45%, transparent 70%)",
            filter: "blur(60px)" }} />
        <div className="absolute rounded-full animate-orb-2"
          style={{ width: 700, height: 700, bottom: "-20%", right: "-15%",
            background: "radial-gradient(circle, rgba(8,145,178,0.35) 0%, rgba(8,145,178,0.08) 45%, transparent 70%)",
            filter: "blur(60px)" }} />
        {/* Fine grid */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(139,92,246,0.14) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 40%, black 0%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 40%, black 0%, transparent 100%)",
          }} />
      </div>

      <div className="relative z-10">

        {/* ════════════════════════════════════════════════════════
            NAV
        ════════════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-50 flex justify-center px-4 pt-4">
          <motion.nav
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="flex w-full max-w-5xl items-center justify-between rounded-2xl px-5 py-3"
            style={{
              background: "rgba(3,3,18,0.82)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(139,92,246,0.18)",
              boxShadow: "0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(8,145,178,0.35))",
                  border: "1px solid rgba(139,92,246,0.5)",
                  boxShadow: "0 0 16px rgba(124,58,237,0.3)",
                }}>
                <Zap className="h-4 w-4" style={{ color: "#a78bfa", filter: "drop-shadow(0 0 4px #a78bfa)" }} />
              </div>
              <span className="text-sm font-bold" style={{ letterSpacing: "-0.02em" }}>
                Campus<span style={{ color: "#a78bfa" }}>Eye</span>
              </span>
            </div>

            {/* Links */}
            <div className="hidden items-center gap-1 md:flex">
              {[["Features","#features"],["Roles","#roles"],["AI","#ai"]].map(([l, h]) => (
                <a key={l} href={h}
                  className="rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-150"
                  style={{ color: "rgba(120,120,160,0.9)" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#f0f0ff"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(120,120,160,0.9)"; e.currentTarget.style.background = "transparent"; }}>
                  {l}
                </a>
              ))}
            </div>

            {/* CTA */}
            <Link to="/login">
              <button
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  color: "#fff",
                  boxShadow: "0 0 20px rgba(124,58,237,0.35)",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 36px rgba(124,58,237,0.55)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 20px rgba(124,58,237,0.35)"; e.currentTarget.style.transform = "none"; }}>
                Sign in <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </motion.nav>
        </header>

        {/* ════════════════════════════════════════════════════════
            HERO
        ════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="flex flex-col items-center gap-16 lg:flex-row lg:items-center lg:gap-12">

            {/* Left */}
            <motion.div className="flex-1 min-w-0" style={{ y: heroY }}>
              <motion.div {...up(0)}>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                  style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.28)" }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                  <span className="text-xs font-semibold" style={{ color: "#a78bfa", letterSpacing: "0.04em" }}>
                    PFE · EST · Moroccan Engineering Schools
                  </span>
                </div>
              </motion.div>

              <motion.h1 {...up(0.06)}
                style={{
                  fontSize: "clamp(2.8rem, 6vw, 5rem)",
                  fontWeight: 780,
                  letterSpacing: "-0.045em",
                  lineHeight: 1.04,
                  color: "#f0f0ff",
                }}>
                Attendance,
                <br />
                <span style={{
                  background: "linear-gradient(135deg, #a78bfa 0%, #60a5fa 45%, #22d3ee 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>
                  reimagined.
                </span>
              </motion.h1>

              <motion.p {...up(0.1)}
                className="mt-6 max-w-lg text-[16px] leading-[1.7]"
                style={{ color: "rgba(120,120,160,0.9)" }}>
                Face recognition that marks attendance in seconds. An AI tutor with 17 specialist agents.
                A command center for every academic role — built for the modern Moroccan campus.
              </motion.p>

              <motion.div {...up(0.14)} className="mt-8 flex flex-wrap gap-3">
                <Link to="/login">
                  <button
                    className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #0891b2 100%)",
                      color: "#fff",
                      boxShadow: "0 0 40px rgba(124,58,237,0.4), 0 4px 20px rgba(0,0,0,0.4)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 60px rgba(124,58,237,0.6), 0 4px 24px rgba(0,0,0,0.5)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 40px rgba(124,58,237,0.4), 0 4px 20px rgba(0,0,0,0.4)"; e.currentTarget.style.transform = "none"; }}>
                    Get started <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <a href="#features">
                  <button
                    className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,200,220,0.9)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
                    See how it works
                  </button>
                </a>
              </motion.div>

              {/* Social proof strip */}
              <motion.div {...up(0.18)} className="mt-10 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {["#a78bfa","#22d3ee","#f472b6","#4ade80","#fbbf24"].map((c, i) => (
                    <div key={i} className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[9px] font-bold"
                      style={{ background: `${c}20`, borderColor: "#030312", color: c }}>
                      {["A","T","S","T","S"][i]}
                    </div>
                  ))}
                </div>
                <p className="text-xs" style={{ color: "rgba(120,120,160,0.8)" }}>
                  Used by students, teachers & admins
                </p>
              </motion.div>
            </motion.div>

            {/* Right — terminal mockup */}
            <motion.div
              className="w-full lg:w-[48%] shrink-0"
              initial={{ opacity: 0, x: 40, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease }}
            >
              <TerminalMockup />
            </motion.div>
          </div>
        </section>

        {/* ── STATS TICKER ───────────────────────────────────────── */}
        <div className="mx-auto mb-20 max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { val: "3",  unit: "Roles",     desc: "Student · Teacher · Admin", color: "#a78bfa" },
              { val: "17", unit: "AI Agents",  desc: "Specialist tutor modes",    color: "#22d3ee" },
              { val: "<2s",unit: "Face Scan",  desc: "Per recognition scan",      color: "#4ade80" },
              { val: "∞",  unit: "Materials",  desc: "Upload PDFs, slides & more",color: "#fbbf24" },
            ].map(({ val, unit, desc, color }, i) => (
              <motion.div
                key={unit}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(6,6,20,0.75)",
                  backdropFilter: "blur(16px) saturate(1.3)",
                  WebkitBackdropFilter: "blur(16px) saturate(1.3)",
                  border: `1px solid ${color}18`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.25)`,
                  transition: "border-color 220ms, box-shadow 220ms",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px ${color}20, 0 4px 20px rgba(0,0,0,0.3)`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}18`; e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.25)`; }}
              >
                <div className="flex items-baseline gap-1.5">
                  <span style={{ fontSize: "1.9rem", fontWeight: 750, letterSpacing: "-0.04em", color, lineHeight: 1, textShadow: `0 0 20px ${color}55` }}>{val}</span>
                  <span className="text-xs font-bold" style={{ color, opacity: 0.7, letterSpacing: "0.04em" }}>{unit}</span>
                </div>
                <p className="mt-1.5 text-[11px]" style={{ color: "rgba(100,100,130,0.85)" }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            BENTO FEATURES
        ════════════════════════════════════════════════════════ */}
        <section id="features" className="mx-auto max-w-5xl px-6 pb-24">
          <div className="mb-12">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs font-bold uppercase tracking-[0.12em]"
              style={{ color: "rgba(139,92,246,0.7)" }}
            >
              Platform
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 750, letterSpacing: "-0.04em", marginTop: "0.5rem", lineHeight: 1.1 }}
            >
              Everything your institution needs.
            </motion.h2>
          </div>

          {/* Bento grid — 3 columns */}
          <div className="grid gap-3 md:grid-cols-3">

            {/* Large: Face scan — spans 2 rows on large */}
            <motion.div {...up(0.04)} className="md:row-span-2">
              <BentoCard className="h-full p-6" style={{ minHeight: 340 }}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl mb-5"
                  style={{ background: "rgba(8,145,178,0.15)", border: "1px solid rgba(8,145,178,0.3)" }}>
                  <ScanLine className="h-6 w-6" style={{ color: "#22d3ee", filter: "drop-shadow(0 0 6px #22d3ee)" }} />
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.025em", color: "#f0f0ff" }}>
                  Face Scan Attendance
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(120,120,160,0.85)" }}>
                  Webcam-powered face recognition marks attendance automatically. Zero manual entry, zero error.
                </p>
                <div className="mt-6 space-y-2">
                  {["~98% recognition accuracy","Marks present in under 2 seconds","Works with webcam or upload"].map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs" style={{ color: "rgba(150,150,180,0.8)" }}>
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#22d3ee" }} />
                      {f}
                    </div>
                  ))}
                </div>
                {/* Mini visual */}
                <div className="mt-6 rounded-xl p-3"
                  style={{ background: "rgba(8,145,178,0.06)", border: "1px solid rgba(8,145,178,0.15)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono" style={{ color: "rgba(34,211,238,0.6)" }}>FACE_ID_SCAN.py</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    {["> scan_frame(cap.read())", "> match_face(encoding, db)", '✓ "Sara Benali" → PRESENT'].map((l, i) => (
                      <p key={i} className="font-mono text-[10px]"
                        style={{ color: i === 2 ? "#4ade80" : "rgba(120,120,160,0.7)" }}>{l}</p>
                    ))}
                  </div>
                </div>
              </BentoCard>
            </motion.div>

            {/* AI Tutor */}
            <motion.div {...up(0.08)}>
              <BentoCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
                    <Brain className="h-5 w-5" style={{ color: "#a78bfa", filter: "drop-shadow(0 0 5px #a78bfa)" }} />
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}>
                    17 agents
                  </span>
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#f0f0ff" }}>NOVAA AI Tutor</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(120,120,160,0.85)" }}>
                  Quizzes, flashcards, code help, summaries, study plans — all from course materials.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["Quiz","Flashcard","Code","Summary","Exam Prep"].map(t => (
                    <span key={t} className="rounded-lg px-2 py-1 text-[10px] font-medium"
                      style={{ background: "rgba(124,58,237,0.1)", color: "rgba(167,139,250,0.8)", border: "1px solid rgba(124,58,237,0.18)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </BentoCard>
            </motion.div>

            {/* Admin oversight */}
            <motion.div {...up(0.1)}>
              <BentoCard className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-4"
                  style={{ background: "rgba(190,24,93,0.15)", border: "1px solid rgba(190,24,93,0.3)" }}>
                  <ShieldCheck className="h-5 w-5" style={{ color: "#f472b6", filter: "drop-shadow(0 0 5px #f472b6)" }} />
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#f0f0ff" }}>Full Oversight</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(120,120,160,0.85)" }}>
                  Admins manage departments, filières, courses, users, and face registration requests from one panel.
                </p>
              </BentoCard>
            </motion.div>

            {/* Attendance analytics — spans 2 cols */}
            <motion.div {...up(0.12)} className="md:col-span-2">
              <BentoCard className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-4"
                      style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)" }}>
                      <BarChart3 className="h-5 w-5" style={{ color: "#4ade80" }} />
                    </div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#f0f0ff" }}>Live Analytics</h3>
                    <p className="mt-2 text-sm" style={{ color: "rgba(120,120,160,0.85)" }}>
                      Real-time attendance rates, danger-zone alerts, and course breakdowns.
                    </p>
                  </div>
                  {/* Mini bar chart */}
                  <div className="hidden md:flex items-end gap-1.5 h-16">
                    {[40,65,55,80,72,90,68].map((h, i) => (
                      <div key={i} className="w-4 rounded-t-sm transition-all"
                        style={{
                          height: `${h}%`,
                          background: `linear-gradient(180deg, ${i === 5 ? "#4ade80" : "rgba(74,222,128,0.35)"}, ${i === 5 ? "rgba(74,222,128,0.3)" : "rgba(74,222,128,0.1)"})`,
                          border: i === 5 ? "1px solid rgba(74,222,128,0.5)" : "1px solid rgba(74,222,128,0.15)",
                        }} />
                    ))}
                  </div>
                </div>
              </BentoCard>
            </motion.div>

          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            ROLES
        ════════════════════════════════════════════════════════ */}
        <section id="roles" className="mx-auto max-w-5xl px-6 pb-24">
          <div className="mb-12">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs font-bold uppercase tracking-[0.12em]"
              style={{ color: "rgba(244,114,182,0.7)" }}
            >
              Roles
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 750, letterSpacing: "-0.04em", marginTop: "0.5rem", lineHeight: 1.1 }}
            >
              One platform, three experiences.
            </motion.h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                role: "Student",
                color: "#a78bfa", border: "rgba(124,58,237,0.2)", bg: "rgba(124,58,237,0.06)",
                icon: "S",
                features: [
                  "AI tutor (17 specialist agents)",
                  "Live attendance tracking",
                  "Absence danger-zone alerts",
                  "Course materials & resources",
                  "Exam prediction engine",
                  "Pomodoro study planner",
                ],
              },
              {
                role: "Teacher",
                color: "#22d3ee", border: "rgba(8,145,178,0.2)", bg: "rgba(8,145,178,0.06)",
                icon: "T",
                features: [
                  "One-click face scan sessions",
                  "Manual attendance override",
                  "Danger-zone email alerts",
                  "Course material uploads",
                  "NOVAA schedule assistant",
                  "Attendance reports (XLSX)",
                ],
              },
              {
                role: "Admin",
                color: "#f472b6", border: "rgba(190,24,93,0.2)", bg: "rgba(190,24,93,0.06)",
                icon: "A",
                features: [
                  "Platform-wide user management",
                  "Department & filière structure",
                  "Face registration approvals",
                  "Bulk CSV user import",
                  "NOVAA admin assistant",
                  "Platform analytics & reports",
                ],
              },
            ].map(({ role, color, border, bg, icon, features }, ri) => (
              <motion.div key={role} {...up(0.06 * ri)}>
                <BentoCard className="p-6 h-full" style={{ border: `1px solid ${border}`, background: bg }}>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                      style={{ background: `${color}20`, border: `1px solid ${color}35`, color }}>
                      {icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#f0f0ff" }}>{role}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: color }} />
                        <span className="text-[10px]" style={{ color: `${color}80` }}>Active role</span>
                      </div>
                    </div>
                  </div>
                  {/* Features */}
                  <ul className="space-y-2.5">
                    {features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-xs" style={{ color: "rgba(160,160,190,0.85)" }}>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {/* CTA */}
                  <Link to="/login">
                    <button
                      className="mt-6 w-full rounded-xl py-2 text-xs font-semibold transition-all"
                      style={{
                        background: `${color}12`,
                        border: `1px solid ${color}28`,
                        color,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${color}22`; e.currentTarget.style.borderColor = `${color}50`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${color}12`; e.currentTarget.style.borderColor = `${color}28`; }}>
                      Sign in as {role} →
                    </button>
                  </Link>
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            NOVAA AI SECTION
        ════════════════════════════════════════════════════════ */}
        <section id="ai" className="mx-auto max-w-5xl px-6 pb-24">
          <motion.div {...up(0)}>
            <BentoCard className="overflow-hidden" style={{ border: "1px solid rgba(124,58,237,0.25)", background: "rgba(4,4,16,0.9)" }}>
              {/* Top stripe */}
              <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.6), rgba(34,211,238,0.4), transparent)" }} />

              <div className="grid gap-8 p-8 md:grid-cols-2 md:items-center">
                {/* Left text — slides in from left */}
                <motion.div
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.65, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                    style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)" }}>
                    <Sparkles className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
                    <span className="text-xs font-bold" style={{ color: "#a78bfa", letterSpacing: "0.05em" }}>NOVAA · AI Tutor</span>
                  </div>

                  <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", fontWeight: 750, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
                    Your personal academic
                    {" "}<span style={{
                      background: "linear-gradient(135deg, #a78bfa, #22d3ee)",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                    }}>intelligence.</span>
                  </h2>

                  <p className="mt-4 text-sm leading-relaxed" style={{ color: "rgba(120,120,160,0.9)" }}>
                    17 specialist AI agents that understand your course materials, generate quizzes, explain concepts,
                    debug code, and build personalised study plans — all in French, English, or Darija.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {["Quiz Gen","Flashcards","Code Debug","Study Plan","Exam Predict","Translate","Research","Hints"].map(t => (
                      <span key={t} className="rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                        style={{ background: "rgba(124,58,237,0.1)", color: "rgba(167,139,250,0.85)", border: "1px solid rgba(124,58,237,0.2)" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </motion.div>

                {/* Right — chat mockup, rises up slightly behind the text */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(3,3,12,0.8)", border: "1px solid rgba(124,58,237,0.15)" }}
                >
                  <div className="px-4 py-3 flex items-center gap-2"
                    style={{ borderBottom: "1px solid rgba(124,58,237,0.12)", background: "rgba(124,58,237,0.06)" }}>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-bold"
                      style={{ background: "rgba(124,58,237,0.3)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.4)" }}>N</div>
                    <span className="text-xs font-bold" style={{ color: "#a78bfa", letterSpacing: "-0.01em" }}>NOVAA</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse ml-auto" />
                  </div>
                  <ChatMockup />
                </motion.div>
              </div>
            </BentoCard>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════════
            FINAL CTA
        ════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <motion.div {...up(0)}>
            <BentoCard className="p-12 text-center" style={{ border: "1px solid rgba(139,92,246,0.2)" }}>
              <div className="h-px mb-8 mx-auto max-w-xs" style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)" }} />
              <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 780, letterSpacing: "-0.045em", lineHeight: 1.06 }}>
                Ready to transform<br />
                <span style={{
                  background: "linear-gradient(135deg, #a78bfa 0%, #22d3ee 60%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>your campus?</span>
              </h2>
              <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ color: "rgba(120,120,160,0.85)" }}>
                Join the platform built for Moroccan engineering education.
                Face attendance, AI tutoring, and full academic oversight — all in one place.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link to="/login">
                  <button
                    className="flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-bold transition-all"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                      color: "#fff",
                      boxShadow: "0 0 40px rgba(124,58,237,0.4)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 60px rgba(124,58,237,0.6)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 40px rgba(124,58,237,0.4)"; e.currentTarget.style.transform = "none"; }}>
                    Open platform <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
              <div className="h-px mt-10 mx-auto max-w-xs" style={{ background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.3), transparent)" }} />
            </BentoCard>
          </motion.div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────── */}
        <footer className="border-t px-6 py-8 text-center text-xs"
          style={{ borderColor: "rgba(255,255,255,0.05)", color: "rgba(80,80,100,0.8)" }}>
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
            <span>CampusEye · PFE Project · EST · 2026</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
