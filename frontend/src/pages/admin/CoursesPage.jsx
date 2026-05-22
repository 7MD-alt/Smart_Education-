import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  BookOpen, Plus, Search, Edit2, Trash2, X,
  AlertCircle, UserCircle, Layers, FileText, AlertTriangle,
} from "lucide-react";

const Modal = ({ open, onClose, title, children, onSave, saving, wide }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className={`modal-panel ${wide ? "max-w-xl" : "max-w-md"} w-full max-h-[90vh] flex flex-col`}>
        <div className="modal-header">
          <h3 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>{title}</h3>
          <button onClick={onClose} style={{ color: "var(--text-3)" }}><X className="h-4 w-4" /></button>
        </div>
        <div className="modal-body flex-1 overflow-y-auto">{children}</div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          <button onClick={onSave} disabled={saving} className="btn-primary px-5 py-2 text-sm">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
};

const CoursesPage = () => {
  const [courses,       setCourses]       = useState([]);
  const [teachers,      setTeachers]      = useState([]);
  const [filieres,      setFilieres]      = useState([]);
  const [filiereCourses,setFiliereCourses]= useState([]);
  const [materials,     setMaterials]     = useState([]);
  const [search,        setSearch]        = useState("");
  const [teacherFilter, setTeacherFilter] = useState("ALL");
  const [loading,       setLoading]       = useState(true);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [delTarget,     setDelTarget]     = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [formErr,       setFormErr]       = useState("");
  const [form,          setForm]          = useState({ title: "", teacher_id: "", max_absences: 3, filiere_links: [] });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, t, f, fc, m] = await Promise.all([
        axiosClient.get("courses/"), axiosClient.get("teacher-profiles/"),
        axiosClient.get("filieres/"), axiosClient.get("filiere-courses/"), axiosClient.get("course-materials/"),
      ]);
      setCourses(Array.isArray(c.data) ? c.data : c.data.results || []);
      setTeachers(Array.isArray(t.data) ? t.data : t.data.results || []);
      setFilieres(Array.isArray(f.data) ? f.data : f.data.results || []);
      setFiliereCourses(Array.isArray(fc.data) ? fc.data : fc.data.results || []);
      setMaterials(Array.isArray(m.data) ? m.data : m.data.results || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null); setFormErr(""); setForm({ title: "", teacher_id: "", max_absences: 3, filiere_links: [] }); setModalOpen(true);
  };
  const openEdit = (c) => {
    const existing = filiereCourses
      .filter(fc => (fc.course?.id ?? fc.course) === c.id)
      .map(fc => ({ filiere_id: String(fc.filiere?.id ?? fc.filiere), semester: fc.semester, fc_id: fc.id }));
    setEditing(c);
    setForm({ title: c.title, teacher_id: c.teacher?.user?.id ?? c.teacher ?? "", max_absences: c.max_absences ?? 3, filiere_links: existing });
    setFormErr(""); setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true); setFormErr("");
    try {
      const payload = { title: form.title, teacher_id: form.teacher_id, max_absences: Number(form.max_absences) };
      let courseId;
      if (editing) { const r = await axiosClient.patch(`courses/${editing.id}/`, payload); courseId = r.data.id; }
      else          { const r = await axiosClient.post("courses/", payload);               courseId = r.data.id; }

      // Sync filiere-course links
      const existing = filiereCourses.filter(fc => (fc.course?.id ?? fc.course) === courseId);
      const desired = new Set(form.filiere_links.filter(l => l.filiere_id).map(l => `${l.filiere_id}-${l.semester}`));
      const existingKeys = new Set(existing.map(fc => `${fc.filiere?.id ?? fc.filiere}-${fc.semester}`));
      for (const fc of existing) { if (!desired.has(`${fc.filiere?.id ?? fc.filiere}-${fc.semester}`)) await axiosClient.delete(`filiere-courses/${fc.id}/`).catch(() => {}); }
      for (const link of form.filiere_links) {
        if (!link.filiere_id) continue;
        if (!existingKeys.has(`${link.filiere_id}-${link.semester}`))
          await axiosClient.post("filiere-courses/", { filiere_id: link.filiere_id, course_id: courseId, semester: Number(link.semester) }).catch(() => {});
      }
      setModalOpen(false); fetchAll();
    } catch (e) { setFormErr(e.response?.data ? JSON.stringify(e.response.data) : "Save failed."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await axiosClient.delete(`courses/${delTarget.id}/`); setDelTarget(null); fetchAll(); }
    catch { /* silent */ }
    finally { setDeleting(false); }
  };

  const getTeacher = (c) => { const id = c.teacher?.user?.id ?? c.teacher; return teachers.find(t => (t.user?.id ?? t.user) === id); };
  const getLinks   = (id) => filiereCourses.filter(fc => (fc.course?.id ?? fc.course) === id);
  const matCount   = (id) => materials.filter(m => (m.course?.id ?? m.course) === id).length;

  const filtered = courses.filter(c => {
    if (teacherFilter !== "ALL" && String(c.teacher?.user?.id ?? c.teacher) !== String(teacherFilter)) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <p className="label">Admin / Courses</p>
            <h1 className="page-title mt-1">Courses</h1>
            <p className="page-sub">Create courses, assign teachers, and link them to filieres.</p>
          </div>
          <button onClick={openCreate} disabled={teachers.length === 0} className="btn-primary gap-1.5 disabled:opacity-40">
            <Plus className="h-4 w-4" /> New Course
          </button>
        </div>

        {/* Prereq warnings */}
        {!loading && teachers.length === 0 && (
          <div className="flex items-center gap-3 rounded-[var(--radius)] px-4 py-3 text-sm text-amber-300"
               style={{ background: "rgba(180,83,9,0.08)", border: "1px solid rgba(180,83,9,0.2)" }}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            No teachers yet. <Link to="/admin/users" className="font-semibold underline">Create a teacher</Link> first.
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-[var(--radius)] px-3 py-2"
               style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <UserCircle className="h-4 w-4" style={{ color: "var(--text-3)" }} />
            <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)}
                    className="bg-transparent text-sm outline-none" style={{ color: "var(--text-2)" }}>
              <option value="ALL">All teachers</option>
              {teachers.map(t => <option key={t.user?.id ?? t.user} value={t.user?.id ?? t.user}>
                {`${t.user?.first_name || ""} ${t.user?.last_name || ""}`.trim() || t.user?.username}
              </option>)}
            </select>
          </div>
          <div className="flex flex-1 max-w-xs items-center gap-2 rounded-[var(--radius)] px-3 py-2"
               style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Search className="h-4 w-4" style={{ color: "var(--text-3)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses…"
                   className="w-full bg-transparent text-sm outline-none" style={{ color: "var(--text-1)" }} />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 rounded-[var(--radius-lg)]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <BookOpen className="h-8 w-8" style={{ color: "var(--text-3)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>No courses found</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{search || teacherFilter !== "ALL" ? "Clear filters." : "Create your first course."}</p>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead><tr><th>Course</th><th>Teacher</th><th>Filieres</th><th>Materials</th><th>Max absences</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filtered.map(c => {
                  const teacher = getTeacher(c);
                  const links   = getLinks(c.id);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)]"
                               style={{ background: "rgba(180,83,9,0.1)", border: "1px solid rgba(180,83,9,0.2)" }}>
                            <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                          </div>
                          <span className="font-medium" style={{ color: "var(--text-1)" }}>{c.title}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-2)" }}>
                          <UserCircle className="h-3.5 w-3.5" style={{ color: "var(--text-3)" }} />
                          {teacher ? (`${teacher.user?.first_name || ""} ${teacher.user?.last_name || ""}`.trim() || teacher.user?.username) : "—"}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-2)" }}>
                          <Layers className="h-3.5 w-3.5" style={{ color: "var(--text-3)" }} />
                          {links.length === 0 ? <span style={{ color: "var(--text-3)" }}>None</span>
                            : links.map(lf => `${lf.filiere?.code ?? "?"}(S${lf.semester})`).join(", ")}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-2)" }}>
                          <FileText className="h-3.5 w-3.5" style={{ color: "var(--text-3)" }} /> {matCount(c.id)}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-2)" }}>
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> {c.max_absences}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(c)} className="btn-ghost p-2"><Edit2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setDelTarget(c)} className="btn p-2 text-red-400"
                                  style={{ border: "1px solid rgba(185,28,28,0.2)", background: "rgba(185,28,28,0.06)" }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
             title={editing ? "Edit Course" : "New Course"} onSave={handleSave} saving={saving} wide>
        <div className="space-y-4">
          {formErr && <div className="rounded-[var(--radius)] px-3 py-2 text-sm text-red-400"
                          style={{ background: "rgba(185,28,28,0.08)", border: "1px solid rgba(185,28,28,0.2)" }}>{formErr}</div>}
          <div className="space-y-1.5">
            <label className="label">Course Title</label>
            <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Deep Learning" required />
          </div>
          <div className="space-y-1.5">
            <label className="label">Teacher</label>
            <select className="input" value={form.teacher_id} onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value }))} required>
              <option value="">Select a teacher…</option>
              {teachers.map(t => <option key={t.user?.id ?? t.user} value={t.user?.id ?? t.user}>
                {`${t.user?.first_name || ""} ${t.user?.last_name || ""}`.trim() || t.user?.username}
                {t.department ? ` — ${t.department.code}` : ""}
              </option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="label">Max Absences</label>
            <input className="input" type="number" min="1" max="20" value={form.max_absences}
                   onChange={e => setForm(p => ({ ...p, max_absences: e.target.value }))} required />
          </div>
          {/* Filiere links */}
          <div className="rounded-[var(--radius)] p-4" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="label text-violet-400">Linked Filieres</p>
              <button type="button" onClick={() => setForm(p => ({ ...p, filiere_links: [...p.filiere_links, { filiere_id: "", semester: 1 }] }))}
                      className="btn-violet px-2.5 py-1 text-xs gap-1"><Plus className="h-3 w-3" /> Add</button>
            </div>
            {form.filiere_links.length === 0 && <p className="text-xs" style={{ color: "var(--text-3)" }}>No filieres linked yet.</p>}
            <div className="space-y-2">
              {form.filiere_links.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select className="input flex-1 text-xs py-1.5" value={link.filiere_id}
                          onChange={e => setForm(p => { const n = [...p.filiere_links]; n[i] = { ...n[i], filiere_id: e.target.value }; return { ...p, filiere_links: n }; })} required>
                    <option value="">Select filiere…</option>
                    {filieres.map(f => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
                  </select>
                  <input type="number" min="1" max="10" value={link.semester} placeholder="S" title="Semester"
                         className="input w-16 text-xs py-1.5"
                         onChange={e => setForm(p => { const n = [...p.filiere_links]; n[i] = { ...n[i], semester: e.target.value }; return { ...p, filiere_links: n }; })} required />
                  <button type="button" onClick={() => setForm(p => ({ ...p, filiere_links: p.filiere_links.filter((_, j) => j !== i) }))}
                          className="btn p-2 text-red-400" style={{ border: "1px solid rgba(185,28,28,0.2)", background: "rgba(185,28,28,0.06)" }}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      {delTarget && (
        <div className="modal-overlay">
          <div className="modal-panel w-full max-w-sm">
            <div className="modal-body">
              <div className="flex h-10 w-10 items-center justify-center rounded-full mb-4" style={{ background: "rgba(185,28,28,0.1)" }}>
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>Delete course?</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--text-2)" }}>"{delTarget.title}", its materials and all attendance records will be permanently deleted.</p>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setDelTarget(null)} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1 py-2 text-sm">{deleting ? "Deleting…" : "Delete"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CoursesPage;