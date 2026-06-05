import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Layers, Plus, Search, Edit2, Trash2, X, AlertCircle, Building2, GraduationCap, Eye, Hash, BookOpen } from "lucide-react";

const Modal = ({ open, onClose, title, children, onSave, saving }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-panel w-full max-w-md">
        <div className="modal-header">
          <h3 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>{title}</h3>
          <button onClick={onClose} style={{ color: "var(--text-3)" }} className="transition"
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          <button onClick={onSave} disabled={saving} className="btn-primary px-5 py-2 text-sm">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Detail modal ─────────────────────────────────────────────── */
const FiliereDetailModal = ({ open, onClose, filiere, students, courses, filiereCourses }) => {
  if (!open || !filiere) return null;

  const filiereStudents = students.filter(s => (s.filiere?.id ?? s.filiere) === filiere.id);
  const linkedCourses   = filiereCourses
    .filter(fc => (fc.filiere?.id ?? fc.filiere) === filiere.id)
    .map(fc => ({ ...courses.find(c => c.id === (fc.course?.id ?? fc.course)), semester: fc.semester }))
    .filter(Boolean);

  const bySemester = filiereStudents.reduce((acc, s) => {
    const sem = s.semester ?? "?";
    acc[sem] = (acc[sem] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1120] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/25">
              <Layers className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-white/30">Filiere</p>
              <h3 className="text-lg font-semibold text-white">{filiere.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Identity chips */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Code",       value: filiere.code,                          color: "text-pink-300"   },
              { label: "Department", value: filiere.department?.code ?? "—",       color: "text-blue-300"   },
              { label: "Students",   value: filiereStudents.length,                color: "text-green-300"  },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Department info row */}
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <Building2 className="h-4 w-4 text-white/30 shrink-0" />
            <span className="text-sm text-white/60">{filiere.department?.name ?? "No department"}</span>
          </div>

          {/* Students by semester */}
          {filiereStudents.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/30 mb-3">Students by semester</p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(bySemester).sort(([a],[b]) => Number(a)-Number(b)).map(([sem, count]) => (
                  <div key={sem} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center">
                    <p className="text-lg font-bold text-violet-300">{count}</p>
                    <p className="text-[10px] text-white/30">S{sem}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked courses */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/30 mb-3">
              Linked courses <span className="text-white/20 ml-1">({linkedCourses.length})</span>
            </p>
            {linkedCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <BookOpen className="h-7 w-7 text-white/15 mb-2" />
                <p className="text-sm text-white/40">No courses linked yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedCourses.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <p className="text-sm font-medium text-white">{c.title}</p>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      S{c.semester}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-white/10 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-5 py-2 text-sm text-white/60 hover:bg-white/[0.05] transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const FilieresPage = () => {
  const [filieres,      setFilieres]      = useState([]);
  const [departments,   setDepartments]   = useState([]);
  const [students,      setStudents]      = useState([]);
  const [courses,       setCourses]       = useState([]);
  const [filiereCourses,setFiliereCourses]= useState([]);
  const [search,        setSearch]        = useState("");
  const [deptFilter,    setDeptFilter]    = useState("ALL");
  const [loading,       setLoading]       = useState(true);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [delTarget,     setDelTarget]     = useState(null);
  const [detailTarget,  setDetailTarget]  = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [form,          setForm]          = useState({ code: "", name: "", department_id: "" });
  const [formErr,       setFormErr]       = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [f, d, s, c, fc] = await Promise.all([
        axiosClient.get("filieres/"),
        axiosClient.get("departments/"),
        axiosClient.get("student-profiles/"),
        axiosClient.get("courses/"),
        axiosClient.get("filiere-courses/"),
      ]);
      setFilieres(Array.isArray(f.data) ? f.data : f.data.results || []);
      setDepartments(Array.isArray(d.data) ? d.data : d.data.results || []);
      setStudents(Array.isArray(s.data) ? s.data : s.data.results || []);
      setCourses(Array.isArray(c.data) ? c.data : c.data.results || []);
      setFiliereCourses(Array.isArray(fc.data) ? fc.data : fc.data.results || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ code: "", name: "", department_id: "" }); setFormErr(""); setModalOpen(true); };
  const openEdit   = (f) => { setEditing(f); setForm({ code: f.code, name: f.name, department_id: f.department?.id ?? f.department ?? "" }); setFormErr(""); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true); setFormErr("");
    try {
      const payload = { code: form.code, name: form.name, department_id: form.department_id };
      editing
        ? await axiosClient.patch(`filieres/${editing.id}/`, payload)
        : await axiosClient.post("filieres/", payload);
      setModalOpen(false); fetchAll();
    } catch (e) { setFormErr(e.response?.data ? JSON.stringify(e.response.data) : "Save failed."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await axiosClient.delete(`filieres/${delTarget.id}/`); setDelTarget(null); fetchAll(); }
    catch { /* silent */ }
    finally { setDeleting(false); }
  };

  const studentCt = (id) => students.filter(s => (s.filiere?.id ?? s.filiere) === id).length;

  const filtered = filieres.filter(f => {
    if (deptFilter !== "ALL" && String(f.department?.id ?? f.department) !== String(deptFilter)) return false;
    if (search) { const s = search.toLowerCase(); return f.name.toLowerCase().includes(s) || f.code.toLowerCase().includes(s); }
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <p className="label">Admin / Filieres</p>
            <h1 className="page-title mt-1">Filieres</h1>
            <p className="page-sub">Academic programs organized under each department.</p>
          </div>
          <button onClick={openCreate} disabled={departments.length === 0} className="btn-primary gap-1.5 disabled:opacity-40">
            <Plus className="h-4 w-4" /> New Filiere
          </button>
        </div>

        {/* Prereq warning */}
        {!loading && departments.length === 0 && (
          <div className="flex items-center gap-3 rounded-[var(--radius)] px-4 py-3 text-sm text-amber-300"
               style={{ background: "rgba(180,83,9,0.08)", border: "1px solid rgba(180,83,9,0.2)" }}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            No departments yet.{" "}
            <Link to="/admin/departments" className="font-semibold underline hover:text-amber-200">Create one first</Link>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-[var(--radius)] px-3 py-2"
               style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Building2 className="h-4 w-4 shrink-0" style={{ color: "var(--text-3)" }} />
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                    className="bg-transparent text-sm outline-none" style={{ color: "var(--text-2)" }}>
              <option value="ALL">All departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
          </div>
          <div className="flex flex-1 max-w-xs items-center gap-2 rounded-[var(--radius)] px-3 py-2"
               style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-3)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search filieres…"
                   className="w-full bg-transparent text-sm outline-none" style={{ color: "var(--text-1)" }} />
          </div>
          <span className="text-sm" style={{ color: "var(--text-3)" }}>
            <strong style={{ color: "var(--text-1)" }}>{filtered.length}</strong> filiere{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 rounded-[var(--radius-lg)]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Layers className="h-8 w-8" style={{ color: "var(--text-3)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>No filieres found</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{search || deptFilter !== "ALL" ? "Clear filters." : "Create your first filiere."}</p>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead><tr><th>Name</th><th>Code</th><th>Department</th><th>Students</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)]"
                             style={{ background: "rgba(190,24,93,0.1)", border: "1px solid rgba(190,24,93,0.2)" }}>
                          <Layers className="h-3.5 w-3.5 text-pink-400" />
                        </div>
                        <span className="font-medium" style={{ color: "var(--text-1)" }}>{f.name}</span>
                      </div>
                    </td>
                    <td><code className="rounded px-2 py-0.5 text-xs" style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>{f.code}</code></td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-2)" }}>
                        <Building2 className="h-3.5 w-3.5" style={{ color: "var(--text-3)" }} />
                        {f.department?.name ?? "—"}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-2)" }}>
                        <GraduationCap className="h-3.5 w-3.5" style={{ color: "var(--text-3)" }} /> {studentCt(f.id)}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setDetailTarget(f)}
                                className="btn p-2 text-pink-400"
                                style={{ border: "1px solid rgba(190,24,93,0.2)", background: "rgba(190,24,93,0.06)" }}
                                title="View details">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEdit(f)} className="btn-ghost p-2"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDelTarget(f)} className="btn p-2 text-red-400"
                                style={{ border: "1px solid rgba(185,28,28,0.2)", background: "rgba(185,28,28,0.06)" }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
             title={editing ? "Edit Filiere" : "New Filiere"} onSave={handleSave} saving={saving}>
        <div className="space-y-4">
          {formErr && <div className="rounded-[var(--radius)] px-3 py-2 text-sm text-red-400"
                          style={{ background: "rgba(185,28,28,0.08)", border: "1px solid rgba(185,28,28,0.2)" }}>{formErr}</div>}
          <div className="space-y-1.5">
            <label className="label">Department</label>
            <select className="input" value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))} required>
              <option value="">Select department…</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="label">Code</label>
            <input className="input" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. IAT2" required />
          </div>
          <div className="space-y-1.5">
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Intelligence Artificielle" required />
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
              <h3 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>Delete {delTarget.name}?</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--text-2)" }}>All students in this filiere will be affected. This cannot be undone.</p>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setDelTarget(null)} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1 py-2 text-sm">{deleting ? "Deleting…" : "Delete"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FiliereDetailModal open={!!detailTarget} onClose={() => setDetailTarget(null)}
                          filiere={detailTarget} students={students}
                          courses={courses} filiereCourses={filiereCourses} />
    </DashboardLayout>
  );
};

export default FilieresPage;
