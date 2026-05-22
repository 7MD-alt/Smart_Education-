import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  BookOpen, FileStack, Users, CalendarCheck,
  ScanLine, AlertTriangle, TrendingUp, CheckCircle2,
  XCircle, Clock, Loader2, Download, ClipboardList,
  Folder, ArrowUpRight,
} from "lucide-react";

/* ── Stat card ───────────────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="stat-card">
    <div className="flex items-center justify-between">
      <p className="stat-label">{label}</p>
      <Icon className={`h-4 w-4 ${color}`} style={{ opacity: 0.7 }} />
    </div>
    <p className="stat-value">{value ?? "—"}</p>
  </div>
);

/* ── Mini stat (attendance summary) ─────────────────────────── */
const MiniStat = ({ label, value, color, icon: Icon }) => (
  <div className="flex items-center gap-3">
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)]"
      style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
    >
      <Icon className={`h-4 w-4 ${color}`} style={{ opacity: 0.8 }} />
    </div>
    <div>
      <p className="label">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  </div>
);

/* ── Course card ─────────────────────────────────────────────── */
const ACCENTS = [
  { bar: "bg-cyan-500",   dot: "bg-cyan-400"   },
  { bar: "bg-violet-500", dot: "bg-violet-400" },
  { bar: "bg-amber-500",  dot: "bg-amber-400"  },
  { bar: "bg-green-500",  dot: "bg-green-400"  },
  { bar: "bg-pink-500",   dot: "bg-pink-400"   },
];

const CourseCard = ({ course, index }) => {
  const accent = ACCENTS[index % ACCENTS.length];
  const [downloading, setDownloading] = useState(false);

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `http://127.0.0.1:8000/api/teacher/courses/${course.id}/report/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `attendance_${course.title.replace(/\s+/g, "_")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not download report.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="rounded-[var(--radius-lg)] p-5 transition-colors duration-150"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-hover)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
    >
      {/* Top accent bar */}
      <div className={`-mx-5 -mt-5 mb-4 h-0.5 rounded-t-[var(--radius-lg)] ${accent.bar}`} style={{ opacity: 0.6 }} />

      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${accent.dot}`} />
        <h3 className="text-sm font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
          {course.title}
        </h3>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-3)" }}>
        <AlertTriangle className="h-3 w-3" />
        Max {course.max_absences} absences
      </p>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/teacher/courses/${course.id}/attendance`}>
          <button className="btn-ghost px-3 py-1.5 text-xs gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Attendance
          </button>
        </Link>
        <Link to={`/teacher/courses/${course.id}/danger-zone`}>
          <button className="btn gap-1.5 px-3 py-1.5 text-xs text-red-400"
                  style={{ border: "1px solid rgba(185,28,28,0.25)", background: "rgba(185,28,28,0.08)" }}>
            <AlertTriangle className="h-3.5 w-3.5" /> Danger Zone
          </button>
        </Link>
        <Link to={`/teacher/courses/${course.id}/materials`}>
          <button className="btn-ghost px-3 py-1.5 text-xs gap-1.5">
            <Folder className="h-3.5 w-3.5" /> Materials
          </button>
        </Link>
        <button onClick={downloadReport} disabled={downloading}
                className="btn gap-1.5 px-3 py-1.5 text-xs text-green-400"
                style={{ border: "1px solid rgba(21,128,61,0.25)", background: "rgba(21,128,61,0.08)" }}>
          {downloading
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
            : <><Download className="h-3.5 w-3.5" /> Report</>
          }
        </button>
      </div>
    </div>
  );
};

/* ── Main ────────────────────────────────────────────────────── */
const TeacherDashboard = () => {
  const { user } = useAuth();
  const toast    = useToast();

  const [stats,   setStats]   = useState(null);
  const [summary, setSummary] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchSummary(), fetchCourses()])
      .finally(() => setLoading(false));
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axiosClient.get("teacher/stats/");
      setStats(res.data);
    } catch { toast.error("Failed to load stats."); }
  };

  const fetchSummary = async () => {
    try {
      const res = await axiosClient.get("teacher/attendance-summary/");
      setSummary(res.data);
    } catch { /* non-critical */ }
  };

  const fetchCourses = async () => {
    try {
      const res  = await axiosClient.get("me/courses/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setCourses(data);
    } catch { toast.error("Failed to load courses."); }
  };

  const firstName = user?.first_name || user?.username || "Teacher";

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header">
          <div>
            <p className="label">Teacher Portal</p>
            <h1 className="page-title mt-1">{firstName}</h1>
            <p className="page-sub">Manage courses, materials, and attendance.</p>
          </div>
          <Link to="/teacher/scan">
            <button className="btn-primary gap-1.5">
              <ScanLine className="h-4 w-4" /> Live Attendance Scan
            </button>
          </Link>
        </div>

        {/* Stat cards */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-[var(--radius-lg)]" />)}
          </div>
        ) : stats && (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <StatCard label="Courses"   value={stats.courses}            icon={BookOpen}     color="text-cyan-400"   />
            <StatCard label="Materials" value={stats.materials}          icon={FileStack}    color="text-violet-400" />
            <StatCard label="Students"  value={stats.students}           icon={Users}        color="text-green-400"  />
            <StatCard label="Records"   value={stats.attendance_records} icon={CalendarCheck} color="text-amber-400"  />
          </div>
        )}

        {/* Attendance summary */}
        {summary && (
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-4 w-4" style={{ color: "var(--text-3)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Attendance Overview</h2>
              <span className="ml-auto label">All courses</span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MiniStat label="Rate"    value={`${summary.attendance_rate}%`} color="text-green-400"  icon={TrendingUp}  />
              <MiniStat label="Present" value={summary.present}               color="text-green-400"  icon={CheckCircle2}/>
              <MiniStat label="Absent"  value={summary.absent}                color="text-red-400"    icon={XCircle}     />
              <MiniStat label="Late"    value={summary.late}                  color="text-amber-400"  icon={Clock}       />
            </div>

            {/* Progress bar */}
            <div className="mt-5">
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                <div
                  className="h-1.5 rounded-full bg-green-500 transition-all duration-700"
                  style={{ width: `${summary.attendance_rate}%` }}
                />
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--text-3)" }}>
                {summary.total_records} total records across all courses
              </p>
            </div>
          </div>
        )}

        {/* Courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>My Courses</h2>
            <span className="label">{courses.length} {courses.length === 1 ? "course" : "courses"}</span>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-40 rounded-[var(--radius-lg)]" />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="empty-state">
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)]"
                   style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <BookOpen className="h-5 w-5" style={{ color: "var(--text-3)" }} />
              </div>
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
