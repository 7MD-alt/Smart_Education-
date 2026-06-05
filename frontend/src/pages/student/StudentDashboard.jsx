import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import {
  BookOpen, CheckCircle, XCircle, Clock,
  MessageSquare, AlertTriangle, TrendingUp, ArrowUpRight,
  Folder,
} from "lucide-react";

/* ── Glowing attendance ring ─────────────────────────────────── */
const AttendanceRing = ({ rate = 0 }) => {
  const r     = 52;
  const circ  = 2 * Math.PI * r;
  const filled = (rate / 100) * circ;
  const color  = rate === 0 || rate >= 75 ? "#4ade80" : rate >= 50 ? "#fbbf24" : "#f87171";
  const shadow = rate === 0 || rate >= 75 ? "rgba(74,222,128,0.3)" : rate >= 50 ? "rgba(251,191,36,0.3)" : "rgba(248,113,113,0.3)";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 130, height: 130 }}>
        {/* Glow effect behind ring */}
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 40px ${shadow}`, opacity: 0.4 }} />
        <svg width="130" height="130" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
          <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle
            cx="65" cy="65" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
            style={{
              transition: "stroke-dasharray 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)",
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular-nums" style={{ fontSize: "1.75rem", fontWeight: 750, letterSpacing: "-0.04em", lineHeight: 1, color }}>{rate}%</span>
          <span className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "var(--text-3)" }}>Rate</span>
        </div>
      </div>
      <p className="text-xs font-medium" style={{ color: "var(--text-2)" }}>Overall Attendance</p>
    </div>
  );
};

/* ── Stat card ───────────────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, danger, sub, accent, glow, delay = 0 }) => {
  const a  = danger ? "#f87171" : (accent || "#a78bfa");
  const g  = danger ? "rgba(185,28,28,0.18)" : (glow || "rgba(124,58,237,0.15)");
  const bc = danger ? "rgba(185,28,28,0.3)" : `${a}22`;
  return (
    <div
      className="spotlight relative overflow-hidden rounded-[var(--radius-lg)] p-6 fade-up group"
      style={{
        border: `1px solid ${bc}`,
        background: "var(--surface)",
        backdropFilter: "blur(20px)",
        animationDelay: `${delay}ms`,
        transition: "border-color 220ms, box-shadow 220ms, transform 220ms",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${a}45`;
        e.currentTarget.style.boxShadow = `0 0 50px ${g}, 0 8px 32px rgba(0,0,0,0.4)`;
        e.currentTarget.style.transform = "translateY(-3px)";
        const bar = e.currentTarget.querySelector("[data-accent-bar]");
        if (bar) bar.style.transform = "scaleX(1)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = bc;
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "none";
        const bar = e.currentTarget.querySelector("[data-accent-bar]");
        if (bar) bar.style.transform = "scaleX(0)";
      }}
    >
      {/* Glow blob */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full"
        style={{ background: `radial-gradient(circle, ${a}30 0%, transparent 70%)`, filter: "blur(18px)" }} />
      {/* Bottom bar — slides in on hover */}
      <div data-accent-bar className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${a}60, transparent)`,
          transform: "scaleX(0)", transformOrigin: "left",
          transition: "transform 400ms cubic-bezier(0.16,1,0.3,1)",
        }} />

      <div className="relative flex items-start justify-between mb-4">
        <p className="label" style={{ color: danger ? "#f87171" : undefined }}>{label}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
          style={{ background: `linear-gradient(135deg, ${a}25, ${a}10)`, border: `1px solid ${a}35`, boxShadow: `0 0 14px ${a}20` }}>
          <Icon className="h-5 w-5" style={{ color: a, filter: `drop-shadow(0 0 4px ${a})` }} />
        </div>
      </div>
      <p className="count-enter relative" style={{
        fontSize: "2.4rem", fontWeight: 750, letterSpacing: "-0.05em",
        color: a, lineHeight: 1, animationDelay: `${delay + 80}ms`,
        textShadow: `0 0 32px ${a}65`,
      }}>
        {value ?? "—"}
      </p>
      {sub && <p className="mt-2 text-xs" style={{ color: "var(--text-3)" }}>{sub}</p>}
    </div>
  );
};

/* ── Course card ─────────────────────────────────────────────── */
const PALETTE = [
  { accent: "#a78bfa", glow: "rgba(124,58,237,0.15)"  },
  { accent: "#22d3ee", glow: "rgba(8,145,178,0.15)"   },
  { accent: "#4ade80", glow: "rgba(21,128,61,0.15)"   },
  { accent: "#fbbf24", glow: "rgba(180,83,9,0.15)"    },
  { accent: "#f472b6", glow: "rgba(190,24,93,0.15)"   },
];

const CourseCard = ({ course, risk, index }) => {
  const { accent, glow } = risk ? { accent: "#f87171", glow: "rgba(185,28,28,0.14)" } : PALETTE[index % PALETTE.length];
  return (
    <div
      className="spotlight group relative overflow-hidden rounded-[var(--radius-lg)] p-5 fade-up"
      style={{
        border: `1px solid ${risk ? "rgba(185,28,28,0.25)" : `${accent}18`}`,
        background: "var(--surface)", backdropFilter: "blur(20px)",
        animationDelay: `${index * 60}ms`,
        transition: "border-color 220ms, box-shadow 220ms, transform 220ms",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${accent}45`;
        e.currentTarget.style.boxShadow = `0 0 40px ${glow.replace("0.14","0.18")}, 0 8px 32px rgba(0,0,0,0.4)`;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = risk ? "rgba(185,28,28,0.25)" : `${accent}18`;
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "none";
      }}
    >
      {/* Accent top line */}
      <div className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full"
        style={{ background: `radial-gradient(circle, ${accent}25 0%, transparent 70%)`, filter: "blur(20px)" }} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)]"
             style={{ background: glow, border: `1px solid ${accent}30` }}>
          <BookOpen className="h-4 w-4" style={{ color: accent }} />
        </div>
        {risk && <span className={`badge shrink-0 ${risk.status === "DANGER" ? "badge-red" : "badge-amber"}`}>{risk.status}</span>}
      </div>

      <h3 className="relative mt-3 text-sm font-semibold" style={{ color: "var(--text-1)" }}>{course.title}</h3>
      <p className="relative mt-0.5 text-xs" style={{ color: "var(--text-3)" }}>
        {course.teacher?.user
          ? `${course.teacher.user.first_name} ${course.teacher.user.last_name}`.trim() || course.teacher.user.username
          : "—"}
      </p>

      {risk && (
        <div className="relative mt-3">
          <div className="mb-1 flex justify-between text-[10px]" style={{ color: "var(--text-3)" }}>
            <span>Absences</span><span>{risk.absences}/{risk.max_absences}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill"
                 style={{
                   width: `${Math.min((risk.absences / risk.max_absences) * 100, 100)}%`,
                   background: risk.status === "DANGER" ? "linear-gradient(90deg, #b91c1c, #f87171)" : "linear-gradient(90deg, #b45309, #fbbf24)",
                   boxShadow: risk.status === "DANGER" ? "0 0 6px #f8717150" : "0 0 6px #fbbf2450",
                 }} />
          </div>
        </div>
      )}

      <div className="relative mt-4 flex flex-wrap gap-2">
        <Link to={`/student/courses/${course.id}/chat`}>
          <button className="btn-violet px-3 py-1.5 text-xs gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Ask AI
          </button>
        </Link>
        <Link to={`/student/courses/${course.id}/materials`}>
          <button className="btn-ghost px-3 py-1.5 text-xs gap-1.5">
            <Folder className="h-3.5 w-3.5" /> Materials
          </button>
        </Link>
        <Link to={`/student/courses/${course.id}/attendance`}>
          <button className="btn-ghost px-3 py-1.5 text-xs">Attendance</button>
        </Link>
      </div>
    </div>
  );
};

/* ── Main ────────────────────────────────────────────────────── */
const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const toast             = useToast();
  const [stats,   setStats]   = useState(null);
  const [summary, setSummary] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [s, sm, c] = await Promise.all([
        axiosClient.get("student/stats/"),
        axiosClient.get("student/attendance-summary/"),
        axiosClient.get("me/courses/"),
      ]);
      setStats(s.data);
      setSummary(sm.data);
      setCourses(Array.isArray(c.data) ? c.data : c.data.results || []);
    } catch (err) { console.error(err); toast.error("Failed to load dashboard data."); }
    finally { setLoading(false); }
  };

  const firstName = user?.first_name || user?.username || "Student";

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header fade-up">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 max-w-[40px]"
                style={{ background: "linear-gradient(90deg, rgba(167,139,250,0.5), transparent)" }} />
              <p className="label">Student Portal</p>
            </div>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 750, letterSpacing: "-0.04em", color: "#f0f0ff", lineHeight: 1.1 }}>
              Welcome,{" "}
              <span style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #67e8f9 60%, #22d3ee 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{firstName}</span>
            </h1>
            {profile?.filiere && (
              <p className="page-sub mt-2">{profile.filiere.name} · Semester {profile.semester}</p>
            )}
          </div>
          <Link to="/student/chat">
            <button className="btn-violet gap-1.5">
              <MessageSquare className="h-4 w-4" /> Ask AI Tutor
            </button>
          </Link>
        </div>

        {/* Stat cards */}
        {!loading && stats && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 stagger">
            <StatCard label="Enrolled Courses"  value={stats.courses}            icon={BookOpen}      sub="This semester"  accent="#22d3ee" glow="rgba(8,145,178,0.15)"   delay={0}   />
            <StatCard label="Total Sessions"    value={stats.attendance_records} icon={TrendingUp}    sub="All records"    accent="#a78bfa" glow="rgba(124,58,237,0.15)"  delay={60}  />
            <StatCard label="Absences"          value={stats.absences}           icon={XCircle}       sub="Marked absent"  danger={stats.absences > 0}                    delay={120} />
            <StatCard label="AI Chat Sessions"  value={stats.chat_sessions}      icon={MessageSquare} sub="With AI Tutor"  accent="#f472b6" glow="rgba(190,24,93,0.15)"   delay={180} />
          </div>
        )}

        {/* Attendance summary */}
        {summary && (
          <div className="grid gap-5 lg:grid-cols-3 fade-up" style={{ animationDelay: "200ms" }}>
            {/* Ring */}
            <div className="card spotlight flex items-center justify-center py-8">
              <AttendanceRing rate={summary.attendance_rate ?? 0} />
            </div>

            {/* Breakdown */}
            <div className="card spotlight">
              <p className="label mb-4">Session Breakdown</p>
              <div className="space-y-2.5">
                {[
                  { label: "Present", value: summary.present, icon: CheckCircle, accent: "#4ade80", glow: "rgba(21,128,61,0.12)"  },
                  { label: "Absent",  value: summary.absent,  icon: XCircle,     accent: "#f87171", glow: "rgba(185,28,28,0.12)" },
                  { label: "Late",    value: summary.late,    icon: Clock,       accent: "#fbbf24", glow: "rgba(180,83,9,0.12)"  },
                ].map(({ label, value, icon: Icon, accent, glow }) => (
                  <div key={label} className="flex items-center justify-between rounded-[var(--radius)] px-4 py-3 transition-all duration-150"
                       style={{ background: glow, border: `1px solid ${accent}25` }}>
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: accent }}>
                      <Icon className="h-4 w-4" style={{ filter: `drop-shadow(0 0 4px ${accent})` }} /> {label}
                    </div>
                    <span className="tabular-nums" style={{ fontSize: "1.375rem", fontWeight: 750, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--text-1)" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* At-risk courses */}
            <div className="card spotlight">
              <p className="label mb-4 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" style={{ filter: "drop-shadow(0 0 4px #f87171)" }} /> At-risk Courses
              </p>
              {!summary.danger_courses?.length ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full"
                       style={{ background: "rgba(21,128,61,0.12)", border: "1px solid rgba(74,222,128,0.2)", boxShadow: "0 0 20px rgba(74,222,128,0.1)" }}>
                    <CheckCircle className="h-5 w-5 text-green-400" style={{ filter: "drop-shadow(0 0 6px #4ade80)" }} />
                  </div>
                  <p className="text-sm font-semibold text-green-400">You're all good!</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>No attendance issues found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.danger_courses.map((c) => {
                    const isDanger = c.status === "DANGER";
                    return (
                      <div key={c.course_id} className="rounded-[var(--radius)] p-3 transition-all duration-150"
                           style={{
                             background: isDanger ? "rgba(185,28,28,0.08)" : "rgba(180,83,9,0.08)",
                             border: `1px solid ${isDanger ? "rgba(185,28,28,0.25)" : "rgba(180,83,9,0.25)"}`,
                           }}>
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${isDanger ? "text-red-300" : "text-amber-300"}`}>{c.course_title}</p>
                          <span className={`badge shrink-0 ${isDanger ? "badge-red" : "badge-amber"}`}>{c.status}</span>
                        </div>
                        <div className="mt-2">
                          <div className="mb-1 flex justify-between text-xs" style={{ color: "var(--text-3)" }}>
                            <span>Absences</span><span>{c.absences}/{c.max_absences}</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill"
                                 style={{
                                   width: `${Math.min((c.absences / c.max_absences) * 100, 100)}%`,
                                   background: isDanger ? "linear-gradient(90deg, #b91c1c, #f87171)" : "linear-gradient(90deg, #b45309, #fbbf24)",
                                   boxShadow: isDanger ? "0 0 6px #f8717150" : "0 0 6px #fbbf2450",
                                 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Courses */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 style={{ fontSize: "0.8125rem", fontWeight: 650, letterSpacing: "-0.01em", color: "var(--text-1)" }}>My Courses</h2>
            <span className="badge badge-violet">{courses.length} {courses.length !== 1 ? "courses" : "course"}</span>
          </div>

          {!loading && courses.length === 0 && (
            <div className="empty-state">
              <BookOpen className="h-8 w-8" style={{ color: "var(--text-3)" }} />
              <p className="text-sm" style={{ color: "var(--text-3)" }}>No courses found for this semester.</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course, i) => {
              const risk = summary?.danger_courses?.find(d => d.course_id === course.id);
              return <CourseCard key={course.id} course={course} risk={risk} index={i} />;
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;