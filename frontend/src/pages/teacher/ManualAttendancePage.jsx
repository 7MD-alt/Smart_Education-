import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { authedFetch } from "../../api/config";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useToast } from "../../context/ToastContext";
import {
  ArrowLeft, Download, Loader2, Users, CheckCircle2,
  XCircle, Clock, CalendarCheck, ChevronRight, RefreshCw,
  AlertTriangle, BookOpen, BarChart2, ClipboardList,
} from "lucide-react";

// ── Status colours ─────────────────────────────────────────────────────────────
const S_COLOR = {
  PRESENT: "#4ade80",
  ABSENT:  "#f87171",
  LATE:    "#fbbf24",
};

const STATUS_MAP = {
  SCHEDULED:  { label: "Planifiée",  color: "#a78bfa", bg: "rgba(124,58,237,0.12)" },
  ACTIVE:     { label: "En cours",   color: "#4ade80", bg: "rgba(21,128,61,0.12)"  },
  COMPLETED:  { label: "Terminée",   color: "#22d3ee", bg: "rgba(8,145,178,0.12)"  },
  CANCELLED:  { label: "Annulée",    color: "#f87171", bg: "rgba(185,28,28,0.12)"  },
};

const TYPE_MAP = {
  COURS: { label: "Cours",       color: "#22d3ee" },
  TP:    { label: "TP",          color: "#fbbf24" },
};

const GROUP_MAP = {
  NONE:    "",
  GROUP_A: " · Gr. A",
  GROUP_B: " · Gr. B",
};

// ── Séance row ─────────────────────────────────────────────────────────────────
const SeanceRow = ({ seance, onNavigate }) => {
  const sm = STATUS_MAP[seance.status] || STATUS_MAP.SCHEDULED;
  const tm = TYPE_MAP[seance.session_type] || TYPE_MAP.COURS;
  const total = seance.total_records || 0;

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-[var(--radius)] transition-all duration-150 cursor-pointer group"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      onClick={() => onNavigate(seance.id)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#22d3ee40"; e.currentTarget.style.background = "rgba(8,145,178,0.04)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
    >
      {/* Date block */}
      <div className="flex flex-col items-center w-10 shrink-0">
        <span className="text-xs font-bold" style={{ color: "var(--text-1)" }}>
          {seance.date ? new Date(seance.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—"}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
          {seance.start_time?.slice(0, 5) || ""}
        </span>
      </div>

      {/* Type + status pills */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ color: tm.color, background: `${tm.color}18` }}>
          {tm.label}{GROUP_MAP[seance.tp_group] || ""}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ color: sm.color, background: sm.bg }}>
          {sm.label}
        </span>
      </div>

      {/* Duration */}
      <span className="text-xs shrink-0" style={{ color: "var(--text-3)" }}>
        {seance.duration_minutes} min
      </span>

      {/* Stats — show only when there are records */}
      <div className="flex-1 flex items-center gap-3">
        {total > 0 ? (
          <>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full" style={{
                width: `${seance.rate}%`,
                background: seance.rate >= 75 ? "#4ade80" : seance.rate >= 50 ? "#fbbf24" : "#f87171",
                transition: "width 0.4s ease",
              }} />
            </div>
            <span className="text-xs tabular-nums font-semibold shrink-0"
                  style={{ color: seance.rate >= 75 ? "#4ade80" : seance.rate >= 50 ? "#fbbf24" : "#f87171" }}>
              {seance.rate}%
            </span>
            <span className="text-[10px] shrink-0" style={{ color: "var(--text-3)" }}>
              {seance.present_count}P · {seance.absent_count}A · {seance.late_count}L
            </span>
          </>
        ) : (
          <span className="text-xs italic" style={{ color: "var(--text-3)" }}>Pas encore d'enregistrements</span>
        )}
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: "#22d3ee" }} />
    </div>
  );
};

// ── Student absence row ────────────────────────────────────────────────────────
const StudentAbsenceRow = ({ student, maxAbsences, idx }) => {
  const danger  = student.absent >= maxAbsences;
  const warning = student.absent >= Math.floor(maxAbsences * 0.7) && !danger;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius)] transition-colors"
         style={{
           background: danger ? "rgba(185,28,28,0.06)" : warning ? "rgba(180,83,9,0.06)" : "var(--bg)",
           border: `1px solid ${danger ? "rgba(185,28,28,0.2)" : warning ? "rgba(180,83,9,0.2)" : "var(--border)"}`,
         }}>
      <span className="w-5 text-xs text-center shrink-0" style={{ color: "var(--text-3)" }}>{idx + 1}</span>

      {/* Avatar */}
      <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0"
           style={{ background: danger ? "rgba(185,28,28,0.15)" : "var(--surface)", color: danger ? "#f87171" : "var(--text-2)" }}>
        {student.full_name?.[0]?.toUpperCase() || "?"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>{student.full_name}</p>
        <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{student.student_id}</p>
      </div>

      {/* Stat chips */}
      <div className="flex items-center gap-1.5">
        {[
          { label: `${student.present}P`, color: S_COLOR.PRESENT },
          { label: `${student.absent}A`,  color: S_COLOR.ABSENT  },
          { label: `${student.late}L`,    color: S_COLOR.LATE    },
        ].map(c => (
          <span key={c.label} className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                style={{ color: c.color, background: `${c.color}15` }}>
            {c.label}
          </span>
        ))}
      </div>

      {/* Rate bar */}
      <div className="w-16 flex items-center gap-1.5">
        <div className="flex-1 h-1 rounded-full" style={{ background: "var(--border)" }}>
          <div className="h-full rounded-full" style={{
            width: `${student.rate}%`,
            background: student.rate >= 75 ? "#4ade80" : student.rate >= 50 ? "#fbbf24" : "#f87171",
          }} />
        </div>
        <span className="text-[10px] tabular-nums w-7 text-right" style={{ color: "var(--text-3)" }}>{student.rate}%</span>
      </div>

      {(danger || warning) && (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: danger ? "#f87171" : "#fbbf24" }} />
      )}
    </div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
const ManualAttendancePage = () => {
  const { courseId } = useParams();
  const navigate     = useNavigate();
  const toast        = useToast();

  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [tab,         setTab]         = useState("seances"); // "seances" | "students"

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`teacher/courses/${courseId}/attendance-summary/`);
      setData(res.data);
    } catch { toast.error("Erreur lors du chargement."); }
    finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const res = await authedFetch(`teacher/courses/${courseId}/report/`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `rapport_${(data?.course_title || "cours").replace(/\s+/g, "_")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Rapport téléchargé.");
    } catch { toast.error("Erreur lors du téléchargement."); }
    finally { setDownloading(false); }
  };

  // ── Derived stats ────────────────────────────────────────────────────────────
  const seances   = data?.seances   || [];
  const students  = data?.students  || [];
  const maxAbs    = data?.max_absences || 3;

  const completedSeances = seances.filter(s => s.status === "COMPLETED");
  const totalPresent = completedSeances.reduce((a, s) => a + s.present_count, 0);
  const totalRecords = completedSeances.reduce((a, s) => a + s.total_records, 0);
  const overallRate  = totalRecords ? Math.round((totalPresent / totalRecords) * 100) : 0;
  const inDanger     = students.filter(s => s.absent >= maxAbs).length;

  return (
    <DashboardLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="page-header fade-up">
          <div>
            <Link to={`/teacher/courses`}
                  className="label hover:text-cyan-400 transition-colors flex items-center gap-1 mb-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Mes cours
            </Link>
            <h1 className="page-title mt-1">
              {loading ? "Chargement…" : data?.course_title || "Cours"}
            </h1>
            <p className="page-sub">Présences par séance · résumé des absences</p>
          </div>

          <div className="flex gap-2">
            <button onClick={load} className="btn-ghost px-3 py-2 text-sm gap-1.5">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={downloadReport}
              disabled={downloading || loading}
              className="btn px-4 py-2 text-sm gap-1.5 text-green-400 disabled:opacity-40"
              style={{ border: "1px solid rgba(21,128,61,0.25)", background: "rgba(21,128,61,0.08)" }}
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Rapport complet
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {!loading && data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 fade-up" style={{ animationDelay: "40ms" }}>
            {[
              { icon: CalendarCheck, label: "Séances",       value: seances.length,         color: "#22d3ee" },
              { icon: BarChart2,     label: "Taux global",   value: `${overallRate}%`,       color: overallRate >= 75 ? "#4ade80" : overallRate >= 50 ? "#fbbf24" : "#f87171" },
              { icon: Users,         label: "Étudiants",     value: students.length,         color: "#a78bfa" },
              { icon: AlertTriangle, label: "En danger",      value: inDanger,                color: inDanger > 0 ? "#f87171" : "#4ade80" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-[var(--radius-lg)] p-4 text-center"
                   style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <Icon className="h-4 w-4 mx-auto mb-1.5" style={{ color }} />
                <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-[var(--radius-lg)] fade-up"
             style={{ background: "var(--surface)", border: "1px solid var(--border)", animationDelay: "60ms" }}>
          {[
            { id: "seances",  label: "Séances",          icon: CalendarCheck },
            { id: "students", label: "Résumé absences",   icon: ClipboardList },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-[var(--radius)] transition-all duration-150"
                    style={tab === t.id
                      ? { background: "rgba(8,145,178,0.12)", color: "#22d3ee", border: "1px solid rgba(8,145,178,0.25)" }
                      : { color: "var(--text-3)", border: "1px solid transparent" }
                    }>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>

        ) : tab === "seances" ? (
          <div className="space-y-2 fade-up" style={{ animationDelay: "80ms" }}>
            {seances.length === 0 ? (
              <div className="empty-state">
                <CalendarCheck className="h-8 w-8" style={{ color: "var(--text-3)" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Aucune séance</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                    Créez des séances depuis l'onglet "Séances" du cours.
                  </p>
                </div>
              </div>
            ) : (
              seances.map(s => (
                <SeanceRow key={s.id} seance={s}
                           onNavigate={id => navigate(`/teacher/seances/${id}/roster`)} />
              ))
            )}
          </div>

        ) : (
          <div className="space-y-2 fade-up" style={{ animationDelay: "80ms" }}>
            {students.length === 0 ? (
              <div className="empty-state">
                <Users className="h-8 w-8" style={{ color: "var(--text-3)" }} />
                <p className="text-sm" style={{ color: "var(--text-3)" }}>Aucun enregistrement de présence.</p>
              </div>
            ) : (
              <>
                {/* Legend */}
                <div className="flex items-center gap-3 text-xs px-1" style={{ color: "var(--text-3)" }}>
                  <span>Trié par absences (desc.)</span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-400" /> ≥ {maxAbs} abs. = danger
                  </span>
                </div>
                {students.map((s, i) => (
                  <StudentAbsenceRow key={s.student_id} student={s} maxAbsences={maxAbs} idx={i} />
                ))}
              </>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default ManualAttendancePage;
