import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import EditCredentialsSection from "../../components/EditCredentialsSection";
import axiosClient from "../../api/axiosClient";
import {
  User, Mail, Hash, BookOpen, GraduationCap, Building2, Calendar,
  ShieldCheck, ScanFace, Camera, Upload, RefreshCcw, Check,
  AlertCircle, X, CheckCircle2, Sparkles, Clock, XCircle,
} from "lucide-react";

// ── Small helpers ─────────────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-4 rounded-[var(--radius)] px-4 py-3 transition-colors"
       style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
       onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-hover)"}
       onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
         style={{ background: "var(--surface-2)" }}>
      <Icon className="h-4 w-4" style={{ color: "var(--text-3)" }} />
    </div>
    <div className="min-w-0">
      <p className="label">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium" style={{ color: "var(--text-1)" }}>{value || "—"}</p>
    </div>
  </div>
);

// ── Face Registration Modal ───────────────────────────────────────────────────
const FaceRegisterModal = ({ open, onClose, onSuccess }) => {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const fileRef    = useRef(null);

  const [mode,        setMode]        = useState("webcam"); // "webcam" | "upload"
  const [cameraOn,    setCameraOn]    = useState(false);
  const [blob,        setBlob]        = useState(null);
  const [previewUrl,  setPreviewUrl]  = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [err,         setErr]         = useState("");
  const [done,        setDone]        = useState(false);

  // Reset every time the modal opens
  useEffect(() => {
    if (open) {
      setMode("webcam"); setBlob(null); setPreviewUrl(null);
      setErr(""); setDone(false); setCameraOn(false);
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line
  }, [open]);

  const startCamera = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) { videoRef.current.srcObject = stream; setCameraOn(true); }
    } catch {
      setErr("Camera not accessible. Please use the Upload Photo option.");
    }
  };

  const stopCamera = () => {
    const v = videoRef.current;
    if (v?.srcObject) { v.srcObject.getTracks().forEach(t => t.stop()); v.srcObject = null; }
    setCameraOn(false);
  };

  const switchMode = (m) => {
    stopCamera();
    setBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setErr("");
    setMode(m);
    if (m === "webcam") startCamera();
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, cv = canvasRef.current;
    cv.width = v.videoWidth; cv.height = v.videoHeight;
    cv.getContext("2d").drawImage(v, 0, 0);
    cv.toBlob(b => {
      if (b) { setBlob(b); setPreviewUrl(URL.createObjectURL(b)); stopCamera(); }
    }, "image/jpeg", 0.92);
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("Please select an image file (JPG, PNG...)."); return; }
    setBlob(f); setPreviewUrl(URL.createObjectURL(f)); setErr("");
  };

  const retake = () => {
    setBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (mode === "webcam") startCamera();
    else fileRef.current?.click();
  };

  const register = async () => {
    if (!blob) return;
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("image", blob, "face.jpg");
      await axiosClient.post("me/register-face/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setDone(true);
      onSuccess();
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.detail || "Submission failed. Make sure your face is clearly visible.";
      setErr(msg);
    } finally { setUploading(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.80)" }}>
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1120] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/15">
              <ScanFace className="h-4.5 w-4.5 text-violet-300" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/30">Attendance</p>
              <h3 className="text-lg font-semibold text-white">Face Registration</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {done ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30">
                <Clock className="h-8 w-8 text-amber-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Request Submitted!</p>
                <p className="mt-1 text-sm text-white/50">Your photo is pending admin review. You'll be notified once it's approved and your face is registered.</p>
              </div>
              <button onClick={onClose}
                      className="mt-2 rounded-xl bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 transition">
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Info banner */}
              <div className="flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/8 px-4 py-3">
                <Sparkles className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                <p className="text-xs text-violet-300/80">
                  Position your face in the centre of the frame, in good lighting. The system needs a clear frontal photo to work accurately.
                </p>
              </div>

              {/* Mode tabs */}
              {!blob && (
                <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                  <button onClick={() => switchMode("webcam")}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "webcam" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}>
                    <Camera className="h-4 w-4" /> Live Camera
                  </button>
                  <button onClick={() => switchMode("upload")}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "upload" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}>
                    <Upload className="h-4 w-4" /> Upload Photo
                  </button>
                </div>
              )}

              {/* Camera / preview area */}
              <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                {blob && previewUrl ? (
                  /* Preview */
                  <img src={previewUrl} alt="Face preview" className="h-full w-full object-cover" />
                ) : mode === "webcam" ? (
                  /* Live feed */
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                    {/* Overlay guide */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-40 w-32 rounded-full border-2 border-dashed border-violet-400/40" />
                    </div>
                  </>
                ) : (
                  /* Upload empty state */
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
                    <Upload className="h-10 w-10 text-white/15" />
                    <button onClick={() => fileRef.current?.click()}
                            className="rounded-lg border border-white/20 bg-white/5 px-5 py-2 text-sm text-white hover:bg-white/10 transition">
                      Choose a photo
                    </button>
                    <p className="text-xs text-white/30">JPG or PNG, clear frontal face</p>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </div>

              {err && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-300">{err}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {blob ? (
                  <>
                    <button onClick={retake}
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] transition">
                      <RefreshCcw className="h-3.5 w-3.5" /> Retake
                    </button>
                    <button onClick={register} disabled={uploading}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition">
                      {uploading ? (
                        <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> Registering...</>
                      ) : (
                        <><Check className="h-4 w-4" /> Register Face</>
                      )}
                    </button>
                  </>
                ) : mode === "webcam" ? (
                  <button onClick={capture} disabled={!cameraOn}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition">
                    <Camera className="h-4 w-4" /> Capture Photo
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const StudentProfilePage = () => {
  const { user, profile } = useAuth();
  const [faceModal,   setFaceModal]   = useState(false);
  const [hasFace,     setHasFace]     = useState(!!profile?.face_encoding);
  const [faceRequest, setFaceRequest] = useState(null); // { status, created_at, reject_reason, image_url }
  const [loadingReq,  setLoadingReq]  = useState(true);

  useEffect(() => { setHasFace(!!profile?.face_encoding); }, [profile]);

  const fetchFaceRequest = async () => {
    setLoadingReq(true);
    try {
      const res = await axiosClient.get("me/register-face/");
      setFaceRequest(res.data.status ? res.data : null);
    } catch { setFaceRequest(null); }
    finally { setLoadingReq(false); }
  };

  useEffect(() => { fetchFaceRequest(); }, []);

  const onFaceSuccess = () => {
    setFaceModal(false);
    fetchFaceRequest(); // refresh to show PENDING state
  };

  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join("").toUpperCase()
    || user?.username?.[0]?.toUpperCase() || "S";
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">

        <div className="page-header">
          <div>
            <p className="label">Account</p>
            <h1 className="page-title mt-1">Mon profil</h1>
          </div>
        </div>

        {/* Avatar card */}
        <div className="card flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius-lg)] text-xl font-bold text-white bg-violet-600">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>{fullName}</h2>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>@{user?.username}</p>
            <div className="mt-2 flex gap-2">
              <span className="badge badge-violet"><ShieldCheck className="h-3 w-3" /> Student</span>
              {user?.is_active && <span className="badge badge-green"><span className="h-1.5 w-1.5 rounded-full bg-green-400" />Actif</span>}
            </div>
          </div>
        </div>

        {/* ── Face Recognition Section ── */}
        <div>
          <p className="label mb-3">Face Recognition</p>
          {loadingReq ? (
            <div className="skeleton h-24 rounded-[var(--radius-lg)]" />
          ) : (() => {
            // Determine the display state
            const reqStatus = faceRequest?.status; // PENDING | APPROVED | REJECTED | null

            // Config per state
            const cfg = hasFace
              ? { border: "rgba(134,239,172,0.2)", bg: "rgba(134,239,172,0.04)", iconBorder: "border-green-500/30", iconBg: "bg-green-500/10", iconColor: "text-green-400", title: "Face Registered", sub: "Your face is used for automatic attendance tracking." }
              : reqStatus === "PENDING"
              ? { border: "rgba(245,158,11,0.25)", bg: "rgba(245,158,11,0.04)", iconBorder: "border-amber-500/30", iconBg: "bg-amber-500/10", iconColor: "text-amber-400", title: "Pending Admin Review", sub: "Your photo has been submitted. An admin will review it shortly." }
              : reqStatus === "REJECTED"
              ? { border: "rgba(239,68,68,0.25)", bg: "rgba(239,68,68,0.04)", iconBorder: "border-red-500/30", iconBg: "bg-red-500/10", iconColor: "text-red-400", title: "Request Rejected", sub: faceRequest?.reject_reason ? `Reason: ${faceRequest.reject_reason}` : "Your photo was rejected. Please resubmit a clearer photo." }
              : { border: "rgba(139,92,246,0.25)", bg: "rgba(139,92,246,0.05)", iconBorder: "border-violet-500/30", iconBg: "bg-violet-500/10", iconColor: "text-violet-400", title: "No Face Registered", sub: "Register your face so teachers can mark you present automatically." };

            const canSubmit = !hasFace && reqStatus !== "PENDING";
            const btnLabel  = hasFace ? "Update Face" : reqStatus === "REJECTED" ? "Resubmit Photo" : "Register Face";

            return (
              <div className="rounded-[var(--radius-lg)] p-5 transition-colors"
                   style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${cfg.iconBorder} ${cfg.iconBg}`}>
                      {reqStatus === "PENDING" ? <Clock className={`h-6 w-6 ${cfg.iconColor}`} />
                        : reqStatus === "REJECTED" ? <XCircle className={`h-6 w-6 ${cfg.iconColor}`} />
                        : hasFace ? <CheckCircle2 className={`h-6 w-6 ${cfg.iconColor}`} />
                        : <ScanFace className={`h-6 w-6 ${cfg.iconColor}`} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{cfg.title}</p>
                      <p className="text-xs mt-0.5 max-w-xs" style={{ color: "var(--text-3)" }}>{cfg.sub}</p>
                      {reqStatus === "PENDING" && faceRequest?.created_at && (
                        <p className="mt-1.5 text-xs text-amber-400/70">
                          Submitted {new Date(faceRequest.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action button — hidden when PENDING */}
                  {!hasFace && reqStatus !== "PENDING" && (
                    <button
                      onClick={() => setFaceModal(true)}
                      className="shrink-0 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 shadow-lg shadow-violet-500/25 transition"
                    >
                      {btnLabel}
                    </button>
                  )}
                  {hasFace && (
                    <button
                      onClick={() => setFaceModal(true)}
                      className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/[0.08] transition"
                    >
                      Update Face
                    </button>
                  )}
                </div>

                {/* Steps — only when nothing submitted yet */}
                {!hasFace && !reqStatus && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      { step: "1", text: "Open camera or upload a photo" },
                      { step: "2", text: "Make sure your face is clearly visible" },
                      { step: "3", text: "Submit — an admin will approve it" },
                    ].map(({ step, text }) => (
                      <div key={step} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-center">
                        <div className="mx-auto mb-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-300">{step}</div>
                        <p className="text-[11px] text-white/40 leading-tight">{text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending notice */}
                {reqStatus === "PENDING" && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2.5">
                    <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-300/80">An admin will review your photo soon. You'll receive a notification when it's approved or rejected.</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Personal info */}
        <div>
          <p className="label mb-3">Personal Information</p>
          <div className="space-y-2">
            <InfoRow icon={User}  label="Full Name" value={fullName} />
            <InfoRow icon={Mail}  label="Email"     value={user?.email} />
            <InfoRow icon={Hash}  label="Username"  value={user?.username} />
          </div>
        </div>

        {/* Academic info */}
        <div>
          <p className="label mb-3">Academic Information</p>
          <div className="space-y-2">
            <InfoRow icon={Hash}          label="Student ID"        value={profile?.student_id} />
            <InfoRow icon={BookOpen}      label="Filière (Program)" value={profile?.filiere?.name} />
            <InfoRow icon={Building2}     label="Department"        value={profile?.filiere?.department?.name} />
            <InfoRow icon={Calendar}      label="Semester"          value={profile?.semester ? `Semester ${profile.semester}` : null} />
            <InfoRow icon={GraduationCap} label="Account Type"      value="Student" />
          </div>
        </div>

        <EditCredentialsSection accent="violet" />
      </div>

      <FaceRegisterModal open={faceModal} onClose={() => setFaceModal(false)} onSuccess={onFaceSuccess} />
    </DashboardLayout>
  );
};

export default StudentProfilePage;
