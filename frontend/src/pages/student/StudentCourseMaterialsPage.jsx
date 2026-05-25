import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  ArrowLeft, FileText, File as FileIcon, FileImage,
  Download, BookOpen, Folder, ExternalLink, Calendar,
  Search,
} from "lucide-react";

/* ── Helpers ─────────────────────────────────────────────────── */
const BACKEND_ORIGIN = import.meta.env.VITE_API_URL?.replace("/api/", "") ?? "http://127.0.0.1:8000";
const getFileName = (p) => p ? decodeURIComponent(p.split("/").pop()) : "Unnamed";
const getExt      = (p) => { if (!p) return ""; const pts = p.split("."); return pts.length > 1 ? pts.pop().toUpperCase() : "FILE"; };
const getUrl      = (p) => p ? (p.startsWith("http") ? p : `${BACKEND_ORIGIN}${p}`) : "#";
const fmtDate     = (d) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";
const fmtSize     = (b) => { if (!b) return ""; if (b < 1024) return `${b} B`; if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`; return `${(b / 1048576).toFixed(1)} MB`; };

/* ── File type helpers ───────────────────────────────────────── */
const getFileStyle = (path) => {
  const ext = getExt(path).toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext))
    return { icon: FileImage, accent: "#22d3ee", glow: "rgba(8,145,178,0.15)", label: "Image" };
  if (["pdf"].includes(ext))
    return { icon: FileText, accent: "#f87171", glow: "rgba(185,28,28,0.15)", label: "PDF" };
  if (["doc","docx"].includes(ext))
    return { icon: FileText, accent: "#60a5fa", glow: "rgba(29,78,216,0.15)", label: "Word" };
  if (["ppt","pptx"].includes(ext))
    return { icon: FileText, accent: "#fb923c", glow: "rgba(180,83,9,0.15)", label: "Slides" };
  if (["xls","xlsx","csv"].includes(ext))
    return { icon: FileText, accent: "#4ade80", glow: "rgba(21,128,61,0.15)", label: "Sheet" };
  if (["zip","rar","7z"].includes(ext))
    return { icon: FileIcon, accent: "#fbbf24", glow: "rgba(180,83,9,0.15)", label: "Archive" };
  return { icon: FileIcon, accent: "#a78bfa", glow: "rgba(124,58,237,0.15)", label: getExt(path) || "File" };
};

/* ── Material card ───────────────────────────────────────────── */
const MaterialCard = ({ mat, index }) => {
  const fileUrl = getUrl(mat.file);
  const name    = mat.title || getFileName(mat.file);
  const { icon: Icon, accent, glow, label } = getFileStyle(mat.file);

  return (
    <div
      className="group relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-lg)] p-4 transition-all duration-200 fade-up"
      style={{ border: "1px solid var(--border)", background: "var(--surface)", animationDelay: `${index * 40}ms` }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.boxShadow = `0 4px 20px ${glow}`; e.currentTarget.style.background = "var(--surface-2)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "var(--surface)"; }}
    >
      {/* Accent line */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-0.5 transition-opacity duration-200 opacity-0 group-hover:opacity-100"
           style={{ background: accent }} />

      {/* File icon */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] transition-transform duration-200 group-hover:scale-105"
        style={{ background: glow, border: `1px solid ${accent}30` }}
      >
        <Icon className="h-5 w-5" style={{ color: accent, filter: `drop-shadow(0 0 4px ${accent})` }} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" style={{ color: "var(--text-1)" }}>{name}</p>
        <div className="mt-0.5 flex items-center gap-3 text-xs" style={{ color: "var(--text-3)" }}>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: `${accent}15`, color: accent }}
          >
            {label}
          </span>
          {mat.size && <span>{fmtSize(mat.size)}</span>}
          {mat.uploaded_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {fmtDate(mat.uploaded_at)}
            </span>
          )}
        </div>
        {mat.description && (
          <p className="mt-1 truncate text-xs" style={{ color: "var(--text-3)" }}>{mat.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
          className="btn-ghost p-2"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <a
          href={fileUrl}
          download={name}
          title="Download"
          className="btn p-2 transition-all duration-150"
          style={{ background: `${accent}15`, border: `1px solid ${accent}30`, color: accent, borderRadius: "var(--radius)" }}
          onMouseEnter={e => { e.currentTarget.style.background = `${accent}25`; e.currentTarget.style.boxShadow = `0 0 12px ${glow}`; }}
          onMouseLeave={e => { e.currentTarget.style.background = `${accent}15`; e.currentTarget.style.boxShadow = "none"; }}
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

/* ── Main ────────────────────────────────────────────────────── */
const StudentCourseMaterialsPage = () => {
  const { courseId } = useParams();
  const toast = useToast();

  const [course,    setCourse]    = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    fetchAll();
  }, [courseId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [courseRes, matsRes] = await Promise.all([
        axiosClient.get(`courses/${courseId}/`),
        axiosClient.get(`courses/${courseId}/materials/`),
      ]);
      setCourse(courseRes.data);
      setMaterials(Array.isArray(matsRes.data) ? matsRes.data : matsRes.data.results || []);
    } catch {
      toast.error("Failed to load course materials.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = materials.filter(m => {
    const name = (m.title || getFileName(m.file)).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  /* Group by extension label */
  const grouped = filtered.reduce((acc, mat) => {
    const { label } = getFileStyle(mat.file);
    if (!acc[label]) acc[label] = [];
    acc[label].push(mat);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="fade-up">
          <Link
            to="/student"
            className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors duration-150 mb-4"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>

          <div className="page-header">
            <div>
              <p className="label mb-1">Student Portal / Course Materials</p>
              <h1 className="page-title flex items-center gap-2">
                <Folder className="h-5 w-5" style={{ color: "#a78bfa" }} />
                {loading ? "Loading…" : course?.title ?? "Course Materials"}
              </h1>
              {course && (
                <p className="page-sub">
                  Materials uploaded by your teacher · {materials.length} file{materials.length !== 1 ? "s" : ""} available
                </p>
              )}
            </div>

            {/* Stats pill */}
            {!loading && (
              <div
                className="flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)]"
                     style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
                  <BookOpen className="h-5 w-5" style={{ color: "#a78bfa" }} />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: "#a78bfa" }}>{materials.length}</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>Total files</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search bar */}
        {!loading && materials.length > 0 && (
          <div
            className="flex items-center gap-2 rounded-[var(--radius)] px-3 py-2.5 fade-up"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-3)" }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files by name…"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: "var(--text-1)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-xs" style={{ color: "var(--text-3)" }}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : materials.length === 0 ? (
          <div className="empty-state">
            <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)]"
                 style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
              <Folder className="h-6 w-6" style={{ color: "#a78bfa" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>No materials yet</p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>
                Your teacher hasn't uploaded any files for this course yet.
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Search className="h-7 w-7" style={{ color: "var(--text-3)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>No files match "{search}"</p>
              <button onClick={() => setSearch("")} className="text-xs text-violet-400 mt-1">Clear search</button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* If no search, show grouped by type; if searching, show flat list */}
            {search ? (
              <div className="space-y-2">
                {filtered.map((mat, i) => <MaterialCard key={mat.id} mat={mat} index={i} />)}
              </div>
            ) : (
              Object.entries(grouped).map(([type, mats]) => (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="label">{type}</span>
                    <span className="badge badge-gray">{mats.length}</span>
                  </div>
                  <div className="space-y-2">
                    {mats.map((mat, i) => <MaterialCard key={mat.id} mat={mat} index={i} />)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default StudentCourseMaterialsPage;
