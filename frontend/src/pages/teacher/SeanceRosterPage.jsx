import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { authedFetch } from "../../api/config";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Camera, CheckCircle2, XCircle, Clock, Loader2,
  ScanLine, Download, Users, Play, UserCheck, Sparkles,
  ChevronLeft, RefreshCw, AlertTriangle, FlaskConical,
  GraduationCap, KeyRound,
} from "lucide-react";

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS = {
  PRESENT: { color: "#4ade80", bg: "rgba(21,128,61,0.1)",  icon: CheckCircle2, label: "Présent" },
  ABSENT:  { color: "#f87171", bg: "rgba(185,28,28,0.1)", icon: XCircle,      label: "Absent"  },
  LATE:    { color: "#fbbf24", bg: "rgba(180,83,9,0.1)",  icon: Clock,        label: "En retard"},
};

// ── Student row ───────────────────────────────────────────────────────────────
const StudentRow = ({ student, onToggle, toggling, justRecognized }) => {
  const s = STATUS[student.status] || STATUS.ABSENT;
  const SIcon = s.icon;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-[var(--radius)] transition-all duration-300 ${justRecognized ? "ring-1 ring-green-400/40" : ""}`}
         style={{ background: justRecognized ? "rgba(21,128,61,0.08)" : "var(--bg)", border: "1px solid var(--border)" }}>
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
           style={{ background: `${s.color}20`, border: `1px solid ${s.color}30`, color: s.color }}>
        {student.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
          {student.full_name}
          {justRecognized && <Sparkles className="inline h-3.5 w-3.5 ml-1.5 text-green-400" />}
        </p>
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{student.student_id}</p>
      </div>

      {/* Current status pill */}
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ color: s.color, background: s.bg }}>
        <SIcon className="h-3 w-3" /> {s.label}
      </span>

      {/* Toggle button */}
      <div className="flex gap-1">
        {["PRESENT","LATE","ABSENT"].map(st => {
          const cfg = STATUS[st];
          const active = student.status === st;
          return (
            <button key={st}
                    onClick={() => onToggle(student.student_id, st)}
                    disabled={toggling === student.student_id}
                    title={cfg.label}
                    className="h-6 w-6 flex items-center justify-center rounded transition-all duration-150 disabled:opacity-40"
                    style={{
                      background: active ? `${cfg.color}20` : "transparent",
                      border: `1px solid ${active ? cfg.color : "transparent"}`,
                    }}>
              <cfg.icon className="h-3.5 w-3.5" style={{ color: active ? cfg.color : "var(--text-3)" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const SeanceRosterPage = () => {
  const { seanceId } = useParams();
  const toast = useToast();

  const [seance,      setSeance]      = useState(null);
  const [roster,      setRoster]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [scanning,    setScanning]    = useState(false);
  const [toggling,    setToggling]    = useState(null);
  const [bulkLoading, setBulkLoading] = useState(null);
  const [justRec,     setJustRec]     = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const [camMode,   setCamMode]   = useState(false);
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`teacher/seances/${seanceId}/`);
      setSeance(res.data);
      setRoster(res.data.roster || []);
    } catch { toast.error("Erreur lors du chargement."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [seanceId]);

  // Stop the camera when leaving the page (prevents the webcam light staying on).
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  // ── Camera helpers ──────────────────────────────────────────────────────────
  const startCamera = async () => {
    const constraints = [
      { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: true },
    ];
    for (const c of constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        streamRef.current = stream;
        setCamMode(true);   // render the <video>; the effect below attaches the stream
        return;
      } catch { /* try next */ }
    }
    toast.error("Impossible d'accéder à la caméra. Vérifiez les permissions du navigateur.");
  };

  // Attach the stream once the <video> element is actually in the DOM. (Setting
  // srcObject inside startCamera failed: the element isn't rendered until camMode
  // flips to true, so videoRef was still null and the feed stayed blank.)
  useEffect(() => {
    if (camMode && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play?.().catch(() => {});
    }
  }, [camMode]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamMode(false);
  };

  const captureAndScan = async () => {
    const video = videoRef.current;
    if (!video) return;
    // Guard: camera may not be ready yet (videoWidth 0 → blank capture).
    if (!video.videoWidth || !video.videoHeight) {
      toast.error("La caméra n'est pas encore prête. Patientez une seconde puis réessayez.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      setScanning(true);
      try {
        const fd = new FormData();
        fd.append("image", blob, "scan.jpg");
        const res = await axiosClient.post(`teacher/seances/${seanceId}/scan/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const data = res.data;
        setRoster(data.roster || []);
        setSeance(prev => ({ ...prev, status: data.seance?.status || prev?.status }));

        const newRec = new Set(
          (data.roster || []).filter(r => r.just_recognized).map(r => r.student_id)
        );
        setJustRec(newRec);
        setTimeout(() => setJustRec(new Set()), 5000);

        toast.success(`${data.newly_marked} nouveau(x) présent(s) détecté(s).`);
      } catch (err) {
        toast.error(err?.response?.data?.error || "Erreur de scan.");
      } finally {
        setScanning(false);
      }
    }, "image/jpeg", 0.9);
  };

  // ── Manual toggle ───────────────────────────────────────────────────────────
  const handleToggle = async (studentId, newStatus) => {
    setToggling(studentId);
    try {
      const res = await axiosClient.post(`teacher/seances/${seanceId}/manual/`, {
        records: [{ student_id: studentId, status: newStatus }],
      });
      // Put the toggled student at the end so they sink to the bottom of their group
      const newRoster = res.data.roster || [];
      const toggled = newRoster.find(s => s.student_id === studentId);
      const others  = newRoster.filter(s => s.student_id !== studentId);
      setRoster(toggled ? [...others, toggled] : newRoster);
    } catch { toast.error("Erreur lors de la mise à jour."); }
    finally { setToggling(null); }
  };

  // ── Bulk mark all ──────────────────────────────────────────────────────────
  const handleMarkAll = async (newStatus) => {
    if (roster.length === 0 || bulkLoading) return;
    setBulkLoading(newStatus);
    try {
      const records = roster.map(s => ({ student_id: s.student_id, status: newStatus }));
      const res = await axiosClient.post(`teacher/seances/${seanceId}/manual/`, { records });
      setRoster(res.data.roster || []);
      toast.success(`Tous les étudiants marqués "${STATUS[newStatus].label}".`);
    } catch { toast.error("Erreur lors de la mise à jour."); }
    finally { setBulkLoading(null); }
  };

  // ── Download report ─────────────────────────────────────────────────────────
  const downloadReport = async () => {
    if (!seance) return;
    setDownloading(true);
    try {
      const res = await authedFetch(
        `teacher/courses/${seance.course_id}/report/?seance_id=${seanceId}`
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `seance_${seanceId}_rapport.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Erreur lors du téléchargement."); }
    finally { setDownloading(false); }
  };

  // ── Computed stats ──────────────────────────────────────────────────────────
  const presentCount = roster.filter(s => s.status === "PRESENT").length;
  const absentCount  = roster.filter(s => s.status === "ABSENT").length;
  const lateCount    = roster.filter(s => s.status === "LATE").length;
  const rate         = roster.length ? Math.round((presentCount / roster.length) * 100) : 0;

  const typeLabel = seance?.session_type === "TP" ? "TP" : "Cours";
  const groupLabel = { GROUP_A: " — Groupe A", GROUP_B: " — Groupe B", NONE: "" }[seance?.tp_group] || "";

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="page-header fade-up">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to={`/teacher/courses/${seance?.course_id}/seances`} className="label hover:text-cyan-400 transition-colors flex items-center gap-1">
                <ChevronLeft className="h-3.5 w-3.5" /> Séances
              </Link>
            </div>
            <h1 className="page-title">
              {typeLabel}{groupLabel}
              {seance?.status === "ACTIVE" && (
                <span className="ml-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-green-400 bg-green-400/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> En cours
                </span>
              )}
            </h1>
            <p className="page-sub">
              {seance?.course_title} · {seance?.date} · {seance?.start_time} · {seance?.duration_minutes} min
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={load} className="btn-ghost gap-1.5 px-3 py-2 text-sm">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={downloadReport} disabled={downloading}
                    className="btn-ghost gap-1.5 px-3 py-2 text-sm text-green-400 disabled:opacity-40"
                    style={{ border: "1px solid rgba(21,128,61,0.25)", background: "rgba(21,128,61,0.08)" }}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Rapport
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 fade-up">
          {[
            { label: "Inscrits",  value: roster.length, color: "#a78bfa" },
            { label: "Présents",  value: presentCount,  color: "#4ade80" },
            { label: "Absents",   value: absentCount,   color: "#f87171" },
            { label: "En retard", value: lateCount,     color: "#fbbf24" },
          ].map(s => (
            <div key={s.label} className="rounded-[var(--radius-lg)] p-3 text-center"
                 style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Check-in code banner — teacher reads this out; never sent to students */}
        {seance?.check_in_code && (
          <div className="fade-up flex items-center justify-between gap-3 rounded-[var(--radius-lg)] px-4 py-3"
               style={{ animationDelay: "40ms", background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.25)" }}>
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-5 w-5 text-cyan-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>Code de présence</p>
                <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  Dictez-le en classe — les étudiants l'entrent avant la reconnaissance faciale.
                </p>
              </div>
            </div>
            <span className="rounded-[var(--radius)] px-4 py-2 text-2xl font-bold tracking-[0.25em] tabular-nums"
                  style={{ background: "var(--bg)", border: "1px solid rgba(34,211,238,0.4)", color: "#22d3ee" }}>
              {seance.check_in_code}
            </span>
          </div>
        )}

        {/* Attendance rate */}
        <div className="fade-up" style={{ animationDelay: "60ms" }}>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-3)" }}>
            <span>Taux de présence</span>
            <span style={{ color: rate >= 75 ? "#4ade80" : rate >= 50 ? "#fbbf24" : "#f87171", fontWeight: 700 }}>
              {rate}%
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill transition-all duration-500"
                 style={{
                   width: `${rate}%`,
                   background: `linear-gradient(90deg, ${rate >= 75 ? "#15803d" : rate >= 50 ? "#b45309" : "#b91c1c"}, ${rate >= 75 ? "#4ade80" : rate >= 50 ? "#fbbf24" : "#f87171"})`,
                 }} />
          </div>
        </div>

        {/* Camera panel */}
        {seance?.status === "ACTIVE" && (
          <div className="card fade-up" style={{ animationDelay: "80ms" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Scan facial</span>
              </div>
              {!camMode ? (
                <button onClick={startCamera} className="btn-cyan px-3 py-1.5 text-xs gap-1.5">
                  <Camera className="h-3.5 w-3.5" /> Ouvrir caméra
                </button>
              ) : (
                <button onClick={stopCamera} className="btn-ghost px-3 py-1.5 text-xs">
                  Fermer
                </button>
              )}
            </div>

            {camMode && (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-[var(--radius-lg)]" style={{ background: "#000" }}>
                  <video ref={videoRef} autoPlay playsInline muted
                         className="w-full max-h-64 object-contain" />
                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center"
                         style={{ background: "rgba(0,0,0,0.6)" }}>
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                        <span className="text-sm text-white">Reconnaissance en cours…</span>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={captureAndScan} disabled={scanning}
                        className="btn-cyan w-full py-2.5 gap-2 disabled:opacity-40">
                  <ScanLine className="h-4 w-4" />
                  {scanning ? "Scan en cours…" : "Scanner maintenant"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Roster */}
        <div className="fade-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              Liste de présence
            </span>
            <span className="badge badge-cyan">{roster.length} étudiants</span>
          </div>

          {/* Bulk actions */}
          {roster.length > 0 && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-[var(--radius)]"
                 style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-[11px] font-medium shrink-0" style={{ color: "var(--text-3)" }}>
                Tous marquer :
              </span>
              {[
                { st: "PRESENT", label: "Présents",  color: "#4ade80", border: "rgba(21,128,61,0.3)",  bg: "rgba(21,128,61,0.1)"  },
                { st: "LATE",    label: "En retard", color: "#fbbf24", border: "rgba(180,83,9,0.3)",   bg: "rgba(180,83,9,0.1)"   },
                { st: "ABSENT",  label: "Absents",   color: "#f87171", border: "rgba(185,28,28,0.3)",  bg: "rgba(185,28,28,0.1)"  },
              ].map(({ st, label, color, border, bg }) => (
                <button
                  key={st}
                  onClick={() => handleMarkAll(st)}
                  disabled={!!bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all disabled:opacity-40"
                  style={{ color, border: `1px solid ${border}`, background: bg }}
                >
                  {bulkLoading === st
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : (() => { const Icon = STATUS[st].icon; return <Icon className="h-3 w-3" />; })()}
                  {label}
                </button>
              ))}
            </div>
          )}

          {roster.length === 0 ? (
            <div className="empty-state">
              <Users className="h-8 w-8" style={{ color: "var(--text-3)" }} />
              <p className="text-sm" style={{ color: "var(--text-3)" }}>Aucun étudiant inscrit.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Present first */}
              {roster.filter(s => s.status === "PRESENT").map(s => (
                <StudentRow key={s.student_id} student={s}
                            onToggle={handleToggle} toggling={toggling}
                            justRecognized={justRec.has(s.student_id)} />
              ))}
              {/* Late */}
              {roster.filter(s => s.status === "LATE").map(s => (
                <StudentRow key={s.student_id} student={s}
                            onToggle={handleToggle} toggling={toggling}
                            justRecognized={justRec.has(s.student_id)} />
              ))}
              {/* Absent */}
              {roster.filter(s => s.status === "ABSENT").map(s => (
                <StudentRow key={s.student_id} student={s}
                            onToggle={handleToggle} toggling={toggling}
                            justRecognized={false} />
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default SeanceRosterPage;
