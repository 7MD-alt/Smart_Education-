import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Calendar, Clock, Users, Play, CheckCircle2, XCircle,
  Plus, ChevronLeft, BookOpen, Loader2, AlertTriangle,
  Download, ClipboardList, Trash2, FlaskConical, GraduationCap,
  ArrowRight, Pencil, Video, Copy, Check, Mail, KeyRound,
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
          {seance.check_in_code && seance.status !== "COMPLETED" && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.15em]"
                  style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee" }}
                  title="Code de présence (à dicter en classe)">
              <KeyRound className="h-3 w-3" /> {seance.check_in_code}
            </span>
          )}
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
    check_in_code: "",   // optional — backend auto-generates if left empty
    is_online: false,
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);   // { meet_url, invited } after an online séance
  const [copied, setCopied] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(result.meet_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked — ignore */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (form.is_online) {
        // Online séance → dedicated endpoint creates the séance, the Jitsi meet,
        // and emails every enrolled student + the teacher via the n8n workflow.
        const res = await axiosClient.post("teacher/seances/online/", {
          course_id:        courseId,
          date:             form.date,
          start_time:       form.start_time,
          duration_minutes: form.duration_minutes,
        });
        toast.success(`Séance en ligne créée — ${res.data.invited} invitation(s) envoyée(s).`);
        onCreated();                              // refresh the list behind the modal
        setResult(res.data);                      // show the meet link panel (don't close yet)
      } else {
        await axiosClient.post(`teacher/courses/${courseId}/seances/`, { ...form });
        toast.success("Séance(s) créée(s) avec succès !");
        onCreated();
        onClose();
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  const accent = form.is_online ? "#a78bfa" : "#22d3ee";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-md rounded-[var(--radius-lg)] p-6 overflow-y-auto max-h-[90vh]"
           style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-full"
             style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />

        {/* ── SUCCESS PANEL (online séance created) ─────────────────────────── */}
        {result ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full"
                 style={{ background: "rgba(124,58,237,0.15)", border: "2px solid #a78bfa", boxShadow: "0 0 24px rgba(124,58,237,0.3)" }}>
              <Video className="h-8 w-8" style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: "#a78bfa" }}>Séance en ligne créée</p>
              <p className="text-xs mt-1 flex items-center justify-center gap-1.5" style={{ color: "var(--text-3)" }}>
                <Mail className="h-3.5 w-3.5" /> {result.invited} invitation(s) envoyée(s) par email
              </p>
            </div>

            {/* Meet link + copy */}
            <div className="w-full">
              <label className="label mb-1.5 block text-left">Lien de la réunion</label>
              <div className="flex items-center gap-2 rounded-[var(--radius)] px-3 py-2"
                   style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <span className="flex-1 truncate text-xs font-mono" style={{ color: "#22d3ee" }}>{result.meet_url}</span>
                <button type="button" onClick={copyLink}
                        className="shrink-0 flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-all"
                        style={{ background: copied ? "rgba(21,128,61,0.15)" : "rgba(124,58,237,0.12)", color: copied ? "#4ade80" : "#a78bfa", border: `1px solid ${copied ? "#4ade80" : "rgba(124,58,237,0.3)"}` }}>
                  {copied ? <><Check className="h-3 w-3" /> Copié</> : <><Copy className="h-3 w-3" /> Copier</>}
                </button>
              </div>
            </div>

            <div className="flex gap-3 w-full pt-1">
              <a href={result.meet_url} target="_blank" rel="noreferrer" className="flex-1">
                <button type="button" className="btn-violet w-full py-2 gap-2">
                  <Video className="h-4 w-4" /> Rejoindre
                </button>
              </a>
              <button type="button" onClick={onClose} className="btn-ghost flex-1 py-2">Fermer</button>
            </div>
          </div>
        ) : (
        <>
        <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-1)" }}>
          Nouvelle séance
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Online toggle ──────────────────────────────────────────────── */}
          <button type="button" onClick={() => set("is_online", !form.is_online)}
                  className="w-full flex items-center gap-3 rounded-[var(--radius-lg)] p-3 transition-all text-left"
                  style={{
                    background: form.is_online ? "rgba(124,58,237,0.12)" : "var(--bg)",
                    border: `1px solid ${form.is_online ? "rgba(124,58,237,0.4)" : "var(--border)"}`,
                  }}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)]"
                 style={{ background: form.is_online ? "rgba(124,58,237,0.2)" : "var(--surface)", border: `1px solid ${form.is_online ? "rgba(124,58,237,0.35)" : "var(--border)"}` }}>
              <Video className="h-4 w-4" style={{ color: form.is_online ? "#a78bfa" : "var(--text-3)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: form.is_online ? "#a78bfa" : "var(--text-1)" }}>Séance en ligne</p>
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>Crée un lien Jitsi et l'envoie aux étudiants par email</p>
            </div>
            {/* Switch */}
            <div className="shrink-0 h-5 w-9 rounded-full p-0.5 transition-all"
                 style={{ background: form.is_online ? "#7c3aed" : "var(--border)" }}>
              <div className="h-4 w-4 rounded-full bg-white transition-all"
                   style={{ transform: form.is_online ? "translateX(16px)" : "translateX(0)" }} />
            </div>
          </button>

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
                          background: form.duration_minutes === d ? `${accent}33` : "var(--bg)",
                          border: `1px solid ${form.duration_minutes === d ? accent : "var(--border)"}`,
                          color: form.duration_minutes === d ? accent : "var(--text-2)",
                        }}>
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Type + Group + Notes — only for in-person séances */}
          {!form.is_online ? (
            <>
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

              {/* Check-in code */}
              <div>
                <label className="label mb-1.5 block">
                  Code de présence <span style={{ color: "var(--text-3)" }}>(optionnel — auto-généré si vide)</span>
                </label>
                <input value={form.check_in_code}
                       onChange={e => set("check_in_code", e.target.value.toUpperCase())}
                       maxLength={12} placeholder="Laisser vide pour générer automatiquement"
                       className="input w-full tracking-[0.2em] font-semibold" />
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                  Les étudiants devront entrer ce code avant la reconnaissance faciale. Il ne leur est jamais envoyé.
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-2.5 rounded-[var(--radius)] p-3"
                 style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
              <Mail className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#a78bfa" }} />
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
                Un lien <strong style={{ color: "#a78bfa" }}>Jitsi Meet</strong> sera généré et envoyé par email
                à tous les étudiants inscrits ainsi qu'à vous-même, avec une invitation agenda (.ics).
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
                    className="btn-ghost flex-1 py-2">
              Annuler
            </button>
            <button type="submit" disabled={saving}
                    className="flex-1 py-2 gap-2 btn disabled:opacity-40"
                    style={{ background: `${accent}26`, border: `1px solid ${accent}`, color: accent }}>
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {form.is_online ? "Création & envoi…" : "Création…"}</>
                : form.is_online
                  ? <><Video className="h-4 w-4" /> Créer & envoyer</>
                  : <><Plus className="h-4 w-4" /> Créer</>}
            </button>
          </div>
        </form>
        </>
        )}
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
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 max-w-[40px]"
                style={{ background: "linear-gradient(90deg, rgba(34,211,238,0.5), transparent)" }} />
              <Link to="/teacher/courses" className="label hover:text-cyan-400 transition-colors">
                Mes Cours
              </Link>
              <span className="label" style={{ opacity: 0.4 }}>/</span>
              <span className="label" style={{ color: "var(--text-2)" }}>{course?.title || "…"}</span>
            </div>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 750, letterSpacing: "-0.04em", color: "#f0f0ff", lineHeight: 1.1 }}>
              Séances
            </h1>
            <p className="page-sub mt-2">Gérez les séances de présence pour ce cours.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-cyan gap-1.5 px-5 py-2.5">
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
