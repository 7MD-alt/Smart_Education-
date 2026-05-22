import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Layers, Plus, Search, Edit2, Trash2, X, AlertCircle, Building2, GraduationCap } from "lucide-react";

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

const FilieresPage = () => {
  const [filieres,    setFilieres]    = useState([]);
  const [departments, setDepartments] = useState([]);
  const [students,    setStudents]    = useState([]);
  const [search,      setSearch]      = useState("");
  const [deptFilter,  setDeptFilter]  = useState("ALL");
  const [loading,     setLoading]     = useState(true);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [delTarget,   setDelTarget]   = useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [form,        setForm]        = useState({ code: "", name: "", department_id: "" });
  const [formErr,     setFormErr]     = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [f, d, s] = await Promise.all([
        axiosClient.get("filieres/"),
        axiosClient.get("departments/"),
        axiosClient.get("student-profiles/"),
      ]);
      setFilieres(Array.isArray(f.data) ? f.data : f.data.results || []);
      setDepartments(Array.isArray(d.data) ? d.data : d.data.results || []);
      setStudents(Array.isArray(s.data) ? s.data : s.data.results || []);
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
    </DashboardLayout>
  );
};

export default FilieresPage;