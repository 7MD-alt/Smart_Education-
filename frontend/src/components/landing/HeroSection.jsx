import { motion } from "framer-motion";
import {
  ArrowRight, Bot, GraduationCap, Users,
  BarChart3, Sparkles, Zap, MessageCircle,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (delay = 0) => ({
    opacity: 1, y: 0,
    transition: { delay, duration: 0.85, ease: [0.22, 1, 0.36, 1] },
  }),
};

function BarChart({ bars, color = "bg-white/80" }) {
  return (
    <div className="flex h-full items-end gap-1.5">
      {bars.map((h, i) => (
        <div key={i} className="flex h-full flex-1 flex-col justify-end">
          <div style={{ height: `${h}%` }} className={`w-full rounded-t-[3px] ${color}`} />
        </div>
      ))}
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative mx-auto max-w-[1520px] px-6 pb-24 pt-24 md:px-10 md:pb-32 md:pt-32">

      {/* ── Centered intro ── */}
      <motion.div initial="hidden" animate="show" className="relative z-20 mx-auto max-w-5xl text-center">

        <motion.div variants={fadeUp} custom={0}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI-powered academic platform
        </motion.div>

        <motion.h1 variants={fadeUp} custom={0.08}
          className="mx-auto mt-8 max-w-5xl text-5xl font-semibold tracking-[-0.07em] text-white md:text-7xl xl:text-[92px] xl:leading-[0.94]"
        >
          A smarter system
          <span className="block bg-gradient-to-r from-cyan-300 via-white to-violet-400 bg-clip-text text-transparent">
            for modern education.
          </span>
        </motion.h1>

        <motion.p variants={fadeUp} custom={0.16}
          className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/52 md:text-lg"
        >
          CampusEye combines AI tutoring, student progress tracking,
          teacher intelligence, and institutional visibility in one premium
          academic workspace.
        </motion.p>

        <motion.div variants={fadeUp} custom={0.24}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <button className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90">
            Get Started
          </button>
          <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08]">
            See Demo <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        <motion.div variants={fadeUp} custom={0.32}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4"
        >
          {[
            "AI tutoring and revision help",
            "Teacher insights and monitoring",
            "Centralized institutional visibility",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-white/60" />
              <span className="text-sm text-white/55">{item}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Dashboard preview ── */}
      <motion.div
        initial={{ opacity: 0, y: 90, scale: 0.965 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto mt-20 max-w-[1320px]"
      >
        {/* Animated glow rings behind the dashboard */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.18, 0.28, 0.18] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -inset-6 rounded-[52px] bg-violet-600/20 blur-[60px]"
        />
        <motion.div
          animate={{ scale: [1, 1.04, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="pointer-events-none absolute -inset-10 rounded-[60px] bg-cyan-500/10 blur-[80px]"
        />

        {/* Shell */}
        <div className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-white/[0.025] p-3 shadow-[0_40px_120px_rgba(0,0,0,0.65)] backdrop-blur-xl md:p-4">
          {/* Shimmer line on top of shell */}
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3], scaleX: [0.8, 1, 0.8] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-x-[10%] top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent"
          />

          <div className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#070707]">

            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-white/[0.05] px-6 py-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/25">CampusEye</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Academic intelligence dashboard</h3>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                />
                <span className="text-xs text-emerald-400">Live AI</span>
              </div>
            </div>

            {/* Body */}
            <div className="grid gap-3 p-3 xl:grid-cols-[1.2fr_0.8fr]">

              {/* Left col */}
              <div className="flex flex-col gap-3">

                {/* AI Chat */}
                <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.07),transparent_55%)]" />
                  <div className="relative">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/12">
                        <Bot className="h-3.5 w-3.5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">AI Chat</p>
                        <p className="text-sm font-semibold text-white">Instant academic assistance</p>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex justify-start">
                        <div className="max-w-[75%] rounded-2xl rounded-tl-sm border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-white/62">
                          Summarize this lesson in simple terms.
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="max-w-[82%] rounded-2xl rounded-tr-sm border border-cyan-400/12 bg-gradient-to-br from-cyan-500/12 to-cyan-500/4 px-4 py-2.5 text-sm text-white/82">
                          Neural networks learn by adjusting weights from error feedback — a process called backpropagation.
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="max-w-[65%] rounded-2xl rounded-tl-sm border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-white/62">
                          Generate 3 quick revision questions.
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-black/40 px-4 py-2.5">
                      <input readOnly placeholder="Ask anything about your course…"
                        className="w-full bg-transparent text-sm text-white/25 outline-none" />
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/15" />
                    </div>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="grid gap-3 sm:grid-cols-2">

                  {/* AI Actions */}
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/12">
                        <Zap className="h-3 w-3 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">AI Actions</p>
                        <p className="text-sm font-semibold text-white">Suggested next steps</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { label: "Generate quiz", c: "border-violet-400/20 bg-violet-500/8 text-violet-300" },
                        { label: "Summarize lesson", c: "border-white/[0.06] bg-white/[0.02] text-white/50" },
                        { label: "Flag at-risk students", c: "border-amber-400/20 bg-amber-500/8 text-amber-300" },
                      ].map((a) => (
                        <div key={a.label} className={`rounded-lg border px-3 py-1.5 text-xs ${a.c}`}>
                          {a.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.05]">
                        <BarChart3 className="h-3 w-3 text-white/50" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">Signals</p>
                        <p className="text-sm font-semibold text-white">Performance trend</p>
                      </div>
                    </div>
                    <div className="h-[80px]">
                      <BarChart bars={[28, 42, 35, 56, 70, 61, 78]} color="bg-white/70" />
                    </div>
                    <div className="mt-1.5 flex justify-between">
                      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                        <span key={i} className="flex-1 text-center text-[9px] text-white/20">{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right col */}
              <div className="flex flex-col gap-3">

                {/* Student progress */}
                <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(34,211,238,0.06),transparent_55%)]" />
                  <div className="relative">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/12">
                        <GraduationCap className="h-3.5 w-3.5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">Student progress</p>
                        <p className="text-xl font-semibold text-white">82% completion</p>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        initial={{ width: "0%" }}
                        whileInView={{ width: "82%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500"
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {[
                        { label: "Avg. score", value: "91%", color: "text-cyan-300" },
                        { label: "Focus level", value: "High", color: "text-violet-300" },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                          <p className="text-[9px] uppercase tracking-widest text-white/25">{s.label}</p>
                          <p className={`mt-1 text-lg font-semibold ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Teacher insights */}
                <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(251,191,36,0.05),transparent_55%)]" />
                  <div className="relative">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/12">
                        <Users className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">Teacher insights</p>
                        <p className="text-sm font-semibold text-white">3 students need attention</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { text: "Low quiz completion in Group B", dot: "bg-red-400" },
                        { text: "2 learners requested revision help", dot: "bg-amber-400" },
                        { text: "Engagement dropped after lesson 4", dot: "bg-amber-400" },
                      ].map((item) => (
                        <div key={item.text} className="flex items-start gap-2.5 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                          <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.dot}`} />
                          <span className="text-xs text-white/55">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Attendance mini stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Present", value: "89%", color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/15" },
                    { label: "Absent", value: "07%", color: "text-red-400", bg: "bg-red-500/8 border-red-500/15" },
                    { label: "Late", value: "04%", color: "text-amber-400", bg: "bg-amber-500/8 border-amber-500/15" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}>
                      <p className="text-[9px] uppercase tracking-widest text-white/25">{s.label}</p>
                      <p className={`mt-1 text-base font-semibold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}