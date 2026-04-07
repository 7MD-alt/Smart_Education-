import Navbar from "../components/layout/Navbar";
import HeroSection from "../components/landing/HeroSection";
import ColorBends from "@/components/ColorBends";
import { ArrowRight, Sparkles, GraduationCap, Users, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const capabilityStrip = [
  {
    icon: Sparkles,
    title: "AI tutoring",
    text: "Instant help, summaries, and revision support inside the academic flow.",
    glow: "from-cyan-500/20 to-transparent",
  },
  {
    icon: GraduationCap,
    title: "Progress clarity",
    text: "Track how learners improve with cleaner signals and simpler visibility.",
    glow: "from-violet-500/20 to-transparent",
  },
  {
    icon: Users,
    title: "Teacher workflow",
    text: "Create lessons, quizzes, and support actions with much less friction.",
    glow: "from-fuchsia-500/20 to-transparent",
  },
  {
    icon: ShieldCheck,
    title: "Institutional oversight",
    text: "Centralized reporting and cross-role coordination at scale.",
    glow: "from-emerald-500/20 to-transparent",
  },
];

const rolePanels = [
  {
    title: "Students",
    label: "Learner experience",
    description:
      "A focused environment with AI support, revision tools, progress visibility, and a smoother path through every course.",
    points: [
      "Ask questions in context",
      "Get summaries and revision help",
      "Track completion and performance",
    ],
    stats: [
      { label: "Progress", value: "82%" },
      { label: "Score", value: "91%" },
      { label: "Level", value: "High" },
    ],
    accent: "from-cyan-500/12 via-sky-500/8 to-transparent",
  },
  {
    title: "Teachers",
    label: "Teaching intelligence",
    description:
      "A smarter teaching layer that highlights who needs help, what content underperforms, and what action to take next.",
    points: [
      "See classroom health instantly",
      "Generate content faster",
      "Spot risk before results drop",
    ],
    stats: [
      { label: "Tracked", value: "34" },
      { label: "Follow-up", value: "07" },
      { label: "Resources", value: "12" },
    ],
    accent: "from-violet-500/12 via-fuchsia-500/8 to-transparent",
  },
  {
    title: "Institutions",
    label: "Academic operations",
    description:
      "A premium command layer for visibility, governance, reporting, and high-level academic coordination.",
    points: [
      "Live academic reporting",
      "Cross-role visibility",
      "Scalable operational control",
    ],
    stats: [
      { label: "Departments", value: "04" },
      { label: "Reporting", value: "Live" },
      { label: "Uptime", value: "98%" },
    ],
    accent: "from-emerald-500/12 via-teal-500/8 to-transparent",
  },
];

const impactStats = [
  { value: "24/7", label: "AI academic support" },
  { value: "3x", label: "faster content workflows" },
  { value: "1 hub", label: "students, teachers, admins" },
  { value: "Live", label: "institutional visibility" },
];

function MiniChart({ bars = [38, 56, 44, 68, 61, 76] }) {
  return (
    <div className="flex h-24 items-end gap-3">
      {bars.map((h, idx) => (
        <div key={idx} className="flex h-full flex-1 items-end">
          <div
            style={{ height: `${h}%` }}
            className="w-full rounded-full bg-white/90"
          />
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white antialiased">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <ColorBends />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1] bg-black/65" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:88px_88px] [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]" />

      <div className="relative z-10">
        <Navbar variant="landing" />

        <main>
          <HeroSection />

          {/* FIRST TEXT CENTERED, THEN PLATFORM SECTION SHOWS UP */}
          <section className="relative mx-auto max-w-[1520px] px-6 pt-10 md:px-10 md:pt-18">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.45 }}
              variants={{
                hidden: {},
                show: {
                  transition: {
                    staggerChildren: 0.14,
                  },
                },
              }}
              className="relative"
            >
              <motion.div
                variants={fadeUp}
                className="mx-auto max-w-4xl pb-24 text-center md:pb-32"
              >
                <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                  Platform overview
                </p>

                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  A unified academic system, not just another dashboard.
                </h2>

                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/60 md:text-lg">
                  Smart Education brings tutoring, progress visibility, teacher
                  action, and institutional oversight into one premium platform.
                </p>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="relative z-20 -mt-10 md:-mt-16"
              >
                <div className="mx-auto max-w-[1420px] rounded-[38px] border border-white/10 bg-white/[0.045] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {capabilityStrip.map((item, i) => {
                      const Icon = item.icon;

                      return (
                        <motion.div
                          key={item.title}
                          custom={i}
                          variants={{
                            hidden: { opacity: 0, y: 42, scale: 0.965 },
                            show: (idx) => ({
                              opacity: 1,
                              y: 0,
                              scale: 1,
                              transition: {
                                delay: idx * 0.08,
                                duration: 0.72,
                                ease: [0.22, 1, 0.36, 1],
                              },
                            }),
                          }}
                          initial="hidden"
                          whileInView="show"
                          viewport={{ once: true, amount: 0.35 }}
                          className="group relative overflow-hidden rounded-[28px] border border-white/12 bg-black/60 p-6 transition duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:bg-black/70"
                        >
                          <div
                            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.glow} opacity-0 transition duration-500 group-hover:opacity-100`}
                          />

                          <div className="relative z-10">
                            <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-white/90">
                              <Icon className="h-5 w-5" />
                            </div>

                            <p className="mt-4 text-xl font-semibold text-white">
                              {item.title}
                            </p>

                            <p className="mt-3 text-sm leading-7 text-white/58">
                              {item.text}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </section>

          {/* SECOND STORY BLOCK: TEXT FIRST CENTERED, THEN RIGHT SIDE CONTENT SHOWS */}
          <section className="mx-auto max-w-[1520px] px-6 py-24 md:px-10 md:py-32">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.45 }}
              variants={fadeUp}
              className="mx-auto max-w-4xl text-center"
            >
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                AI tutoring
              </p>

              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                Academic help that feels built into the platform.
              </h2>

              <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/60 md:text-lg">
                Learners can ask questions, request summaries, and generate revision
                help without leaving their course flow.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.985 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.28 }}
              transition={{
                duration: 0.85,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mx-auto mt-14 max-w-[1380px] rounded-[40px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl md:p-8"
            >
              <div className="grid items-center gap-8 xl:grid-cols-[0.74fr_1.26fr]">
                <div className="space-y-3">
                  {[
                    "Context-aware AI chat",
                    "Summaries in seconds",
                    "Revision help inside the lesson",
                    "No need to leave the platform",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-white/74 transition duration-300 hover:border-white/15 hover:bg-white/[0.03]"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="rounded-[30px] border border-white/10 bg-[#060606] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                        AI Tutor
                      </p>
                      <p className="mt-2 text-lg font-medium text-white/90">
                        Context-aware conversation
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45">
                      Online
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="max-w-[72%] rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/75">
                      Explain this lesson in simple terms.
                    </div>
                    <div className="ml-auto max-w-[84%] rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-white/90">
                      This topic explains how a neural network learns from
                      mistakes and improves its predictions over time.
                    </div>
                    <div className="max-w-[65%] rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/75">
                      Give me 3 revision questions.
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/45">
                    Ask anything about your course...
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* ROLES: CENTERED TEXT FIRST, THEN PANELS SHOW ONE BY ONE */}
          <section
            id="roles"
            className="mx-auto max-w-[1520px] px-6 py-20 md:px-10 md:py-30"
          >
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.45 }}
              variants={fadeUp}
              className="mx-auto max-w-4xl text-center"
            >
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                Built for every academic role
              </p>

              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                One platform, three focused experiences.
              </h2>

              <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/60 md:text-lg">
                The experience changes based on who is using it, so students,
                teachers, and institutions each get what actually matters to
                them.
              </p>
            </motion.div>

            <div className="mt-16 space-y-8">
              {rolePanels.map((role, i) => (
                <motion.div
                  key={role.title}
                  initial={{ opacity: 0, y: 60, scale: 0.985 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.28 }}
                  transition={{
                    duration: 0.85,
                    delay: i * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`group relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br ${role.accent} backdrop-blur-xl transition duration-300 hover:border-white/15`}
                >
                  <div className="grid items-center gap-8 p-7 lg:grid-cols-[0.92fr_1.08fr] lg:p-10">
                    <div className="max-w-2xl">
                      <p className="text-xs uppercase tracking-[0.24em] text-white/35">
                        {role.label}
                      </p>

                      <h3 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                        {role.title}
                      </h3>

                      <p className="mt-5 text-base leading-8 text-white/60">
                        {role.description}
                      </p>

                      <div className="mt-7 space-y-4">
                        {role.points.map((point) => (
                          <div key={point} className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-white/75" />
                            <span className="text-base text-white/76">
                              {point}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[30px] border border-white/10 bg-black/45 p-5 md:p-6">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                          Role snapshot
                        </p>
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/45">
                          Live
                        </span>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        {role.stats.map((stat) => (
                          <div
                            key={stat.label}
                            className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                          >
                            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                              {stat.label}
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                              {stat.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 rounded-[26px] border border-white/10 bg-white/[0.02] p-4">
                        <MiniChart />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* TEACHER INTELLIGENCE: TEXT FIRST CENTERED, THEN BLOCK SHOWS */}
          <section className="mx-auto max-w-[1520px] px-6 py-10 md:px-10 md:py-16">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.45 }}
              variants={fadeUp}
              className="mx-auto max-w-4xl text-center"
            >
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                Teaching intelligence
              </p>

              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                Signals that help teachers act faster.
              </h2>

              <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/60 md:text-lg">
                Instead of noisy dashboards, teachers get the signals that
                actually matter: risk, engagement, completion, and what to do next.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.985 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.28 }}
              transition={{
                duration: 0.85,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mx-auto mt-14 max-w-[1380px] rounded-[40px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl md:p-8"
            >
              <div className="grid items-center gap-8 xl:grid-cols-[1.18fr_0.82fr]">
                <div className="rounded-[30px] border border-white/10 bg-[#060606] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Teacher Insights
                      </p>
                      <p className="mt-2 text-lg font-medium text-white/90">
                        Class health overview
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45">
                      Live
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    {[
                      { label: "Engagement", value: "89%" },
                      { label: "Completion", value: "76%" },
                      { label: "At risk", value: "07" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                      >
                        <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                          {item.label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-4">
                    <div className="flex h-32 items-end gap-3">
                      {[34, 48, 42, 67, 55, 73, 61].map((h, idx) => (
                        <div key={idx} className="flex h-full flex-1 items-end">
                          <div
                            style={{ height: `${h}%` }}
                            className="w-full rounded-full bg-white/90"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    "See at-risk learners faster",
                    "Understand lesson performance",
                    "Act on classroom signals with less friction",
                    "Reduce dashboard overload",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-white/74 transition duration-300 hover:border-white/15 hover:bg-white/[0.03]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </section>

          {/* LOWER PART ADJUSTED */}
          <section className="mx-auto max-w-[1520px] px-6 py-20 md:px-10 md:py-24">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              className="rounded-[40px] border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl md:p-10"
            >
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-xs uppercase tracking-[0.26em] text-white/40">
                  Platform impact
                </p>
                <h3 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                  Built to improve learning flow, teaching clarity, and academic visibility.
                </h3>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-4">
                {impactStats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.25 }}
                    className="rounded-[24px] border border-white/10 bg-black/40 p-6 transition duration-300 hover:border-white/15 hover:bg-white/[0.03]"
                  >
                    <p className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                      {stat.value}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-white/55">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* FINAL CTA */}
          <section
            id="preview"
            className="mx-auto max-w-[1520px] px-6 pb-24 pt-2 md:px-10 md:pb-32"
          >
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              className="relative overflow-hidden rounded-[42px] border border-white/10 bg-white/[0.045] p-8 backdrop-blur-2xl md:p-12"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.14),transparent_28%)]" />

              <div className="relative z-10 mx-auto max-w-4xl text-center">
                <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                  Final call to action
                </p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  Build a smarter academic experience with one elegant platform.
                </h2>
                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/60 md:text-lg">
                  Bring AI support, modern learning workflows, teacher tools,
                  and institutional clarity together in a product designed to
                  feel modern from the first interaction.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <button className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition duration-300 hover:bg-white/90">
                    Request Demo
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white transition duration-300 hover:border-white/20 hover:bg-white/[0.08]">
                    Explore Platform
                  </button>
                </div>
              </div>
            </motion.div>
          </section>
        </main>
      </div>
    </div>
  );
}