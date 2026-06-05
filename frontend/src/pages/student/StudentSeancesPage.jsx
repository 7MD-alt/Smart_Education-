import { useEffect, useRef, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Calendar, Clock, CheckCircle2, XCircle, Loader2,
  Camera, AlertTriangle, BookOpen, FlaskConical,
  GraduationCap, RefreshCw, Sparkles, KeyRound,
} from "lucide-react";

// ── Countdown hook ────────────────────────────────────────────────────────────
const useCountdown = (targetIso) => {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!targetIso) return;
    const tick = () => {
      const diff = new Date(targetIso) - Date.now();
      if (diff <= 0) { setText(""); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setText(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return text;
};

// ── Status badge ──────────────────────────────────────────────────────────────
const MyStatusBadge = ({ status }) => {
  if (!status) return null;
  const cfg = {
    PRESENT: { color: "#4ade80", bg: "rgba(21,128,61,0.12)",  icon: CheckCircle2, label: "Présent" },
    ABSENT:  { color: "#f87171", bg: "rgba(185,28,28,0.12)", icon: XCircle,      label: "Absent"  },
    LATE:    { color: "#fbbf24", bg: "rgba(180,83,9,0.12)",  icon: Clock,        label: "En retard"},
  }[status];
  if (!cfg) return null;
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ color: cfg.color, background: cfg.bg }}>
      <cfg.icon className="h-3.5 w-3.5" /> {cfg.label}
    </span>
  );
};

// ── Failure-reason metadata: icon, colour, guidance, retryable ────────────────
const REASON_META = {
  NOT_RECOGNIZED:    { color: "#f87171", title: "Visage non reconnu",      tip: "Vérifiez que c'est bien vous, avec un bon éclairage et le visage bien centré.", retry: true  },
  NO_FACE_DETECTED:  { color: "#fbbf24", title: "Aucun visage détecté",    tip: "Centrez votre visage dans l'ellipse et évitez le contre-jour.",                 retry: true  },
  MULTIPLE_FACES:    { color: "#fbbf24", title: "Plusieurs visages",       tip: "Assurez-vous d'être seul(e) dans le cadre.",                                    retry: true  },
  ENCODING_FAILED:   { color: "#fbbf24", title: "Image illisible",         tip: "Améliorez l'éclairage et tenez l'appareil stable.",                             retry: true  },
  RECOGNITION_ERROR: { color: "#f87171", title: "Erreur technique",        tip: "Un problème est survenu côté serveur. Réessayez dans un instant.",              retry: true  },
  ALREADY_CHECKED_IN:{ color: "#60a5fa", title: "Déjà pointé",             tip: "Votre présence a déjà été enregistrée pour cette séance.",                      retry: false },
  WINDOW_CLOSED:     { color: "#f87171", title: "Séance terminée",         tip: "La fenêtre de pointage est fermée.",                                            retry: false },
  WINDOW_NOT_OPEN:   { color: "#fbbf24", title: "Pas encore ouvert",       tip: "Revenez quand la séance démarre.",                                              retry: false },
  NOT_ACTIVE:        { color: "#f87171", title: "Séance inactive",         tip: "Cette séance n'accepte pas de pointage pour le moment.",                        retry: false },
  WRONG_GROUP:       { color: "#f87171", title: "Mauvais groupe",          tip: "Cette séance concerne un autre groupe de TP.",                                  retry: false },
  NO_REGISTERED_FACE:{ color: "#f87171", title: "Visage non enregistré",   tip: "Contactez un administrateur pour enregistrer votre visage.",                    retry: false },
};

// ── Check-in modal ────────────────────────────────────────────────────────────
const CheckInModal = ({ seance, onClose, onSuccess }) => {
  const toast   = useToast();
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  // Flow: (code →) camera → result. Camera is only acquired AFTER a valid code.
  const [step,   setStep]   = useState(seance.requires_code ? "code" : "camera");
  const [result, setResult] = useState(null);
  const [busy,   setBusy]   = useState(false);
  const [camErr, setCamErr] = useState(false);
  const [code,     setCode]     = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeErr,  setCodeErr]  = useState("");

  // Hard stop: kill every track and detach from the <video>.
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // Validate the séance code BEFORE unlocking the camera. The code is never
  // sent to students, so knowing it proves they're physically in the room.
  const verifyCode = async () => {
    const value = code.trim().toUpperCase();
    if (!value) { setCodeErr("Entrez le code de la séance."); return; }
    setCodeBusy(true); setCodeErr("");
    try {
      await axiosClient.post(`student/seances/${seance.id}/verify-code/`, { code: value });
      setStep("camera");   // valid → the camera effect below acquires the stream
    } catch (err) {
      setCodeErr(err?.response?.data?.error || "Code incorrect.");
    } finally { setCodeBusy(false); }
  };

  // Release the camera on unmount no matter which step we're on.
  useEffect(() => () => { stopCamera(); }, []);

  // Re-bind / re-acquire the stream when returning to the camera step (e.g. "Réessayer"),
  // since the <video> element unmounts while the result is shown.
  useEffect(() => {
    if (step !== "camera" || !videoRef.current) return;
    let cancelled = false;

    const live = streamRef.current?.getTracks().some(t => t.readyState === "live");
    if (live) {
      videoRef.current.srcObject = streamRef.current;
      return;
    }
    // Tracks were stopped (after a success/close) — re-acquire safely.
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640 } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch { if (!cancelled) setCamErr(true); }
    })();
    return () => { cancelled = true; };
  }, [step]);

  const capture = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append("image", blob, "selfie.jpg");
        if (seance.requires_code) fd.append("code", code.trim().toUpperCase());
        const res = await axiosClient.post(`student/seances/${seance.id}/check-in/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        // NOTE: the backend returns recognition failures as HTTP 200 with
        // matched:false — so we MUST branch on `matched`, not on HTTP status.
        const data = res.data ?? {};
        if (data.matched) {
          setResult({ success: true, ...data });
          stopCamera();        // attendance recorded — release the camera now
          onSuccess();         // refresh the séance list in the background (does NOT close the modal)
        } else {
          setResult({ success: false, ...data });
        }
        setStep("result");
      } catch (err) {
        const data = err?.response?.data ?? {};
        setResult({
          success: false,
          message: data.error || "Erreur de connexion. Réessayez.",
          reason:  data.reason || "RECOGNITION_ERROR",
          ...data,
        });
        setStep("result");
      } finally { setBusy(false); }
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] overflow-hidden"
           style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        <div className="p-5">
          <h2 className="text-sm font-bold mb-1" style={{ color: "var(--text-1)" }}>
            Pointer ma présence
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-3)" }}>
            {seance.course_title} · {seance.session_type === "TP" ? "TP" : "Cours"}
          </p>

          {step === "code" && (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full"
                     style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.4)" }}>
                  <KeyRound className="h-7 w-7 text-cyan-400" />
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                  Code de la séance
                </p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  Entrez le code communiqué par votre enseignant en classe pour
                  déverrouiller la reconnaissance faciale.
                </p>
              </div>
              <input
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setCodeErr(""); }}
                onKeyDown={e => e.key === "Enter" && verifyCode()}
                maxLength={12}
                autoFocus
                placeholder="EX : X4JXQR"
                className="w-full rounded-[var(--radius)] px-4 py-3 text-center text-lg font-bold tracking-[0.3em] outline-none"
                style={{ background: "var(--bg)", border: `1px solid ${codeErr ? "#f87171" : "var(--border)"}`,
                         color: "var(--text-1)" }}
              />
              {codeErr && <p className="text-xs text-center text-red-400">{codeErr}</p>}
              <button onClick={verifyCode} disabled={codeBusy}
                      className="btn-cyan w-full py-2.5 gap-2 disabled:opacity-40">
                {codeBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Vérification…</>
                          : <><KeyRound className="h-4 w-4" /> Valider le code</>}
              </button>
            </div>
          )}

          {step === "camera" && (
            <>
              {camErr ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                  <p className="text-sm text-center" style={{ color: "var(--text-3)" }}>
                    Impossible d'accéder à la caméra. Vérifiez les permissions.
                  </p>
                </div>
              ) : (
                <>
                  {/* Oval guide + video */}
                  <div className="relative overflow-hidden rounded-[var(--radius-lg)] mb-4"
                       style={{ background: "#000", aspectRatio: "4/3" }}>
                    <video ref={videoRef} autoPlay playsInline muted
                           className="w-full h-full object-cover scale-x-[-1]" />
                    {/* Oval overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div style={{
                        width: "55%", height: "70%",
                        border: "2px solid rgba(34,211,238,0.7)",
                        borderRadius: "50%",
                        boxShadow: "0 0 20px rgba(34,211,238,0.3)",
                      }} />
                    </div>
                    {busy && (
                      <div className="absolute inset-0 flex items-center justify-center"
                           style={{ background: "rgba(0,0,0,0.6)" }}>
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-center mb-4" style={{ color: "var(--text-3)" }}>
                    Centrez votre visage dans l'ellipse, puis capturez.
                  </p>
                  <button onClick={capture} disabled={busy}
                          className="btn-cyan w-full py-2.5 gap-2 disabled:opacity-40">
                    {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Vérification…</>
                           : <><Camera className="h-4 w-4" /> Capturer & vérifier</>}
                  </button>
                </>
              )}
            </>
          )}

          {step === "result" && result?.success && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full"
                   style={{ background: "rgba(21,128,61,0.15)", border: "2px solid #4ade80", boxShadow: "0 0 24px rgba(74,222,128,0.25)" }}>
                {result.status === "LATE"
                  ? <Clock className="h-8 w-8 text-amber-400" />
                  : <CheckCircle2 className="h-8 w-8 text-green-400" />}
              </div>
              <div>
                <p className="text-base font-bold" style={{ color: result.status === "LATE" ? "#fbbf24" : "#4ade80" }}>
                  {result.message}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                  Statut : <strong style={{ color: "var(--text-1)" }}>{result.status === "LATE" ? "En retard" : "Présent"}</strong>
                  {result.checked_in_at && <> · à {result.checked_in_at}</>}
                  {result.status === "LATE" && result.minutes_late > 0 && <> · +{result.minutes_late} min</>}
                </p>
              </div>

              {/* Match confidence review */}
              {result.confidence != null && (
                <div className="w-full">
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--text-3)" }}>
                    <span>Confiance de reconnaissance</span>
                    <span style={{ color: "#4ade80", fontWeight: 700 }}>{result.confidence}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill"
                         style={{ width: `${result.confidence}%`, background: "linear-gradient(90deg,#15803d,#4ade80)", boxShadow: "0 0 6px #4ade8060" }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "result" && !result?.success && (() => {
            const meta = REASON_META[result?.reason] || { color: "#f87171", title: "Échec", tip: result?.message, retry: true };
            return (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full"
                     style={{ background: `${meta.color}22`, border: `2px solid ${meta.color}`, boxShadow: `0 0 24px ${meta.color}30` }}>
                  {result?.reason === "ALREADY_CHECKED_IN"
                    ? <CheckCircle2 className="h-8 w-8" style={{ color: meta.color }} />
                    : <AlertTriangle className="h-8 w-8" style={{ color: meta.color }} />}
                </div>

                <div>
                  <p className="text-base font-bold" style={{ color: meta.color }}>{meta.title}</p>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-3)" }}>{meta.tip}</p>
                </div>

                {/* Already-checked-in shows the existing status */}
                {result?.reason === "ALREADY_CHECKED_IN" && result?.status && (
                  <MyStatusBadge status={result.status} />
                )}

                {/* Low-confidence failures still show the meter so students see how close they were */}
                {result?.confidence != null && (
                  <div className="w-full">
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--text-3)" }}>
                      <span>Confiance de reconnaissance</span>
                      <span style={{ color: meta.color, fontWeight: 700 }}>{result.confidence}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill"
                           style={{ width: `${Math.max(result.confidence, 3)}%`, background: `linear-gradient(90deg,${meta.color}80,${meta.color})`, boxShadow: `0 0 6px ${meta.color}60` }} />
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
                      Seuil requis : 100% à partir d'une correspondance suffisante.
                    </p>
                  </div>
                )}

                {meta.retry && (
                  <button onClick={() => { setResult(null); setStep("camera"); }}
                          className="btn-cyan text-sm px-4 py-2 gap-1.5">
                    <Camera className="h-3.5 w-3.5" /> Réessayer
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose} className="btn-ghost w-full py-2 text-sm">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Séance card ───────────────────────────────────────────────────────────────
const SeanceCard = ({ seance, onCheckIn }) => {
  const countdown = useCountdown(seance.can_check_in ? null : seance.window_opens_at);
  const typeColor = seance.session_type === "TP" ? "#fbbf24" : "#22d3ee";
  const TypeIcon  = seance.session_type === "TP" ? FlaskConical : GraduationCap;

  const isToday = seance.date === new Date().toISOString().slice(0, 10);

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] p-4 transition-all duration-200"
         style={{ background: "var(--surface)", border: `1px solid ${seance.status === "ACTIVE" ? "rgba(74,222,128,0.3)" : "var(--border)"}` }}>

      {/* Active glow */}
      {seance.status === "ACTIVE" && (
        <div className="absolute inset-0 pointer-events-none rounded-[var(--radius-lg)]"
             style={{ boxShadow: "0 0 20px rgba(74,222,128,0.1)" }} />
      )}

      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-full"
           style={{ background: `linear-gradient(90deg,transparent,${typeColor},transparent)` }} />

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)]"
             style={{ background: `${typeColor}15`, border: `1px solid ${typeColor}25` }}>
          <TypeIcon className="h-4 w-4" style={{ color: typeColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>
              {seance.course_title}
            </h3>
            {isToday && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(34,211,238,0.15)", color: "#22d3ee" }}>
                Aujourd'hui
              </span>
            )}
            {seance.status === "ACTIVE" && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-green-400"
                    style={{ background: "rgba(21,128,61,0.12)" }}>
                <span className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse inline-block" /> En cours
              </span>
            )}
          </div>

          <p className="text-xs flex items-center gap-1.5 mt-0.5 flex-wrap" style={{ color: "var(--text-3)" }}>
            <Calendar className="h-3 w-3" />
            {new Date(seance.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}
            <span>·</span>
            <Clock className="h-3 w-3" />
            {seance.start_time} · {seance.duration_minutes} min
            {seance.tp_group !== "NONE" && (
              <><span>·</span>
              <span style={{ color: "#fbbf24" }}>{seance.tp_group === "GROUP_A" ? "Groupe A" : "Groupe B"}</span></>
            )}
          </p>
        </div>

        {/* My status */}
        <MyStatusBadge status={seance.my_status} />
      </div>

      {/* Bottom action */}
      <div className="mt-3 flex items-center justify-between">
        {seance.can_check_in ? (
          <button onClick={() => onCheckIn(seance)}
                  className="btn-cyan px-4 py-2 text-sm gap-2 w-full">
            <Camera className="h-4 w-4" /> Pointer ma présence
          </button>
        ) : seance.my_status ? (
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Présence déjà enregistrée.
          </p>
        ) : seance.status === "SCHEDULED" && countdown ? (
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Accessible dans <strong style={{ color: "var(--text-1)" }}>{countdown}</strong>
          </p>
        ) : seance.status === "COMPLETED" ? (
          <p className="text-xs text-red-400">Séance terminée</p>
        ) : null}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const StudentSeancesPage = () => {
  const toast = useToast();
  const [seances,    setSeances]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [checkInSrc, setCheckInSrc] = useState(null); // seance to check in

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("student/seances/");
      setSeances(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error("Erreur lors du chargement des séances."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todaySeances    = seances.filter(s => s.date === today);
  const upcomingSeances = seances.filter(s => s.date > today && ["SCHEDULED", "ACTIVE"].includes(s.status));
  const pastSeances     = seances.filter(s => s.date < today || s.status === "COMPLETED");

  const Section = ({ title, items }) =>
    items.length === 0 ? null : (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="label">{title}</p>
          <span className="badge badge-cyan">{items.length}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(s => (
            <SeanceCard key={s.id} seance={s} onCheckIn={setCheckInSrc} />
          ))}
        </div>
      </div>
    );

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header fade-up">
          <div>
            <p className="label mb-1">Espace étudiant</p>
            <h1 className="page-title">Mes Séances</h1>
            <p className="page-sub">Retrouvez vos séances et pointez votre présence par reconnaissance faciale.</p>
          </div>
          <button onClick={load} className="btn-ghost gap-1.5 px-3">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-36 rounded-[var(--radius-lg)]" />)}
          </div>
        ) : seances.length === 0 ? (
          <div className="empty-state">
            <Calendar className="h-8 w-8" style={{ color: "var(--text-3)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Aucune séance</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                Vos séances apparaîtront ici dès que votre enseignant en créera une.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <Section title={`Aujourd'hui (${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })})`} items={todaySeances} />
            <Section title="À venir" items={upcomingSeances} />
            <Section title="Passées" items={pastSeances} />
          </div>
        )}
      </div>

      {checkInSrc && (
        <CheckInModal
          seance={checkInSrc}
          onClose={() => setCheckInSrc(null)}
          onSuccess={load}   /* refresh list in background; modal stays to show the review */
        />
      )}
    </DashboardLayout>
  );
};

export default StudentSeancesPage;
