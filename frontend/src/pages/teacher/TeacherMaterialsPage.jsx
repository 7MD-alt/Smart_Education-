import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  ArrowLeft, Upload, FileText, File as FileIcon,
  FileImage, Download, Trash2, Plus, AlertCircle,
  Loader2, X, Calendar,
} from "lucide-react";

const BACKEND_ORIGIN = import.meta.env.VITE_API_URL?.replace("/api/", "") ?? "http://127.0.0.1:8000";

const getFileName  = (p) => p ? p.split("/").pop() : "Unnamed";
const getExt       = (p) => { if (!p) return ""; const pts = p.split("."); return pts.length > 1 ? pts.pop().toUpperCase() : ""; };
const getIcon      = (p) => { const e = getExt(p).toLowerCase(); if (["jpg","jpeg","png","gif","webp","svg"].includes(e)) return FileImage; if (["pdf","doc","docx","txt","md","ppt","pptx"].includes(e)) return FileText; return FileIcon; };
const getUrl       = (p) => p ? (p.startsWith("http") ? p : `${BACKEND_ORIGIN}${p}`) : "#";
const fmtDate      = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric" }) : "";
const fmtSize      = (b) => { if (!b) return ""; if (b < 1024) return `${b} B`; if (b < 1048576) return `${(b/1024).toFixed(1)} KB`; return `${(b/1048576).toFixed(1)} MB`; };

const TeacherMaterialsPage = () => {
  const { courseId } = useParams();
  const fileInputRef = useRef(null);
  const toast = useToast();

  const [course,       setCourse]       = useState(null);
  const [materials,    setMaterials]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [dragActive,   setDragActive]   = useState(false);
  const [delTarget,    setDelTarget]    = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  useEffect(() => {
    axiosClient.get(`courses/${courseId}/`).then(r => setCourse(r.data)).catch(() => {});
    fetchMaterials();
  }, [courseId]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`courses/${courseId}/materials/`);
      setMaterials(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch { toast.error("Failed to load materials."); }
    finally { setLoading(false); }
  };

  const handleUpload = async () => {
    if (!selectedFile) { toast.error("Select a file first."); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("course_id", courseId); fd.append("file", selectedFile);
      await axiosClient.post("course-materials/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = "";
      fetchMaterials(); toast.success("Material uploaded.");
    } catch (e) { toast.error(e.response?.data?.error || "Upload failed."); }
    finally { setUploading(false); }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await axiosClient.delete(`course-materials/${delTarget.id}/`);
      setMaterials(p => p.filter(m => m.id !== delTarget.id)); setDelTarget(null); toast.success("Material deleted.");
    } catch { toast.error("Delete failed."); }
    finally { setDeleting(false); }
  };

  const handleDrag = e => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === "dragenter" || e.type === "dragover"); };
  const handleDrop = e => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]); };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <Link to="/teacher" className="inline-flex items-center gap-1.5 text-xs mb-4 transition"
                style={{ color: "var(--text-3)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <div className="page-header">
            <div>
              <p className="label">Course Materials</p>
              <h1 className="page-title mt-1">{course?.title ?? "Loading…"}</h1>
              <p className="page-sub">Téléversez et gérez les ressources pédagogiques de ce cours.</p>
            </div>
            <div className="stat-card px-5 py-3 text-right hidden md:block">
              <p className="stat-label">Total files</p>
              <p className="stat-value">{materials.length}</p>
            </div>
          </div>
        </div>

        {/* Upload card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)]"
                 style={{ background: "rgba(180,83,9,0.1)", border: "1px solid rgba(180,83,9,0.2)" }}>
              <Upload className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Upload Material</p>
              <p className="text-xs" style={{ color: "var(--text-2)" }}>PDFs, documents, slides, images — drag or click to browse.</p>
            </div>
          </div>

          {/* Dropzone */}
          <label htmlFor="material-file-input"
                 onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                 className={`flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border-2 border-dashed px-6 py-10 text-center transition-colors ${dragActive ? "border-amber-400/40 bg-amber-500/5" : ""}`}
                 style={!dragActive ? { borderColor: "var(--border)", background: "var(--bg)" } : {}}>
            <input id="material-file-input" ref={fileInputRef} type="file" className="hidden"
                   onChange={e => setSelectedFile(e.target.files?.[0])} />
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)]"
                 style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <Plus className="h-4 w-4" style={{ color: "var(--text-3)" }} />
            </div>
            <p className="mt-3 text-sm" style={{ color: "var(--text-1)" }}>
              {selectedFile ? selectedFile.name : "Drop a file here, or click to browse"}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>
              {selectedFile ? `${fmtSize(selectedFile.size)} · ready to upload` : "Any file type · single upload"}
            </p>
          </label>

          <div className="mt-4 flex justify-end gap-2">
            {selectedFile && (
              <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="btn-ghost px-4 py-2 text-sm">Clear</button>
            )}
            <button onClick={handleUpload} disabled={!selectedFile || uploading} className="btn-primary gap-1.5 px-4 py-2 text-sm disabled:opacity-40">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>

        {/* Materials list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Files</h2>
            <span className="label">{materials.length} file{materials.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-3)" }} />
            </div>
          ) : materials.length === 0 ? (
            <div className="empty-state">
              <FileText className="h-8 w-8" style={{ color: "var(--text-3)" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Aucun support pour l'instant</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Upload your first file above.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {materials.map(mat => {
                const Icon = getIcon(mat.file);
                return (
                  <div key={mat.id} className="card flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                         style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                      <Icon className="h-4 w-4" style={{ color: "var(--text-2)" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium" style={{ color: "var(--text-1)" }}>{getFileName(mat.file)}</p>
                        {getExt(mat.file) && (
                          <code className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
                            {getExt(mat.file)}
                          </code>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3 w-3" style={{ color: "var(--text-3)" }} />
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>{fmtDate(mat.uploaded_at)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <a href={getUrl(mat.file)} target="_blank" rel="noreferrer" download
                         className="btn-ghost p-2" title="Download"><Download className="h-4 w-4" /></a>
                      <button onClick={() => setDelTarget(mat)} className="btn p-2 text-red-400"
                              style={{ border: "1px solid rgba(185,28,28,0.2)", background: "rgba(185,28,28,0.06)" }}
                              title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {delTarget && (
        <div className="modal-overlay">
          <div className="modal-panel w-full max-w-md">
            <div className="modal-body">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                     style={{ background: "rgba(185,28,28,0.1)", border: "1px solid rgba(185,28,28,0.2)" }}>
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>Delete material?</h3>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-2)" }}>
                    <span className="break-all font-medium" style={{ color: "var(--text-1)" }}>{getFileName(delTarget.file)}</span> will be permanently removed.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setDelTarget(null)} disabled={deleting} className="btn-ghost px-4 py-2 text-sm">Annuler</button>
                <button onClick={confirmDelete} disabled={deleting} className="btn-danger gap-1.5 px-4 py-2 text-sm">
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherMaterialsPage;
