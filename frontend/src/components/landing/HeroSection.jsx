import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  GraduationCap,
  Users,
  BarChart3,
  Sparkles,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay,
      duration: 0.85,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export default function HeroSection() {
  return (
    <section className="relative mx-auto max-w-[1520px] px-6 pb-24 pt-24 md:px-10 md:pb-32 md:pt-32">
      {/* CENTERED INTRO FIRST */}
      <motion.div
        initial="hidden"
        animate="show"
        className="relative z-20 mx-auto max-w-5xl text-center"
      >
        <motion.div
          variants={fadeUp}
          custom={0}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/55"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI-powered academic platform
        </motion.div>

        <motion.h1
          variants={fadeUp}
          custom={0.08}
          className="mx-auto mt-8 max-w-5xl text-5xl font-semibold tracking-[-0.07em] text-white md:text-7xl xl:text-[92px] xl:leading-[0.94]"
        >
          A smarter system
          <span className="block bg-gradient-to-r from-cyan-300 via-white to-violet-400 bg-clip-text text-transparent">
            for modern education.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          custom={0.16}
          className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/60 md:text-lg"
        >
          Smart Education combines AI tutoring, student progress tracking,
          teacher intelligence, and institutional visibility in one premium
          academic workspace.
        </motion.p>

        <motion.div
          variants={fadeUp}
          custom={0.24}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <button className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition duration-300 hover:bg-white/90">
            Get Started
          </button>

          <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white transition duration-300 hover:border-white/20 hover:bg-white/[0.08]">
            See Demo
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        <motion.div
          variants={fadeUp}
          custom={0.32}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4"
        >
          {[
            "AI tutoring and revision help",
            "Teacher insights and monitoring",
            "Centralized institutional visibility",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-white/80" />
              <span className="text-sm text-white/65">{item}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* PRODUCT PREVIEW SHOWS AFTER, CENTERED */}
      <motion.div
        initial={{ opacity: 0, y: 90, scale: 0.965 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.28 }}
        transition={{
          duration: 1,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative z-10 mx-auto mt-20 max-w-[1320px]"
      >
        {/* OUTER GLOW */}
        <div className="pointer-events-none absolute inset-0 rounded-[42px] bg-gradient-to-br from-cyan-500/20 via-violet-500/20 to-orange-400/10 blur-3xl" />

        {/* FLOATING LABELS */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-6 top-10 z-30 hidden rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/75 backdrop-blur-xl lg:block"
        >
          AI tutoring active
        </motion.div>

        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-6 bottom-12 z-30 hidden rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/75 backdrop-blur-xl lg:block"
        >
          Live classroom signals
        </motion.div>

        {/* MAIN SHELL */}
        <div className="relative overflow-hidden rounded-[42px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:p-5">
          <div className="rounded-[36px] border border-white/10 bg-[#050505] p-5 md:p-6">
            {/* TOP BAR */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                  Smart Education
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                  Academic intelligence dashboard
                </h3>
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/50">
                Live AI
              </div>
            </div>

            {/* MAIN GRID */}
            <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              {/* AI CHAT BIG PANEL */}
              <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                      AI Chat
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      Instant academic assistance
                    </p>
                  </div>
                  <Bot className="h-5 w-5 text-white/65" />
                </div>

                <div className="mt-6 space-y-4">
                  <div className="max-w-[78%] rounded-[22px] border border-white/10 bg-white/[0.045] p-4 text-base text-white/75">
                    Summarize this lesson in simple terms.
                  </div>

                  <div className="ml-auto max-w-[82%] rounded-[22px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-base text-white/92">
                    This lesson explains how neural networks learn patterns by
                    adjusting weights from error feedback.
                  </div>

                  <div className="max-w-[72%] rounded-[22px] border border-white/10 bg-white/[0.045] p-4 text-base text-white/75">
                    Generate 3 quick revision questions.
                  </div>
                </div>

                <div className="mt-6 rounded-[22px] border border-white/10 bg-black/40 px-4 py-4 text-sm text-white/45">
                  Ask anything about your course...
                </div>
              </div>

              {/* RIGHT STACK */}
              <div className="grid gap-5">
                {/* PROGRESS PANEL */}
                <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Student Progress
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        82% completion
                      </p>
                    </div>
                    <GraduationCap className="h-5 w-5 text-white/65" />
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500" />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    {[
                      { label: "Avg. score", value: "91%" },
                      { label: "Focus", value: "High" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[22px] border border-white/10 bg-black/40 p-4"
                      >
                        <p className="text-sm text-white/35">{item.label}</p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TEACHER INSIGHTS */}
                <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Teacher Insights
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        3 students need help
                      </p>
                    </div>
                    <Users className="h-5 w-5 text-white/65" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      "Low quiz completion in Group B",
                      "2 learners requested revision help",
                      "Engagement dropped after lesson 4",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-[20px] border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/72"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM STRIP */}
            <div className="mt-5 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                      AI Actions
                    </p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      Suggested next steps
                    </p>
                  </div>
                  <Bot className="h-5 w-5 text-white/65" />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {[
                    "Generate quiz",
                    "Summarize lesson",
                    "Flag struggling students",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-white/72"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Academic Signals
                    </p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      Real-time performance trend
                    </p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-white/65" />
                </div>

                <div className="mt-5 flex h-28 items-end gap-3">
                  {[28, 42, 35, 56, 70, 61, 78].map((h, i) => (
                    <div key={i} className="flex h-full flex-1 items-end">
                      <div
                        style={{ height: `${h}%` }}
                        className="w-full rounded-full bg-white"
                      />
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