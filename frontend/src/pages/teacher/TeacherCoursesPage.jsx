import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { authedFetch } from "../../api/config";
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
      className="group relative overflow-hidden rounded-[var(--radius-lg)] flex flex-col"
      style={{
        border: `1px solid ${accent}18`,
        background: "var(--surface)",
        backdropFilter: "blur(20px)",
        transition: "border-color 220ms, box-shadow 220ms, transform 220ms",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${accent}42`;
        e.currentTarget.style.boxShadow = `0 0 50px ${glow.replace("0.15","0.18")}, 0 8px 32px rgba(0,0,0,0.4)`;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = `${accent}18`;
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "none";
      }}
    >
      {/* Accent top line — full width gradient */}
      <div className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)` }} />

      {/* Glow blob */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full"
        style={{ background: `radial-gradient(circle, ${accent}25 0%, transparent 70%)`, filter: "blur(20px)" }} />

      {/* Body */}
      <div className="relative flex flex-col flex-1 p-6 gap-5">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${accent}26, ${accent}0c)`,
              border: `1px solid ${accent}3a`,
              boxShadow: `0 0 22px ${accent}22`,
            }}>
            <BookOpen className="h-8 w-8" style={{ color: accent, filter: `drop-shadow(0 0 6px ${accent})` }} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-bold leading-snug" style={{ color: "#f0f0ff", letterSpacing: "-0.015em" }}>
              {course.title}
            </h3>
            {course.filiere_names?.length > 0 && (
              <p className="mt-1.5 text-xs" style={{ color: "rgba(110,110,140,0.85)" }}>
                {course.filiere_names.join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* Stats — 3 pills with icons */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Users,         label: "Students",  value: course.student_count  ?? "—", c: accent },
            { icon: FileStack,     label: "Materials", value: course.material_count ?? "—", c: accent },
            { icon: AlertTriangle, label: "Max abs.",  value: course.max_absences,          c: "#fbbf24" },
          ].map(({ icon: Icon, label, value, c }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5"
              style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Icon className="h-5 w-5" style={{ color: c, opacity: 0.9 }} />
              <p className="text-xl font-bold tabular-nums leading-none" style={{ color: c, letterSpacing: "-0.03em" }}>{value}</p>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(90,90,120,0.95)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Primary action */}
        <Link to={`/teacher/courses/${course.id}/seances`} className="block mt-auto">
          <button
            className="w-full rounded-2xl py-3 text-sm font-bold transition-all"
            style={{
              background: `linear-gradient(135deg, ${accent}1e, ${accent}0a)`,
              border: `1px solid ${accent}34`,
              color: accent,
              boxShadow: `0 0 16px ${accent}12`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${accent}26`; e.currentTarget.style.boxShadow = `0 0 26px ${accent}24`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${accent}1e, ${accent}0a)`; e.currentTarget.style.boxShadow = `0 0 16px ${accent}12`; }}>
            <div className="flex items-center justify-center gap-2">
              <CalendarCheck className="h-5 w-5" /> Gérer les séances
            </div>
          </button>
        </Link>

        {/* Secondary actions */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { to: `/teacher/courses/${course.id}/attendance`, icon: ClipboardList, label: "Manuel",    color: "rgba(139,92,246,0.4)"  },
            { to: `/teacher/courses/${course.id}/materials`,  icon: Folder,        label: "Supports",  color: "rgba(100,100,130,0.4)" },
            { to: `/teacher/courses/${course.id}/danger-zone`,icon: Shield,        label: "Danger",    color: "rgba(185,28,28,0.4)"   },
          ].map(({ to, icon: Icon, label }) => (
            <Link key={label} to={to}>
              <button className="w-full flex flex-col items-center gap-1.5 rounded-2xl py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-all"
                style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(130,130,165,0.75)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#f0f0ff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.035)"; e.currentTarget.style.color = "rgba(130,130,165,0.75)"; }}>
                <Icon className="h-5 w-5" /> {label}
              </button>
            </Link>
          ))}
          <button
            onClick={() => onDownload(course)}
            disabled={downloading === course.id}
            className="flex flex-col items-center gap-1.5 rounded-2xl py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-all disabled:opacity-40"
            style={{ background: "rgba(21,128,61,0.07)", border: "1px solid rgba(21,128,61,0.2)", color: "rgba(74,222,128,0.75)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(21,128,61,0.14)"; e.currentTarget.style.color = "#4ade80"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(21,128,61,0.07)"; e.currentTarget.style.color = "rgba(74,222,128,0.75)"; }}>
            {downloading === course.id
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <Download className="h-5 w-5" />}
            {downloading === course.id ? "..." : "Rapport"}
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
      const res = await authedFetch(`teacher/courses/${course.id}/report/`);
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
            <h1 className="page-title mt-1">Mes cours</h1>
            <p className="page-sub">Tous les cours qui vous sont assignés — gérez la présence, les supports et les rapports.</p>
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
              placeholder="Rechercher cours ou filières…"
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
