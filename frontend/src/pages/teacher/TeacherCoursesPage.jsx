import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  BookOpen, Search, AlertTriangle, ClipboardList,
  Folder, Download, Loader2, Users, FileStack,
  ArrowUpRight, Shield, CalendarCheck,
} from "lucide-react";

// ── Colour palette cycled per card ───────────────────────────────────────────
const PALETTE = [
  { accent: "#22d3ee", glow: "rgba(8,145,178,0.15)"  },
  { accent: "#a78bfa", glow: "rgba(124,58,237,0.15)" },
  { accent: "#fbbf24", glow: "rgba(180,83,9,0.15)"   },
  { accent: "#4ade80", glow: "rgba(21,128,61,0.15)"  },
  { accent: "#f472b6", glow: "rgba(190,24,93,0.15)"  },
  { accent: "#fb923c", glow: "rgba(194,65,12,0.15)"  },
];

// ── Single course card ────────────────────────────────────────────────────────
const CourseCard = ({ course, index, onDownload, downloading }) => {
  const { accent, glow } = PALETTE[index % PALETTE.length];

  return (
    <div
      className="group relative overflow-hidden rounded-[var(--radius-lg)] flex flex-col transition-all duration-200"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}45`; e.currentTarget.style.boxShadow = `0 4px 28px ${glow}`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Accent top bar */}
      <div className="absolute inset-x-0 top-0 h-0.5"
           style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.8 }} />

      {/* Background glow orb */}
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full"
           style={{ background: glow, filter: "blur(35px)", opacity: 0.5 }} />

      {/* Card body */}
      <div className="relative flex flex-col flex-1 p-5 gap-4">

        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)]"
               style={{ background: glow, border: `1px solid ${accent}30` }}>
            <BookOpen className="h-5 w-5" style={{ color: accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold leading-snug truncate" style={{ color: "var(--text-1)" }}>
              {course.title}
            </h3>
            {course.filiere_names?.length > 0 && (
              <p className="mt-0.5 text-xs truncate" style={{ color: "var(--text-3)" }}>
                {course.filiere_names.join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Users,    label: "Students",  value: course.student_count  ?? "—" },
            { icon: FileStack, label: "Materials", value: course.material_count ?? "—" },
            { icon: AlertTriangle, label: "Max abs.", value: course.max_absences },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-[var(--radius)] px-3 py-2 text-center"
                 style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <Icon className="h-3.5 w-3.5 mx-auto mb-1" style={{ color: "var(--text-3)" }} />
              <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text-1)" }}>{value}</p>
              <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
          <Link to={`/teacher/courses/${course.id}/seances`} className="flex-1">
            <button className="w-full btn px-3 py-2 text-xs gap-1.5 justify-center text-cyan-400"
                    style={{ border: "1px solid rgba(8,145,178,0.25)", background: "rgba(8,145,178,0.08)" }}>
              <CalendarCheck className="h-3.5 w-3.5" /> Séances
            </button>
          </Link>

          <Link to={`/teacher/courses/${course.id}/attendance`} className="flex-1">
            <button className="w-full btn-ghost px-3 py-2 text-xs gap-1.5 justify-center">
              <ClipboardList className="h-3.5 w-3.5" /> Manuel
            </button>
          </Link>

          <Link to={`/teacher/courses/${course.id}/materials`} className="flex-1">
            <button className="w-full btn-ghost px-3 py-2 text-xs gap-1.5 justify-center">
              <Folder className="h-3.5 w-3.5" /> Materials
            </button>
          </Link>

          <Link to={`/teacher/courses/${course.id}/danger-zone`} className="flex-1">
            <button className="w-full btn px-3 py-2 text-xs gap-1.5 justify-center text-red-400"
                    style={{ border: "1px solid rgba(185,28,28,0.25)", background: "rgba(185,28,28,0.08)" }}>
              <Shield className="h-3.5 w-3.5" /> Danger
            </button>
          </Link>

          <button
            onClick={() => onDownload(course)}
            disabled={downloading === course.id}
            className="flex-1 btn px-3 py-2 text-xs gap-1.5 justify-center text-green-400 disabled:opacity-40"
            style={{ border: "1px solid rgba(21,128,61,0.25)", background: "rgba(21,128,61,0.08)" }}
          >
            {downloading === course.id
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
              : <><Download className="h-3.5 w-3.5" /> Report</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const TeacherCoursesPage = () => {
  const toast = useToast();
  const [courses,    setCourses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [downloading, setDownloading] = useState(null); // course id being downloaded

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const r = await axiosClient.get("me/courses/");
      setCourses(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch { toast.error("Failed to load courses."); }
    finally { setLoading(false); }
  };

  const downloadReport = async (course) => {
    setDownloading(course.id);
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
      a.href = url;
      a.download = `attendance_${course.title.replace(/\s+/g, "_")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Could not download report."); }
    finally { setDownloading(null); }
  };

  const filtered = courses.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.title?.toLowerCase().includes(s) ||
      c.filiere_names?.some(f => f.toLowerCase().includes(s))
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header">
          <div>
            <p className="label">Teacher</p>
            <h1 className="page-title mt-1">My Courses</h1>
            <p className="page-sub">All courses assigned to you — manage attendance, materials, and reports.</p>
          </div>
        </div>

        {/* Search + count */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 max-w-sm items-center gap-2 rounded-[var(--radius)] px-3 py-2"
               style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-3)" }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search courses or filières…"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: "var(--text-1)" }}
            />
          </div>
          {!loading && (
            <span className="badge badge-cyan">
              {filtered.length} {filtered.length === 1 ? "course" : "courses"}
            </span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-52 rounded-[var(--radius-lg)]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <BookOpen className="h-8 w-8" style={{ color: "var(--text-3)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                {search ? "No courses match your search" : "No courses assigned yet"}
              </p>
              {search
                ? <button onClick={() => setSearch("")} className="text-xs text-cyan-400 mt-1">Clear search</button>
                : <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Contact your administrator to get courses assigned.</p>
              }
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((course, i) => (
              <CourseCard
                key={course.id}
                course={course}
                index={i}
                onDownload={downloadReport}
                downloading={downloading}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherCoursesPage;
