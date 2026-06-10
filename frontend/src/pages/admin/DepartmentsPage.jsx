import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Building2, Plus, Search, Edit2, Trash2, X, AlertCircle, Layers, Eye, GraduationCap } from "lucide-react";

/* ── Shared modal primitives ─────────────────────────────────── */
const FormModal = ({ open, onClose, title, children, onSubmit, saving }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-panel w-full max-w-md">
        <div className="modal-header">
          <h3 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>{title}</h3>
          <button onClick={onClose} className="transition" style={{ color: "var(--text-3)" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Annuler</button>
          <button onClick={onSubmit} disabled={saving} className="btn-primary px-5 py-2 text-sm">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteModal = ({ open, name, onClose, onConfirm, deleting, description }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-panel w-full max-w-sm">
        <div className="modal-body">
          <div className="flex h-10 w-10 items-center justify-center rounded-full mb-4"
               style={{ background: "rgba(185,28,28,0.1)" }}>
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <h3 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>Delete {name}?</h3>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-2)" }}>{description} This cannot be undone.</p>
          <div className="mt-5 flex gap-2">
            <button onClick={onClose} className="btn-ghost flex-1 py-2 text-sm">Annuler</button>
            <button onClick={onConfirm} disabled={deleting} className="btn-danger flex-1 py-2 text-sm">
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeptDetailModal = ({ open, onClose, dept, filieres, students }) => {
  if (!open || !dept) return null;

  const deptFilieres = filieres.filter(f => (f.department?.id ?? f.department) === dept.id);
  const totalStudents = students.filter(s => {
    const fid = s.filiere?.id ?? s.filiere;
    return deptFilieres.some(f => f.id === fid);
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1120] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/25">
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-white/30">Department</p>
              <h3 className="text-lg font-semibold text-white">{dept.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Code",     value: dept.code,             color: "text-blue-300"   },
              { label: "Filieres", value: deptFilieres.length,   color: "text-violet-300" },
              { label: "Students", value: totalStudents,          color: "text-green-300"  },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Filieres list */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/30 mb-3">Filières</p>
            {deptFilieres.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Layers className="h-7 w-7 text-white/15 mb-2" />
                <p className="text-sm text-white/40">No filieres in this department yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deptFilieres.map(f => {
                  const ct = students.filter(s => (s.filiere?.id ?? s.filiere) === f.id).length;
                  return (
                    <div key={f.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/10 border border-pink-500/20">
                          <Layers className="h-3.5 w-3.5 text-pink-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{f.name}</p>
                          <p className="text-[10px] text-white/40">{f.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/50">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {ct} student{ct !== 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                })}
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

/* ── Main ────────────────────────────────────────────────────── */
const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [filieres,    setFilieres]    = useState([]);
  const [students,    setStudents]    = useState([]);
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [delTarget,   setDelTarget]   = useState(null);
  const [detailTarget,setDetailTarget]= useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [form,        setForm]        = useState({ code: "", name: "" });
  const [formErr,     setFormErr]     = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [d, f, s] = await Promise.all([
        axiosClient.get("departments/"),
        axiosClient.get("filieres/"),
        axiosClient.get("student-profiles/"),
      ]);
      setDepartments(Array.isArray(d.data) ? d.data : d.data.results || []);
      setFilieres(Array.isArray(f.data) ? f.data : f.data.results || []);
      setStudents(Array.isArray(s.data) ? s.data : s.data.results || []);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ code: "", name: "" }); setFormErr(""); setModalOpen(true); };
  const openEdit   = (d) => { setEditing(d);   setForm({ code: d.code, name: d.name }); setFormErr(""); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true); setFormErr("");
    try {
      editing
        ? await axiosClient.patch(`departments/${editing.id}/`, form)
        : await axiosClient.post("departments/", form);
      setModalOpen(false);
      fetchAll();
    } catch (e) {
      setFormErr(e.response?.data ? JSON.stringify(e.response.data) : "Save failed.");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await axiosClient.delete(`departments/${delTarget.id}/`); setDelTarget(null); fetchAll(); }
    catch { /* non-critical */ }
    finally { setDeleting(false); }
  };

  const filtered = departments.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase())
  );
  const filiereCt = (id) => filieres.filter(f => (f.department?.id ?? f.department) === id).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <p className="label">Admin / Departments</p>
            <h1 className="page-title mt-1">Départements</h1>
            <p className="page-sub">Unités académiques qui organisent les filières et les cours.</p>
          </div>
          <button onClick={openCreate} className="btn-primary gap-1.5">
            <Plus className="h-4 w-4" /> Nouveau département
          </button>
        </div>

        {/* Search + count */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-sm"
               style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Building2 className="h-4 w-4" style={{ color: "var(--text-3)" }} />
            <span style={{ color: "var(--text-2)" }}><strong style={{ color: "var(--text-1)" }}>{departments.length}</strong> total</span>
          </div>
          <div className="flex flex-1 max-w-xs items-center gap-2 rounded-[var(--radius)] px-3 py-2"
               style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-3)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher des départements…"
                   className="w-full bg-transparent text-sm outline-none" style={{ color: "var(--text-1)" }} />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 rounded-[var(--radius-lg)]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Building2 className="h-8 w-8" style={{ color: "var(--text-3)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Aucun département trouvé</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                {search ? "Clear the search to see all." : "Create your first department."}
              </p>
            </div>
            {!search && <button onClick={openCreate} className="btn-ghost gap-1.5 px-4 py-2 text-sm"><Plus className="h-4 w-4" />Créer</button>}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr><th>Name</th><th>Code</th><th>Filières</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)]"
                             style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
                          <Building2 className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                        <span className="font-medium" style={{ color: "var(--text-1)" }}>{d.name}</span>
                      </div>
                    </td>
                    <td><code className="rounded px-2 py-0.5 text-xs" style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>{d.code}</code></td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-2)" }}>
                        <Layers className="h-3.5 w-3.5" style={{ color: "var(--text-3)" }} /> {filiereCt(d.id)}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setDetailTarget(d)}
                                className="btn p-2 text-blue-400"
                                style={{ border: "1px solid rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.06)" }}
                                title="View details">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEdit(d)} className="btn-ghost p-2 text-xs"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDelTarget(d)} className="btn p-2 text-red-400"
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

      {/* Modals */}
      <FormModal open={modalOpen} onClose={() => setModalOpen(false)}
                 title={editing ? "Edit Department" : "Nouveau département"}
                 onSubmit={handleSave} saving={saving}>
        <div className="space-y-4">
          {formErr && <div className="rounded-[var(--radius)] px-3 py-2 text-sm text-red-400"
                          style={{ background: "rgba(185,28,28,0.08)", border: "1px solid rgba(185,28,28,0.2)" }}>{formErr}</div>}
          <div className="space-y-1.5">
            <label className="label">Code</label>
            <input className="input" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. GI" required />
          </div>
          <div className="space-y-1.5">
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Génie Informatique" required />
          </div>
        </div>
      </FormModal>

      <DeleteModal open={!!delTarget} name={delTarget?.name} onClose={() => setDelTarget(null)}
                   onConfirm={handleDelete} deleting={deleting}
                   description={`"${delTarget?.name}" and all its associated filieres will be permanently deleted.`} />

      <DeptDetailModal open={!!detailTarget} onClose={() => setDetailTarget(null)}
                       dept={detailTarget} filieres={filieres} students={students} />
    </DashboardLayout>
  );
};

export default DepartmentsPage;
