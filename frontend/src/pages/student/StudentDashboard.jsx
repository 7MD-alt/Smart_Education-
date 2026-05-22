import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import {
  BookOpen, CheckCircle, XCircle, Clock,
  MessageSquare, AlertTriangle, TrendingUp, ArrowUpRight,
} from "lucide-react";

/* ── Attendance ring ─────────────────────────────────────────── */
const AttendanceRing = ({ rate = 0 }) => {
  const r     = 48;
  const circ  = 2 * Math.PI * r;
  const filled = (rate / 100) * circ;
  const color  = rate >= 75 ? "#4ade80" : rate >= 50 ? "#fbbf24" : "#f87171";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.7s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold" style={{ color: "var(--text-1)" }}>{rate}%</span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Rate</span>
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--text-2)" }}>Overall attendance</p>
    </div>
  );
};

/* ── Stat card ───────────────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, danger, sub }) => (
  <div
    className="rounded-[var(--radius-lg)] p-5 transition-colors duration-150"
    style={{
      border: `1px solid ${danger ? "rgba(185,28,28,0.3)" : "var(--border)"}`,
      background: danger ? "rgba(185,28,28,0.06)" : "var(--surface)",
    }}
  >
    <div className="flex items-center justify-between">
      <p className="label" style={{ color: danger ? "var(--red-fg)" : undefined }}>{label}</p>
      <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)]"
           style={{ background: danger ? "rgba(185,28,28,0.15)" : "var(--surface-2)" }}>
        <Icon className={`h-4 w-4 ${danger ? "text-red-400" : ""}`}
              style={{ color: danger ? undefined : "var(--text-3)" }} />
      </div>
    </div>
    <p className={`mt-3 text-3xl font-semibold tracking-tight ${danger ? "text-red-300" : ""}`}
       style={{ color: danger ? undefined : "var(--text-1)" }}>
      {value ?? "—"}
    </p>
    {sub && <p className="mt-0.5 text-xs" style={{ color: "var(--text-3)" }}>{sub}</p>}
  </div>
);

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
      const raw = c.data;
      setCourses(Array.isArray(raw) ? raw : raw.results || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const firstName = user?.first_name || user?.username || "Student";

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header">
          <div>
            <p className="label">Student Portal</p>
            <h1 className="page-title mt-1">Welcome back, {firstName}</h1>
            {profile?.filiere && (
              <p className="page-sub">{profile.filiere.name} · Semester {profile.semester}</p>
            )}
          </div>
          <Link to="/student/chat">
            <button className="btn-violet gap-1.5">
              <MessageSquare className="h-4 w-4" /> Ask AI Tutor
            </button>
          </Link>
        </div>

        {/* Stats */}
        {!loading && stats && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Enrolled Courses"  value={stats.courses}            icon={BookOpen}     sub="This semester" />
            <StatCard label="Total Sessions"    value={stats.attendance_records} icon={TrendingUp}   sub="All records" />
            <StatCard label="Absences"          value={stats.absences}           icon={XCircle}      danger={stats.absences > 0} sub="Marked absent" />
            <StatCard label="AI Chat Sessions"  value={stats.chat_sessions}      icon={MessageSquare} sub="With AI Tutor" />
          </div>
        )}

        {/* Attendance summary */}
        {summary && (
          <div className="grid gap-5 lg:grid-cols-3">

            {/* Ring */}
            <div className="card flex items-center justify-center py-8">
              <AttendanceRing rate={summary.attendance_rate ?? 0} />
            </div>

            {/* Breakdown */}
            <div className="card">
              <p className="label mb-4">Breakdown</p>
              <div className="space-y-2.5">
                {[
                  { label: "Present", value: summary.present, icon: CheckCircle, color: "text-green-400",
                    bg: "rgba(21,128,61,0.08)", border: "rgba(21,128,61,0.2)" },
                  { label: "Absent",  value: summary.absent,  icon: XCircle,     color: "text-red-400",
                    bg: "rgba(185,28,28,0.08)", border: "rgba(185,28,28,0.2)" },
                  { label: "Late",    value: summary.late,    icon: Clock,       color: "text-amber-400",
                    bg: "rgba(180,83,9,0.08)", border: "rgba(180,83,9,0.2)" },
                ].map(({ label, value, icon: Icon, color, bg, border }) => (
                  <div key={label}
                       className={`flex items-center justify-between rounded-[var(--radius)] px-4 py-3`}
                       style={{ background: bg, border: `1px solid ${border}` }}>
                    <div className={`flex items-center gap-2 text-sm font-medium ${color}`}>
                      <Icon className="h-4 w-4" /> {label}
                    </div>
                    <span className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* At-risk */}
            <div className="card">
              <p className="label mb-4 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> At-risk Courses
              </p>
              {!summary.danger_courses?.length ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full"
                       style={{ background: "rgba(21,128,61,0.1)" }}>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-green-400">You're all good!</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>No attendance issues found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.danger_courses.map((c) => {
                    const isDanger = c.status === "DANGER";
                    return (
                      <div key={c.course_id}
                           className="rounded-[var(--radius)] p-3"
                           style={{
                             background: isDanger ? "rgba(185,28,28,0.08)" : "rgba(180,83,9,0.08)",
                             border: `1px solid ${isDanger ? "rgba(185,28,28,0.2)" : "rgba(180,83,9,0.2)"}`,
                           }}>
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${isDanger ? "text-red-300" : "text-amber-300"}`}>
                            {c.course_title}
                          </p>
                          <span className={`badge shrink-0 ${isDanger ? "badge-red" : "badge-amber"}`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="mb-1 flex justify-between text-xs" style={{ color: "var(--text-3)" }}>
                            <span>Absences</span><span>{c.absences}/{c.max_absences}</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div
                              className={`h-1.5 rounded-full ${isDanger ? "bg-red-400" : "bg-amber-400"}`}
                              style={{ width: `${Math.min((c.absences / c.max_absences) * 100, 100)}%` }}
                            />
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
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>My Courses</h2>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-3)" }}
            >
              {courses.length} {courses.length !== 1 ? "courses" : "course"}
            </span>
          </div>

          {!loading && courses.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-3)" }}>No courses found for this semester.</p>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => {
              const risk = summary?.danger_courses?.find(d => d.course_id === course.id);
              return (
                <div
                  key={course.id}
                  className="rounded-[var(--radius-lg)] p-5 transition-colors duration-150"
                  style={{
                    border: `1px solid ${risk ? "rgba(185,28,28,0.25)" : "var(--border)"}`,
                    background: risk ? "rgba(185,28,28,0.05)" : "var(--surface)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = risk ? "rgba(185,28,28,0.4)" : "var(--border-hover)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = risk ? "rgba(185,28,28,0.25)" : "var(--border)"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)]"
                         style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                      <BookOpen className="h-4 w-4" style={{ color: "var(--text-3)" }} />
                    </div>
                    {risk && (
                      <span className={`badge shrink-0 ${risk.status === "DANGER" ? "badge-red" : "badge-amber"}`}>
                        {risk.status}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-sm font-semibold" style={{ color: "var(--text-1)" }}>{course.title}</h3>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-3)" }}>
                    {course.teacher?.user
                      ? `${course.teacher.user.first_name} ${course.teacher.user.last_name}`.trim() || course.teacher.user.username
                      : "—"}
                  </p>

                  {risk && (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[10px]" style={{ color: "var(--text-3)" }}>
                        <span>Absences</span><span>{risk.absences}/{risk.max_absences}</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div
                          className={`h-1 rounded-full ${risk.status === "DANGER" ? "bg-red-400" : "bg-amber-400"}`}
                          style={{ width: `${Math.min((risk.absences / risk.max_absences) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Link to={`/student/courses/${course.id}/chat`}>
                      <button className="btn-violet px-3 py-1.5 text-xs">Ask AI</button>
                    </Link>
                    <Link to={`/student/courses/${course.id}/attendance`}>
                      <button className="btn-ghost px-3 py-1.5 text-xs">Attendance</button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;