import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  BookOpen, FileStack, Users, CalendarCheck,
  ScanLine, AlertTriangle, TrendingUp, CheckCircle2,
  XCircle, Clock, ArrowUpRight,
} from "lucide-react";

/* ── Glow stat card ──────────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, accent, glow, delay = 0 }) => (
  <div className="stat-card fade-up group" style={{ animationDelay: `${delay}ms` }}>
    <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-full"
         style={{ background: glow, filter: "blur(24px)", opacity: 0.6 }} />
    <div className="relative flex items-start justify-between">
      <p className="stat-label">{label}</p>
      <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] transition-transform duration-200 group-hover:scale-110"
           style={{ background: glow, border: `1px solid ${accent}30` }}>
        <Icon className="h-4 w-4" style={{ color: accent, filter: `drop-shadow(0 0 4px ${accent})` }} />
      </div>
    </div>
    <p className="stat-value relative count-enter" style={{ animationDelay: `${delay + 80}ms` }}>{value ?? "—"}</p>
  </div>
);

/* ── Course card with glow accent bar ────────────────────────── */
const PALETTE = [
  { accent: "#22d3ee", glow: "rgba(8,145,178,0.15)"   },
  { accent: "#a78bfa", glow: "rgba(124,58,237,0.15)"  },
  { accent: "#fbbf24", glow: "rgba(180,83,9,0.15)"    },
  { accent: "#4ade80", glow: "rgba(21,128,61,0.15)"   },
  { accent: "#f472b6", glow: "rgba(190,24,93,0.15)"   },
];

const CourseCard = ({ course, index }) => {
  const { accent, glow } = PALETTE[index % PALETTE.length];

  return (
    <Link to="/teacher/courses" className="block fade-up" style={{ animationDelay: `${index * 60}ms` }}>
      <div
        className="group relative overflow-hidden rounded-[var(--radius-lg)] p-5 transition-all duration-200 cursor-pointer"
        style={{ border: `1px solid var(--border)`, background: "var(--surface)" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.boxShadow = `0 4px 24px ${glow}`; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        {/* Accent top line */}
        <div className="absolute inset-x-0 top-0 h-0.5 transition-all duration-300"
             style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.7 }} />

        {/* Background glow orb */}
        <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full"
             style={{ background: glow, filter: "blur(30px)", opacity: 0.5 }} />

        <div className="relative flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)]"
               style={{ background: glow, border: `1px solid ${accent}30` }}>
            <BookOpen className="h-4 w-4" style={{ color: accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold leading-snug" style={{ color: "var(--text-1)" }}>{course.title}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "var(--text-3)" }}>
              <AlertTriangle className="h-3 w-3" /> Max {course.max_absences} absences
            </p>
          </div>
          <ArrowUpRight
            className="h-4 w-4 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{ color: accent }}
          />
        </div>
      </div>
    </Link>
  );
};

/* ── Attendance summary row ──────────────────────────────────── */
const SummaryPill = ({ label, value, color, icon: Icon, glow }) => (
  <div className="flex items-center gap-3 rounded-[var(--radius-lg)] p-4 transition-all duration-150"
       style={{ border: `1px solid ${color}30`, background: glow }}>
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)]"
         style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
      <Icon className="h-4 w-4" style={{ color, filter: `drop-shadow(0 0 4px ${color})` }} />
    </div>
    <div>
      <p className="label">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  </div>
);

/* ── Main ────────────────────────────────────────────────────── */
const TeacherDashboard = () => {
  const { user } = useAuth();
  const toast    = useToast();

  const [stats,   setStats]   = useState(null);
  const [summary, setSummary] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchSummary(), fetchCourses()]).finally(() => setLoading(false));
  }, []);

  const fetchStats   = async () => { try { const r = await axiosClient.get("teacher/stats/");              setStats(r.data); } catch { toast.error("Failed to load stats."); } };
  const fetchSummary = async () => { try { const r = await axiosClient.get("teacher/attendance-summary/"); setSummary(r.data); } catch { /* non-critical */ } };
  const fetchCourses = async () => {
    try {
      const r = await axiosClient.get("me/courses/");
      setCourses(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch { toast.error("Failed to load courses."); }
  };

  const firstName = user?.first_name || user?.username || "Teacher";

  const STATS = stats ? [
    { label: "Courses",   value: stats.courses,            icon: BookOpen,      accent: "#22d3ee", glow: "rgba(8,145,178,0.15)",  delay: 0   },
    { label: "Materials", value: stats.materials,          icon: FileStack,     accent: "#a78bfa", glow: "rgba(124,58,237,0.15)", delay: 60  },
    { label: "Students",  value: stats.students,           icon: Users,         accent: "#4ade80", glow: "rgba(21,128,61,0.15)",  delay: 120 },
    { label: "Records",   value: stats.attendance_records, icon: CalendarCheck, accent: "#fbbf24", glow: "rgba(180,83,9,0.15)",   delay: 180 },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header fade-up">
          <div>
            <p className="label mb-1">Teacher Portal</p>
            <h1 className="page-title">
              Good day,{" "}
              <span style={{
                background: "linear-gradient(135deg, #22d3ee, #a78bfa)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{firstName}</span>
            </h1>
            <p className="page-sub">Manage your courses, materials, and attendance.</p>
          </div>
          <Link to="/teacher/scan">
            <button className="btn-cyan gap-1.5">
              <ScanLine className="h-4 w-4" /> Live Scan
            </button>
          </Link>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-[var(--radius-lg)]" />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 stagger">
            {STATS.map(s => <StatCard key={s.label} {...s} />)}
          </div>
        )}

        {/* Attendance summary */}
        {summary && (
          <div className="card fade-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Attendance Overview</h2>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-2xl font-bold tabular-nums"
                      style={{ color: summary.attendance_rate >= 75 ? "#4ade80" : summary.attendance_rate >= 50 ? "#fbbf24" : "#f87171" }}>
                  {summary.attendance_rate}%
                </span>
                <span className="text-xs" style={{ color: "var(--text-3)" }}>overall rate</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
              <SummaryPill label="Present" value={summary.present} icon={CheckCircle2} color="#4ade80" glow="rgba(21,128,61,0.08)"  />
              <SummaryPill label="Absent"  value={summary.absent}  icon={XCircle}      color="#f87171" glow="rgba(185,28,28,0.08)" />
              <SummaryPill label="Late"    value={summary.late}    icon={Clock}        color="#fbbf24" glow="rgba(180,83,9,0.08)"  />
              <SummaryPill label="Total"   value={summary.total_records} icon={CalendarCheck} color="#a78bfa" glow="rgba(124,58,237,0.08)" />
            </div>

            {/* Rate progress */}
            <div className="progress-track">
              <div className="progress-fill"
                   style={{
                     width: `${summary.attendance_rate}%`,
                     background: `linear-gradient(90deg, ${summary.attendance_rate >= 75 ? "#15803d" : summary.attendance_rate >= 50 ? "#b45309" : "#b91c1c"}, ${summary.attendance_rate >= 75 ? "#4ade80" : summary.attendance_rate >= 50 ? "#fbbf24" : "#f87171"})`,
                     boxShadow: `0 0 8px ${summary.attendance_rate >= 75 ? "#4ade8060" : "#f8717160"}`,
                   }} />
            </div>
          </div>
        )}

        {/* Courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>My Courses</h2>
            <span className="badge badge-cyan">{courses.length} {courses.length === 1 ? "course" : "courses"}</span>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-40 rounded-[var(--radius-lg)]" />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="empty-state">
              <BookOpen className="h-8 w-8" style={{ color: "var(--text-3)" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>No courses yet</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Contact your administrator to get courses assigned.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course, i) => <CourseCard key={course.id} course={course} index={i} />)}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
