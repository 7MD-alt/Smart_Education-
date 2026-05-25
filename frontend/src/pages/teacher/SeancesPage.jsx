import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Calendar, Clock, Users, Play, CheckCircle2, XCircle,
  Plus, ChevronLeft, BookOpen, Loader2, AlertTriangle,
  Download, ClipboardList, Trash2, FlaskConical, GraduationCap,
  ArrowRight, Pencil,
} from "lucide-react";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  SCHEDULED: { label: "Planifiée",  color: "#a78bfa", bg: "rgba(124,58,237,0.12)", icon: Calendar    },
  ACTIVE:    { label: "En cours",   color: "#4ade80", bg: "rgba(21,128,61,0.12)",  icon: Play        },
  COMPLETED: { label: "Terminée",   color: "#94a3b8", bg: "rgba(51,65,85,0.3)",    icon: CheckCircle2 },
  CANCELLED: { label: "Annulée",    color: "#f87171", bg: "rgba(185,28,28,0.12)", icon: XCircle     },
};

const TYPE_CONFIG = {
  COURS: { label: "Cours",  color: "#22d3ee", bg: "rgba(8,145,178,0.12)",  icon: GraduationCap },
  TP:    { label: "TP",     color: "#fbbf24", bg: "rgba(180,83,9,0.12)",   icon: FlaskConical  },
};

const GROUP_LABELS = { NONE: "", GROUP_A: "Groupe A", GROUP_B: "Groupe B" };

// ── Pill badge ────────────────────────────────────────────────────────────────
const Pill = ({ color, bg, label, icon: Icon }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ color, background: bg }}>
    {Icon && <Icon className="h-3 w-3" />} {label}
  </span>
);

// ── Single séance row ─────────────────────────────────────────────────────────
const SeanceRow = ({ seance, onStart, onEnd, onDelete, onEdit, starting, ending }) => {
  const sc  = STATUS_CONFIG[seance.status] || STATUS_CONFIG.SCHEDULED;
  const tc  = TYPE_CONFIG[seance.session_type] || TYPE_CONFIG.COURS;
  const ScIcon = sc.icon;

  return (
    <div className="group relative rounded-[var(--radius-lg)] p-4 transition-all duration-150"
         style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
         onMouseEnter={e => { e.currentTarget.style.borderColor = `${tc.color}35`; }}
         onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>

      {/* Left accent */}
      <div className="absolute left-0 inset-y-0 w-0.5 rounded-l-full"
           style={{ background: sc.color, opacity: 0.8 }} />

      <div className="flex flex-wrap items-center gap-3 pl-2">

        {/* Date / time */}
        <div className="flex flex-col min-w-[90px]">
          <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text-1)" }}>
            {new Date(seance.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
          </p>
          <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-3)" }}>
            <Clock className="h-3 w-3" />
            {seance.start_time} · {seance.duration_minutes} min
          </p>
        </div>

        {/* Type + group */}
        <div className="flex flex-wrap gap-1.5">
          <Pill {...tc} />
          {seance.tp_group !== "NONE" && (
            <Pill color="#fb923c" bg="rgba(194,65,12,0.12)" label={GROUP_LABELS[seance.tp_group]} />
          )}
          <Pill {...sc} icon={ScIcon} />
        </div>

        {/* Stats */}
        {seance.status === "COMPLETED" && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs text-green-400 font-semibold">{seance.present_count ?? 0} présents</span>
            <span className="text-xs text-red-400 font-semibold">{seance.absent_count ?? 0} absents</span>
          </div>
        )}

        {/* Notes */}
        {seance.notes && (
          <p className="text-xs italic ml-2 flex-1" style={{ color: "var(--text-3)" }}>
            {seance.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          {seance.status === "SCHEDULED" && (
            <button
              onClick={() => onStart(seance.id)}
              disabled={starting === seance.id}
              className="btn px-3 py-1.5 text-xs gap-1.5 text-green-400 disabled:opacity-40"
              style={{ border: "1px solid rgba(21,128,61,0.25)", background: "rgba(21,128,61,0.08)" }}>
              {starting === seance.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Play className="h-3.5 w-3.5" />}
              Démarrer
            </button>
          )}

          {seance.status === "ACTIVE" && (
            <>
              <Link to={`/teacher/seances/${seance.id}/roster`}>
                <button className="btn px-3 py-1.5 text-xs gap-1.5 text-cyan-400"
                        style={{ border: "1px solid rgba(8,145,178,0.25)", background: "rgba(8,145,178,0.08)" }}>
                  <ClipboardList className="h-3.5 w-3.5" /> Roster live
                </button>
              </Link>
              <button
                onClick={() => onEnd(seance.id)}
                disabled={ending === seance.id}
                className="btn px-3 py-1.5 text-xs gap-1.5 text-red-400 disabled:opacity-40"
                style={{ border: "1px solid rgba(185,28,28,0.25)", background: "rgba(185,28,28,0.08)" }}>
                {ending === seance.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <CheckCircle2 className="h-3.5 w-3.5" />}
                Terminer
              </button>
            </>
          )}

          {seance.status === "COMPLETED" && (
            <Link to={`/teacher/seances/${seance.id}/roster`}>
              <button className="btn-ghost px-3 py-1.5 text-xs gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" /> Voir roster
              </button>
            </Link>
          )}

          {/* Edit — only for non-completed */}
          {seance.status !== "COMPLETED" && seance.status !== "CANCELLED" && (
            <button
              onClick={() => onEdit(seance)}
              className="btn-ghost px-2 py-1.5 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Modifier"
              style={{ color: "var(--text-2)" }}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Delete — only SCHEDULED */}
          {seance.status === "SCHEDULED" && (
            <button
              onClick={() => onDelete(seance.id)}
              className="btn-ghost px-2 py-1.5 text-xs gap-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Supprimer">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Create séance modal ───────────────────────────────────────────────────────
const DURATIONS = [30, 45, 60, 90, 120];

const CreateSeanceModal = ({ courseId, onClose, onCreated }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    start_time: "08:00",
    duration_minutes: 90,
    session_type: "COURS",
    tp_group: "NONE",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      // Map UI tp_group to API: if both groups → "BOTH"
      await axiosClient.post(`teacher/courses/${courseId}/seances/`, payload);
      toast.success("Séance(s) créée(s) avec succès !");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-md rounded-[var(--radius-lg)] p-6 overflow-y-auto max-h-[90vh]"
           style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-full"
             style={{ background: "linear-gradient(90deg,transparent,#22d3ee,transparent)" }} />

        <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-1)" }}>
          Nouvelle séance
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Date */}
          <div>
            <label className="label mb-1.5 block">Date</label>
            <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                   required className="input w-full" />
          </div>

          {/* Time */}
          <div>
            <label className="label mb-1.5 block">Heure de début</label>
            <input type="time" value={form.start_time} onChange={e => set("start_time", e.target.value)}
                   required className="input w-full" />
          </div>

          {/* Duration */}
          <div>
            <label className="label mb-1.5 block">Durée</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => (
                <button key={d} type="button"
                        onClick={() => set("duration_minutes", d)}
                        className="px-3 py-1.5 rounded-[var(--radius)] text-xs font-semibold transition-all"
                        style={{
                          background: form.duration_minutes === d ? "rgba(34,211,238,0.2)" : "var(--bg)",
                          border: `1px solid ${form.duration_minutes === d ? "#22d3ee" : "var(--border)"}`,
                          color: form.duration_minutes === d ? "#22d3ee" : "var(--text-2)",
                        }}>
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="label mb-1.5 block">Type de séance</label>
            <div className="flex gap-3">
              {["COURS", "TP"].map(t => {
                const tc = TYPE_CONFIG[t];
                const active = form.session_type === t;
                return (
                  <button key={t} type="button"
                          onClick={() => { set("session_type", t); if (t === "COURS") set("tp_group", "NONE"); else set("tp_group", "GROUP_A"); }}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-lg)] text-sm font-semibold transition-all"
                          style={{
                            background: active ? tc.bg : "var(--bg)",
                            border: `1px solid ${active ? tc.color : "var(--border)"}`,
                            color: active ? tc.color : "var(--text-3)",
                          }}>
                    <tc.icon className="h-4 w-4" /> {tc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group (only if TP) */}
          {form.session_type === "TP" && (
            <div>
              <label className="label mb-1.5 block">Groupe</label>
              <div className="flex gap-2">
                {[
                  { val: "GROUP_A", label: "Groupe A" },
                  { val: "GROUP_B", label: "Groupe B" },
                  { val: "BOTH",    label: "Les deux (2 séances)" },
                ].map(g => {
                  const active = form.tp_group === g.val;
                  return (
                    <button key={g.val} type="button"
                            onClick={() => set("tp_group", g.val)}
                            className="flex-1 py-2 rounded-[var(--radius)] text-xs font-semibold transition-all"
                            style={{
                              background: active ? "rgba(251,191,36,0.15)" : "var(--bg)",
                              border: `1px solid ${active ? "#fbbf24" : "var(--border)"}`,
                              color: active ? "#fbbf24" : "var(--text-3)",
                            }}>
                      {g.label}
                    </button>
                  );
                })}
              </div>
              {form.tp_group === "BOTH" && (
                <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>
                  Deux séances consécutives seront créées : Groupe A puis Groupe B,
                  chacune de {form.duration_minutes} min.
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label mb-1.5 block">Notes <span style={{ color: "var(--text-3)" }}>(optionnel)</span></label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                      placeholder="Ex: Salle B12, apporter les cahiers…"
                      rows={2} className="input w-full resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
                    className="btn-ghost flex-1 py-2">
              Annuler
            </button>
            <button type="submit" disabled={saving}
                    className="btn-cyan flex-1 py-2 gap-2 disabled:opacity-40">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Création…</> : <><Plus className="h-4 w-4" /> Créer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Edit séance modal ─────────────────────────────────────────────────────────
const EditSeanceModal = ({ seance, onClose, onSaved }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    date:             seance.date,
    start_time:       seance.start_time,
    duration_minutes: seance.duration_minutes,
    session_type:     seance.session_type,
    tp_group:         seance.tp_group,
    notes:            seance.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axiosClient.patch(`teacher/seances/${seance.id}/`, form);
      toast.success("Séance modifiée !");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erreur lors de la modification.");
    } finally {
      setSaving(false);
    }
  };

  const isActive = seance.status === "ACTIVE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-md rounded-[var(--radius-lg)] p-6 overflow-y-auto max-h-[90vh]"
           style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-full"
             style={{ background: "linear-gradient(90deg,transparent,#a78bfa,transparent)" }} />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: "var(--text-1)" }}>
            Modifier la séance
          </h2>
          {isActive && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold text-amber-400"
                  style={{ background: "rgba(180,83,9,0.15)", border: "1px solid rgba(180,83,9,0.3)" }}>
              ⚡ En cours — modifications limitées
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Date */}
          <div>
            <label className="label mb-1.5 block">Date</label>
            <input type="date" value={form.date}
                   onChange={e => set("date", e.target.value)}
                   disabled={isActive}
                   required className="input w-full disabled:opacity-50" />
          </div>

          {/* Time */}
          <div>
            <label className="label mb-1.5 block">Heure de début</label>
            <input type="time" value={form.start_time}
                   onChange={e => set("start_time", e.target.value)}
                   disabled={isActive}
                   required className="input w-full disabled:opacity-50" />
          </div>

          {/* Duration */}
          <div>
            <label className="label mb-1.5 block">Durée</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => (
                <button key={d} type="button"
                        onClick={() => set("duration_minutes", d)}
                        disabled={isActive}
                        className="px-3 py-1.5 rounded-[var(--radius)] text-xs font-semibold transition-all disabled:opacity-50"
                        style={{
                          background: form.duration_minutes === d ? "rgba(167,139,250,0.2)" : "var(--bg)",
                          border: `1px solid ${form.duration_minutes === d ? "#a78bfa" : "var(--border)"}`,
                          color: form.duration_minutes === d ? "#a78bfa" : "var(--text-2)",
                        }}>
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Type — read-only display, no change allowed */}
          <div>
            <label className="label mb-1.5 block">Type de séance</label>
            <div className="flex gap-3">
              {["COURS", "TP"].map(t => {
                const tc = TYPE_CONFIG[t];
                const active = form.session_type === t;
                return (
                  <button key={t} type="button"
                          onClick={() => { set("session_type", t); if (t === "COURS") set("tp_group", "NONE"); else if (form.tp_group === "NONE") set("tp_group", "GROUP_A"); }}
                          disabled={isActive}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-lg)] text-sm font-semibold transition-all disabled:opacity-50"
                          style={{
                            background: active ? tc.bg : "var(--bg)",
                            border: `1px solid ${active ? tc.color : "var(--border)"}`,
                            color: active ? tc.color : "var(--text-3)",
                          }}>
                    <tc.icon className="h-4 w-4" /> {tc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group (only if TP) */}
          {form.session_type === "TP" && (
            <div>
              <label className="label mb-1.5 block">Groupe</label>
              <div className="flex gap-2">
                {[
                  { val: "GROUP_A", label: "Groupe A" },
                  { val: "GROUP_B", label: "Groupe B" },
                ].map(g => {
                  const active = form.tp_group === g.val;
                  return (
                    <button key={g.val} type="button"
                            onClick={() => set("tp_group", g.val)}
                            disabled={isActive}
                            className="flex-1 py-2 rounded-[var(--radius)] text-xs font-semibold transition-all disabled:opacity-50"
                            style={{
                              background: active ? "rgba(251,191,36,0.15)" : "var(--bg)",
                              border: `1px solid ${active ? "#fbbf24" : "var(--border)"}`,
                              color: active ? "#fbbf24" : "var(--text-3)",
                            }}>
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes — always editable */}
          <div>
            <label className="label mb-1.5 block">Notes <span style={{ color: "var(--text-3)" }}>(optionnel)</span></label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                      placeholder="Ex: Salle B12, apporter les cahiers…"
                      rows={2} className="input w-full resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 py-2">
              Annuler
            </button>
            <button type="submit" disabled={saving}
                    className="flex-1 py-2 gap-2 btn disabled:opacity-40"
                    style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.4)", color: "#a78bfa" }}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde…</> : <><Pencil className="h-4 w-4" /> Enregistrer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const SeancesPage = () => {
  const { courseId } = useParams();
  const toast = useToast();

  const [seances,    setSeances]    = useState([]);
  const [course,     setCourse]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editSeance, setEditSeance] = useState(null); // séance being edited
  const [starting,   setStarting]   = useState(null);
  const [ending,     setEnding]     = useState(null);
  const [filter,     setFilter]     = useState("ALL");

  const load = async () => {
    setLoading(true);
    try {
      const [seanceRes, courseRes] = await Promise.all([
        axiosClient.get(`teacher/courses/${courseId}/seances/`),
        axiosClient.get(`courses/${courseId}/`),
      ]);
      setSeances(Array.isArray(seanceRes.data) ? seanceRes.data : []);
      setCourse(courseRes.data);
    } catch { toast.error("Erreur lors du chargement."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [courseId]);

  const handleStart = async (id) => {
    setStarting(id);
    try {
      await axiosClient.post(`teacher/seances/${id}/start/`);
      toast.success("Séance démarrée !");
      load();
    } catch (err) { toast.error(err?.response?.data?.error || "Erreur."); }
    finally { setStarting(null); }
  };

  const handleEnd = async (id) => {
    setEnding(id);
    try {
      const res = await axiosClient.post(`teacher/seances/${id}/end/`);
      toast.success(`Séance terminée. ${res.data.auto_absent_created} absences enregistrées.`);
      load();
    } catch (err) { toast.error(err?.response?.data?.error || "Erreur."); }
    finally { setEnding(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette séance ?")) return;
    try {
      await axiosClient.delete(`teacher/seances/${id}/`);
      toast.success("Séance supprimée.");
      load();
    } catch (err) { toast.error(err?.response?.data?.error || "Erreur."); }
  };

  const filtered = filter === "ALL" ? seances : seances.filter(s => s.status === filter);

  const groups = {
    ACTIVE:    filtered.filter(s => s.status === "ACTIVE"),
    SCHEDULED: filtered.filter(s => s.status === "SCHEDULED"),
    COMPLETED: filtered.filter(s => s.status === "COMPLETED"),
    CANCELLED: filtered.filter(s => s.status === "CANCELLED"),
  };

  const FILTERS = [
    { key: "ALL",       label: "Toutes",      count: seances.length },
    { key: "ACTIVE",    label: "En cours",    count: seances.filter(s => s.status === "ACTIVE").length },
    { key: "SCHEDULED", label: "Planifiées",  count: seances.filter(s => s.status === "SCHEDULED").length },
    { key: "COMPLETED", label: "Terminées",   count: seances.filter(s => s.status === "COMPLETED").length },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header fade-up">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/teacher/courses" className="label hover:text-cyan-400 transition-colors">
                Mes Cours
              </Link>
              <span className="label">/</span>
              <span className="label" style={{ color: "var(--text-2)" }}>
                {course?.title || "…"}
              </span>
            </div>
            <h1 className="page-title">Séances</h1>
            <p className="page-sub">Gérez les séances de présence pour ce cours.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-cyan gap-1.5">
            <Plus className="h-4 w-4" /> Nouvelle séance
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: filter === f.key ? "rgba(34,211,238,0.15)" : "var(--surface)",
                      border: `1px solid ${filter === f.key ? "#22d3ee" : "var(--border)"}`,
                      color: filter === f.key ? "#22d3ee" : "var(--text-3)",
                    }}>
              {f.label} {f.count > 0 && <span className="ml-1 opacity-70">({f.count})</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-[var(--radius-lg)]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Calendar className="h-8 w-8" style={{ color: "var(--text-3)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Aucune séance</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                Créez votre première séance avec le bouton ci-dessus.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {[
              { key: "ACTIVE",    label: "En cours" },
              { key: "SCHEDULED", label: "Planifiées" },
              { key: "COMPLETED", label: "Terminées" },
              { key: "CANCELLED", label: "Annulées"  },
            ].map(({ key, label }) => groups[key]?.length > 0 && (
              <div key={key}>
                <p className="label mb-3">{label} ({groups[key].length})</p>
                <div className="space-y-2">
                  {groups[key].map(s => (
                    <SeanceRow
                      key={s.id}
                      seance={s}
                      onStart={handleStart}
                      onEnd={handleEnd}
                      onDelete={handleDelete}
                      onEdit={setEditSeance}
                      starting={starting}
                      ending={ending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CreateSeanceModal
          courseId={courseId}
          onClose={() => setShowModal(false)}
          onCreated={load}
        />
      )}

      {editSeance && (
        <EditSeanceModal
          seance={editSeance}
          onClose={() => setEditSeance(null)}
          onSaved={load}
        />
      )}
    </DashboardLayout>
  );
};

export default SeancesPage;
