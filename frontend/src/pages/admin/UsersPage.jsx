import { useEffect, useState, useRef } from "react";
import axiosClient from "../../api/axiosClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Users, Plus, Search, Edit2, Trash2,
  ShieldCheck, GraduationCap, UserCircle,
  X, AlertCircle, Check, ScanFace, Camera,
  Upload, RefreshCcw, ChevronRight, Eye,
  BookOpen, CalendarCheck, CheckCircle2,
  XCircle, Clock, TrendingUp, ShieldAlert, Skull,
  Mail, Hash, Layers, FileStack, FileUp, Table2,
  ArrowUpDown,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "newest",    label: "Last added"   },
  { value: "oldest",    label: "First added"  },
  { value: "name_asc",  label: "Name A → Z"   },
  { value: "name_desc", label: "Name Z → A"   },
  { value: "username",  label: "Username A → Z"},
];

const ROLES = {
  ADMIN:   { label: "Admin",   icon: ShieldCheck,   color: "text-pink-300",   bg: "bg-pink-500/15",   border: "border-pink-500/30"   },
  TEACHER: { label: "Teacher", icon: UserCircle,    color: "text-cyan-300",   bg: "bg-cyan-500/15",   border: "border-cyan-500/30"   },
  STUDENT: { label: "Student", icon: GraduationCap, color: "text-violet-300", bg: "bg-violet-500/15", border: "border-violet-500/30" },
};

const getInitials = (u) => {
  const parts = [u?.first_name?.[0], u?.last_name?.[0]].filter(Boolean);
  return parts.length ? parts.join("").toUpperCase() : (u?.username?.[0]?.toUpperCase() || "?");
};

const Toast = ({ message, type = "success", onClose }) => (
  <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 rounded-xl border border-white/10 bg-[#0c1120] px-4 py-3 shadow-xl">
    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${type === "success" ? "bg-green-500/20" : "bg-red-500/20"}`}>
      {type === "success" ? <Check className="h-3.5 w-3.5 text-green-400" /> : <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
    </div>
    <p className="text-sm text-white">{message}</p>
    <button onClick={onClose} className="ml-2 text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
  </div>
);

const Input = ({ label, ...props }) => (
  <div>
    <label className="text-xs font-medium text-white/50">{label}</label>
    <input {...props} className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none transition" />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div>
    <label className="text-xs font-medium text-white/50">{label}</label>
    <select {...props} className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none transition">
      {children}
    </select>
  </div>
);

// ── Student Detail Modal ──────────────────────────────────────────────────────
const UserDetailModal = ({ open, onClose, userId, role }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const isTeacher = role === "TEACHER";

  useEffect(() => {
    if (!open || !userId || !role) return;
    setData(null); setError(""); setLoading(true);
    const url = isTeacher ? `admin/teachers/${userId}/detail/` : `admin/students/${userId}/detail/`;
    axiosClient.get(url)
      .then(r => setData(r.data))
      .catch(() => setError(`Failed to load ${isTeacher ? "teacher" : "student"} details.`))
      .finally(() => setLoading(false));
  }, [open, userId, role]);

  if (!open) return null;

  const fullName = data ? `${data.first_name} ${data.last_name}`.trim() || data.username : "Loading...";
  const accentColor = isTeacher ? "text-cyan-300" : "text-violet-300";
  const accentBg    = isTeacher ? "bg-cyan-500/10" : "bg-violet-500/10";

  const sc = (s) =>
    s === "DANGER"  ? { text: "text-red-400",   bg: "rgba(185,28,28,0.1)",  border: "rgba(185,28,28,0.25)",  Icon: Skull       } :
    s === "WARNING" ? { text: "text-amber-400", bg: "rgba(180,83,9,0.1)",   border: "rgba(180,83,9,0.25)",   Icon: ShieldAlert  } :
                      { text: "text-green-400", bg: "rgba(21,128,61,0.1)",  border: "rgba(21,128,61,0.25)",  Icon: CheckCircle2 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1120] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 ${accentBg} text-sm font-bold ${accentColor}`}>
              {data ? getInitials(data) : "..."}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/30">
                {isTeacher ? "Teacher Profile" : "Student Profile"}
              </p>
              <h3 className="text-lg font-semibold text-white">{fullName}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className={`h-6 w-6 animate-spin rounded-full border-2 border-white/10 ${isTeacher ? "border-t-cyan-400" : "border-t-violet-400"}`} />
            </div>
          )}
          {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

          {data && (
            <>
              {/* Identity chips */}
              {isTeacher ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { icon: UserCircle,    label: "Username",   value: `@${data.username}`,              color: "text-cyan-300"   },
                    { icon: Layers,        label: "Department", value: data.department?.code || "N/A",   color: "text-amber-300"  },
                    { icon: BookOpen,      label: "Courses",    value: data.stats.total_courses,         color: "text-violet-300" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon className={`h-3.5 w-3.5 ${color} opacity-70`} />
                        <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">{label}</p>
                      </div>
                      <p className={`text-sm font-semibold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { icon: Hash,          label: "Student ID", value: data.student_id,                 color: "text-violet-300" },
                    { icon: Layers,        label: "Semester",   value: `S${data.semester}`,             color: "text-cyan-300"   },
                    { icon: GraduationCap, label: "Filiere",    value: data.filiere?.code || "N/A",     color: "text-amber-300"  },
                    { icon: ScanFace,      label: "Face",       value: data.has_face ? "Registered" : "Not set",
                      color: data.has_face ? "text-green-300" : "text-red-300" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon className={`h-3.5 w-3.5 ${color} opacity-70`} />
                        <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">{label}</p>
                      </div>
                      <p className={`text-sm font-semibold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Contact row */}
              <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <Mail className="h-4 w-4 text-white/30 shrink-0" />
                <span className="text-sm text-white/60">{data.email || "No email"}</span>
                <span className="mx-2 text-white/10">|</span>
                <span className="text-xs text-white/30">@{data.username}</span>
                {isTeacher && data.department?.name && (
                  <><span className="mx-2 text-white/10">|</span>
                  <span className="text-xs text-white/40">{data.department.name}</span></>
                )}
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${data.is_active ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
                  {data.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Stats panel */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-white/30" />
                  <p className="text-sm font-semibold text-white">
                    {isTeacher ? "Teaching Overview" : "Overall Attendance"}
                  </p>
                  {data.stats.attendance_pct !== null && (
                    <span className={`ml-auto text-lg font-bold ${data.stats.attendance_pct >= 75 ? "text-green-400" : data.stats.attendance_pct >= 50 ? "text-amber-400" : "text-red-400"}`}>
                      {data.stats.attendance_pct}%
                    </span>
                  )}
                </div>

                {isTeacher ? (
                  <div className="grid grid-cols-4 gap-3 mb-2">
                    {[
                      { icon: BookOpen,     label: "Courses",   value: data.stats.total_courses,   color: "text-cyan-400"   },
                      { icon: Users,        label: "Students",  value: data.stats.total_students,  color: "text-violet-400" },
                      { icon: CalendarCheck,label: "Records",   value: data.stats.total_records,   color: "text-amber-400"  },
                      { icon: FileStack,    label: "Materials", value: data.stats.total_materials, color: "text-green-400"  },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="text-center">
                        <Icon className={`h-4 w-4 ${color} mx-auto mb-1 opacity-70`} />
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                        <p className="text-[10px] text-white/30">{label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { icon: BookOpen,     label: "Courses",  value: data.stats.total_courses,  color: "text-violet-400" },
                      { icon: CheckCircle2, label: "Present",  value: data.stats.total_present,  color: "text-green-400"  },
                      { icon: XCircle,      label: "Absent",   value: data.stats.total_absent,   color: "text-red-400"    },
                      { icon: Clock,        label: "Late",     value: data.stats.total_late,     color: "text-amber-400"  },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="text-center">
                        <Icon className={`h-4 w-4 ${color} mx-auto mb-1 opacity-70`} />
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                        <p className="text-[10px] text-white/30">{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {data.stats.attendance_pct !== null && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5 mt-2">
                    <div className={`h-1.5 rounded-full transition-all duration-700 ${data.stats.attendance_pct >= 75 ? "bg-green-500" : data.stats.attendance_pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                         style={{ width: `${data.stats.attendance_pct}%` }} />
                  </div>
                )}
              </div>

              {/* Course breakdown */}
              {data.courses.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-white/30 mb-3">
                    {isTeacher ? "Courses Taught" : "Course Breakdown"}
                  </p>
                  <div className="space-y-2">
                    {data.courses.map(c => {
                      const pct = isTeacher
                        ? (c.total_records > 0 ? Math.round(c.present / c.total_records * 100) : null)
                        : (c.total > 0 ? Math.round(c.present / c.total * 100) : null);
                      const s = isTeacher ? sc("OK") : sc(c.status);
                      const StatusIcon = s.Icon;

                      return (
                        <div key={c.id} className="rounded-xl bg-white/[0.02] p-4" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <p className="text-sm font-semibold text-white">{c.title}</p>
                            {!isTeacher && (
                              <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium shrink-0 ${s.text}`}
                                    style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                                <StatusIcon className="h-3 w-3" /> {c.status}
                              </span>
                            )}
                          </div>

                          {isTeacher ? (
                            <div className="grid grid-cols-4 gap-2 text-center">
                              <div><p className="text-base font-bold text-violet-400">{c.students}</p><p className="text-[10px] text-white/30">Students</p></div>
                              <div><p className="text-base font-bold text-green-400">{c.present}</p><p className="text-[10px] text-white/30">Present</p></div>
                              <div><p className="text-base font-bold text-red-400">{c.absent}</p><p className="text-[10px] text-white/30">Absent</p></div>
                              <div><p className="text-base font-bold text-amber-400">{c.materials}</p><p className="text-[10px] text-white/30">Materials</p></div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                              <div><p className="text-base font-bold text-green-400">{c.present}</p><p className="text-[10px] text-white/30">Present</p></div>
                              <div><p className="text-base font-bold text-red-400">{c.absent}</p><p className="text-[10px] text-white/30">Absent</p></div>
                              <div><p className="text-base font-bold text-amber-400">{c.late}</p><p className="text-[10px] text-white/30">Late</p></div>
                              <div><p className={`text-base font-bold ${s.text}`}>{c.absent}/{c.max_absences}</p><p className="text-[10px] text-white/30">Limit</p></div>
                            </div>
                          )}

                          {pct !== null && (
                            <div className="mt-3">
                              <div className="h-1 overflow-hidden rounded-full bg-white/5">
                                <div className={`h-1 rounded-full ${isTeacher ? "bg-cyan-500" : c.status === "DANGER" ? "bg-red-500" : c.status === "WARNING" ? "bg-amber-500" : "bg-green-500"}`}
                                     style={{ width: `${pct}%` }} />
                              </div>
                              <p className="mt-1 text-right text-[10px] text-white/25">{pct}% attendance rate</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BookOpen className="h-8 w-8 text-white/15 mb-2" />
                  <p className="text-sm text-white/40">
                    {isTeacher ? "No courses assigned yet." : "No courses enrolled for this semester."}
                  </p>
                </div>
              )}
            </>
          )}
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

// ── Face Capture Component ────────────────────────────────────────────────────
const FaceCaptureStep = ({ studentIdStr, studentName, onDone, onSkip, showToast }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("webcam");
  const [cameraOn, setCameraOn] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (mode === "webcam" && !cameraOn && !capturedBlob) startCamera();
    return () => stopCamera();
    // eslint-disable-next-line
  }, [mode]);

  const startCamera = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) { videoRef.current.srcObject = stream; setCameraOn(true); }
    } catch { setErr("Cannot access camera. Use the upload option instead."); }
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video?.srcObject) { video.srcObject.getTracks().forEach(t => t.stop()); video.srcObject = null; }
    setCameraOn(false);
  };

  const captureFromWebcam = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, cv = canvasRef.current;
    cv.width = v.videoWidth; cv.height = v.videoHeight;
    cv.getContext("2d").drawImage(v, 0, 0);
    cv.toBlob(blob => { if (blob) { setCapturedBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); stopCamera(); } }, "image/jpeg", 0.92);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Please select an image file."); return; }
    setCapturedBlob(file); setPreviewUrl(URL.createObjectURL(file)); setErr("");
  };

  const retake = () => {
    setCapturedBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (mode === "webcam") startCamera(); else fileInputRef.current?.click();
  };

  const registerFace = async () => {
    if (!capturedBlob) return;
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("student_id", studentIdStr);
      fd.append("image", capturedBlob, "face.jpg");
      await axiosClient.post("students/register-face/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      showToast("Face registered successfully", "success");
      onDone();
    } catch (error) {
      setErr(error.response?.data?.error || error.response?.data?.detail || "Face registration failed.");
    } finally { setUploading(false); }
  };

  return (
    <div className="px-6 py-5 space-y-4">
      <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-400" />
          <p className="text-sm text-green-300 font-medium">Account ready for {studentName}</p>
        </div>
        <p className="mt-1 text-xs text-green-300/70">Capture the student face for attendance recognition.</p>
      </div>
      {err && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</div>}
      {!capturedBlob && (
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button onClick={() => { stopCamera(); setMode("webcam"); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "webcam" ? "bg-white text-black" : "text-white/60 hover:text-white"}`}>
            <Camera className="h-4 w-4" /> Webcam
          </button>
          <button onClick={() => { stopCamera(); setMode("upload"); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "upload" ? "bg-white text-black" : "text-white/60 hover:text-white"}`}>
            <Upload className="h-4 w-4" /> Upload Photo
          </button>
        </div>
      )}
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
        {capturedBlob && previewUrl ? (
          <img src={previewUrl} alt="Captured" className="h-full w-full object-cover" />
        ) : mode === "webcam" ? (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Upload className="h-10 w-10 text-white/20" />
            <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition">Choose an image</button>
            <p className="text-xs text-white/30">JPG or PNG</p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      </div>
      <div className="flex items-center gap-2">
        {capturedBlob ? (
          <>
            <button onClick={retake} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.05] transition">
              <RefreshCcw className="h-3.5 w-3.5" /> Retake
            </button>
            <button onClick={registerFace} disabled={uploading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition">
              {uploading ? "Registering..." : <><span>Register Face</span><ChevronRight className="h-4 w-4" /></>}
            </button>
          </>
        ) : mode === "webcam" ? (
          <button onClick={captureFromWebcam} disabled={!cameraOn}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition">
            <Camera className="h-4 w-4" /> Capture
          </button>
        ) : null}
      </div>
      <div className="text-center">
        <button onClick={onSkip} className="text-xs text-white/40 hover:text-white/60 transition">Skip for now</button>
      </div>
    </div>
  );
};

// ── Create/Edit Modal ─────────────────────────────────────────────────────────
// ── Massar password preview ───────────────────────────────────────────────────
function computeStudentPassword(firstName, massarCode) {
  // Normalize accents → plain ASCII letters
  const name = (firstName || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z]/g, "").toLowerCase();
  const digits = (massarCode || "").replace(/\D/g, "");
  return `${name}${digits}` || "student1234";
}

const UserFormModal = ({ open, onClose, onSaved, user, departments, filieres, showToast, studentCount = 0 }) => {
  const isEdit = !!user;
  const [step, setStep] = useState(1);
  const [createdStudent, setCreatedStudent] = useState(null);
  const [form, setForm] = useState({
    username:"", email:"", first_name:"", last_name:"", role:"STUDENT",
    password:"", is_active:true,
    student_id:"", massar_code:"", filiere_id:"", semester:1, department_id:"",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ username:user.username||"", email:user.email||"", first_name:user.first_name||"",
                last_name:user.last_name||"", role:user.role||"STUDENT", password:"", is_active:user.is_active??true,
                student_id:"", massar_code:"", filiere_id:"", semester:1, department_id:"" });
    } else {
      setForm({ username:"", email:"", first_name:"", last_name:"", role:"STUDENT",
                password:"", is_active:true, student_id:String(studentCount + 1), massar_code:"", filiere_id:"", semester:1, department_id:"" });
    }
    setStep(1); setCreatedStudent(null); setErr(""); setShowPwd(false);
  }, [user, open]);

  const handleChange = f => e => setForm(p => ({ ...p, [f]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  // Auto-generated password preview for students
  const isStudent = form.role === "STUDENT";
  const autoPassword = computeStudentPassword(form.first_name, form.massar_code);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const payload = {
        username:form.username, email:form.email, first_name:form.first_name,
        last_name:form.last_name, role:form.role, is_active:form.is_active,
      };

      // Password logic
      if (isEdit) {
        if (form.password) payload.password = form.password;
      } else {
        // Students: use auto-generated password unless admin manually overrode it
        payload.password = (isStudent && !form.password) ? autoPassword : form.password;
        if (!payload.password) { setErr("Le mot de passe est requis."); setSaving(false); return; }
      }

      let savedUser;
      if (isEdit) {
        savedUser = (await axiosClient.patch(`users/${user.id}/`, payload)).data;
      } else {
        savedUser = (await axiosClient.post("users/", payload)).data;
        if (form.role === "STUDENT") {
          if (!form.student_id || !form.filiere_id) { setErr("ID étudiant et Filière requis."); setSaving(false); return; }
          if (!form.massar_code) { setErr("Le code Massar est requis."); setSaving(false); return; }
          await axiosClient.post("student-profiles/", {
            user_id: savedUser.id,
            student_id: form.student_id,
            massar_code: form.massar_code.trim().toUpperCase(),
            filiere_id: form.filiere_id,
            semester: Number(form.semester),
          });
        } else if (form.role === "TEACHER") {
          if (!form.department_id) { setErr("Le département est requis."); setSaving(false); return; }
          await axiosClient.post("teacher-profiles/", { user_id:savedUser.id, department_id:form.department_id });
        } else if (form.role === "ADMIN") {
          await axiosClient.post("admin-profiles/", { user_id:savedUser.id });
        }
      }

      if (!isEdit && form.role === "STUDENT") {
        setCreatedStudent({ studentIdStr:form.student_id, studentName:`${form.first_name} ${form.last_name}`.trim()||form.username });
        setStep(2); showToast("Compte créé","success"); onSaved();
      } else {
        showToast(isEdit ? "Utilisateur mis à jour" : "Utilisateur créé","success"); onSaved(); onClose();
      }
    } catch (error) {
      const msg = error.response?.data ? (typeof error.response.data==="string" ? error.response.data : JSON.stringify(error.response.data)) : error.message;
      setErr(msg);
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.7)" }}>
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1120] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/30">
              {step===2 && <><span>Étape 2 / 2</span><span className="text-white/20">·</span></>}
              <span>{isEdit ? "Modifier l'utilisateur" : step===1 ? "Infos du compte" : "Enregistrement facial"}</span>
            </div>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {isEdit ? user.username : step===1 ? "Créer un utilisateur" : "Enregistrer le visage"}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>

        {!isEdit && form.role==="STUDENT" && (
          <div className="h-1 bg-white/5"><div className="h-1 bg-violet-400 transition-all duration-300" style={{ width:step===1?"50%":"100%" }} /></div>
        )}

        {step===1 && (
          <>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {err && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</div>}

              {/* Role picker */}
              {!isEdit && (
                <div>
                  <label className="text-xs font-medium text-white/50">Rôle</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {Object.entries(ROLES).map(([key,r]) => {
                      const Icon = r.icon; const sel = form.role===key;
                      return (
                        <button key={key} type="button" onClick={() => setForm(p=>({...p, role:key, student_id: key==="STUDENT" && !p.student_id ? String(studentCount + 1) : p.student_id}))}
                                className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 transition ${sel?`${r.border} ${r.bg} ${r.color}`:"border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20"}`}>
                          <Icon className="h-4 w-4" /><span className="text-xs font-medium">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Prénom" value={form.first_name} onChange={handleChange("first_name")} />
                <Input label="Nom"    value={form.last_name}  onChange={handleChange("last_name")}  />
              </div>

              <Input label="Nom d'utilisateur" value={form.username} onChange={handleChange("username")} required />
              <Input label="Email" type="email" value={form.email} onChange={handleChange("email")} />

              {/* Password — auto for students, manual for others */}
              {isStudent && !isEdit ? (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-violet-300 uppercase tracking-widest">Mot de passe automatique</p>
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                            className="text-[10px] text-white/40 hover:text-white/70 transition">
                      {showPwd ? "Masquer" : "Afficher"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                    <span className="flex-1 font-mono text-sm tracking-widest"
                          style={{ color: showPwd ? "#a78bfa" : "transparent", textShadow: showPwd ? "none" : "0 0 8px #a78bfa" }}>
                      {autoPassword}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/35">
                    Généré depuis le prénom + chiffres du code Massar. L'étudiant peut le modifier dans son profil.
                  </p>
                  <Input label="Remplacer le mot de passe (optionnel)" type="password" value={form.password}
                         onChange={handleChange("password")} placeholder="Laisser vide pour utiliser l'automatique" />
                </div>
              ) : (
                <Input label={isEdit ? "Nouveau mot de passe (vide = inchangé)" : "Mot de passe"}
                       type="password" value={form.password} onChange={handleChange("password")} required={!isEdit} />
              )}

              {/* Student-specific fields */}
              {!isEdit && form.role==="STUDENT" && (
                <div className="space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-widest text-violet-300">Infos étudiant</p>
                  <Input label="ID étudiant" value={form.student_id} onChange={handleChange("student_id")} required placeholder="ex. IATE-S4-001" />
                  <div>
                    <label className="text-xs font-medium text-white/50">Code Massar <span className="text-violet-400">*</span></label>
                    <input
                      value={form.massar_code}
                      onChange={e => setForm(p => ({ ...p, massar_code: e.target.value.toUpperCase() }))}
                      placeholder="ex. G123456789"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white font-mono placeholder:text-white/25 focus:border-violet-400/50 focus:outline-none transition"
                      required
                    />
                    <p className="mt-1 text-[10px] text-white/35">Code national Massar — obligatoire et unique.</p>
                  </div>
                  <Select label="Filière" value={form.filiere_id} onChange={handleChange("filiere_id")} required>
                    <option value="" className="bg-[#0c1120]">Choisir une filière...</option>
                    {filieres.map(f => <option key={f.id} value={f.id} className="bg-[#0c1120]">{f.code} — {f.name}</option>)}
                  </Select>
                  <Input label="Semestre" type="number" min="1" max="10" value={form.semester} onChange={handleChange("semester")} required />
                </div>
              )}

              {/* Teacher-specific fields */}
              {!isEdit && form.role==="TEACHER" && (
                <div className="space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-widest text-cyan-300">Infos enseignant</p>
                  <Select label="Département" value={form.department_id} onChange={handleChange("department_id")} required>
                    <option value="" className="bg-[#0c1120]">Choisir un département...</option>
                    {departments.map(d => <option key={d.id} value={d.id} className="bg-[#0c1120]">{d.code} — {d.name}</option>)}
                  </Select>
                </div>
              )}

              <label className="flex items-center gap-3 pt-2">
                <input type="checkbox" checked={form.is_active} onChange={handleChange("is_active")} className="h-4 w-4 rounded border-white/20 bg-transparent" />
                <span className="text-sm text-white/60">Compte actif</span>
              </label>
            </form>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-6 py-4">
              <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/[0.05] transition">
                Annuler
              </button>
              <button onClick={handleSubmit} disabled={saving}
                      className="flex items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50 transition">
                {saving ? "Enregistrement..." : isEdit ? "Sauvegarder" : form.role==="STUDENT" ? "Continuer" : "Créer"}
                {!saving && !isEdit && form.role==="STUDENT" && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}

        {step===2 && createdStudent && (
          <FaceCaptureStep studentIdStr={createdStudent.studentIdStr} studentName={createdStudent.studentName}
                           onDone={() => { onSaved(); onClose(); }} onSkip={() => { onSaved(); onClose(); }} showToast={showToast} />
        )}
      </div>
    </div>
  );
};

// ── Face Only Modal ───────────────────────────────────────────────────────────
const FaceOnlyModal = ({ open, onClose, studentProfile, onSaved, showToast }) => {
  if (!open || !studentProfile) return null;
  const u = studentProfile.user || {};
  const fullName = `${u.first_name||""} ${u.last_name||""}`.trim() || u.username || "student";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.7)" }}>
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1120] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/30">Face Registration</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Register / Update Face</h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>
        <FaceCaptureStep studentIdStr={studentProfile.student_id} studentName={fullName}
                         onDone={() => { onSaved(); onClose(); }} onSkip={onClose} showToast={showToast} />
      </div>
    </div>
  );
};

// ── Delete Confirm ────────────────────────────────────────────────────────────
const DeleteConfirm = ({ user, onCancel, onConfirm, deleting }) => {
  if (!user) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0c1120] p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">Delete user?</h3>
        <p className="mt-2 text-sm text-white/50">This will permanently delete <span className="text-white">{user.username}</span> and all their data.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/[0.05] transition">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50 transition">
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── CSV Import Modal ──────────────────────────────────────────────────────────
const CSV_TEMPLATE_HEADERS = [
  "username", "role", "first_name", "last_name", "email",
  "password",          // required for TEACHER/ADMIN; optional for STUDENT (auto-generated)
  "student_id", "massar_code", "filiere_id", "semester",
  "department_id",
];
const CSV_EXAMPLE_ROWS = [
  ["ahmed.alaoui",  "STUDENT", "Ahmed",  "Alaoui",  "ahmed@example.com",  "",          "IATE-S4-001", "G123456789", "1", "4", ""],
  ["sara.benali",   "STUDENT", "Sara",   "Benali",  "sara@example.com",   "",          "IATE-S4-002", "K987654321", "1", "4", ""],
  ["fatima_t",      "TEACHER", "Fatima", "Benali",  "fatima@example.com", "Pass1234!", "",            "",           "",  "",  "2"],
  ["admin_ry",      "ADMIN",   "Rayan",  "Idrissi", "rayan@example.com",  "Pass1234!", "",            "",           "",  "",  ""],
];

const ImportCSVModal = ({ open, onClose, onImported, showToast }) => {
  const fileRef    = useRef(null);
  const [file,     setFile]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null); // { created, skipped, errors }
  const [err,      setErr]      = useState("");

  useEffect(() => {
    if (!open) { setFile(null); setResult(null); setErr(""); }
  }, [open]);

  const downloadTemplate = () => {
    const rows = [CSV_TEMPLATE_HEADERS, ...CSV_EXAMPLE_ROWS];
    const csv  = rows.map(r => r.join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url; a.download = "users_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".csv")) { setErr("Please select a .csv file."); return; }
    setFile(f); setErr(""); setResult(null);
  };

  const handleUpload = async () => {
    if (!file) { setErr("No file selected."); return; }
    setLoading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axiosClient.post("admin/import-users/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data);
      if (res.data.created > 0) { onImported(); }
      if (res.data.created > 0 && res.data.errors?.length === 0) {
        showToast(`${res.data.created} user(s) imported successfully`, "success");
      }
    } catch (e) {
      setErr(e.response?.data?.error || e.response?.data?.detail || "Import failed.");
    } finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1120] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30">
              <Table2 className="h-4.5 w-4.5 text-violet-300" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/30">Bulk Import</p>
              <h3 className="text-lg font-semibold text-white">Import Users via CSV</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Template download */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileUp className="h-5 w-5 text-violet-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Download Template</p>
                <p className="text-xs text-white/45 mt-0.5">
                  Colonnes requises : <span className="text-violet-300">username, role</span><br/>
                  Étudiants : <span className="text-violet-300">student_id, massar_code</span> requis — <span className="text-green-300">password auto-généré</span><br/>
                  Enseignants/Admins : <span className="text-violet-300">password</span> requis
                </p>
              </div>
            </div>
            <button onClick={downloadTemplate}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/20 transition">
              <FileUp className="h-3.5 w-3.5" /> Download template.csv
            </button>
          </div>

          {/* Role values reminder */}
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-white/50">
              <span className="text-amber-300 font-medium">role</span> must be exactly: <span className="text-white/70">STUDENT</span>, <span className="text-white/70">TEACHER</span>, or <span className="text-white/70">ADMIN</span>
            </p>
          </div>

          {/* File picker */}
          <div>
            <label className="text-xs font-medium text-white/50">Select CSV File</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-8 transition hover:border-white/30 hover:bg-white/[0.04]"
            >
              <Upload className="h-7 w-7 text-white/20" />
              {file ? (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <p className="text-sm font-medium text-green-300">{file.name}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-white/40">Click to choose a .csv file</p>
                  <p className="text-xs text-white/25">or drag and drop</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </div>

          {err && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{err}</div>
          )}

          {/* Results */}
          {result && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-white/30">Import Results</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                  <p className="text-2xl font-bold text-green-400">{result.created}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Created</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-2xl font-bold text-amber-400">{result.skipped}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Skipped</p>
                </div>
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-2xl font-bold text-red-400">{result.errors?.length ?? 0}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Errors</p>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  <p className="text-xs font-medium text-red-400">Row errors:</p>
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/15 px-3 py-2">
                      <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-300">Row {e.row}: {e.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/[0.05] transition">
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button onClick={handleUpload} disabled={!file || loading}
                    className="flex items-center gap-2 rounded-lg bg-violet-500 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition">
              {loading ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> Importing...</>
              ) : (
                <><Upload className="h-4 w-4" /> Import</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Pill filter button ────────────────────────────────────────────────────────
const FilterPill = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className="rounded-full px-3 py-1 text-xs font-medium transition-all duration-150"
    style={active
      ? { background: "rgba(167,139,250,0.18)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.35)" }
      : { background: "transparent", color: "var(--text-3)", border: "1px solid var(--border)" }}
  >
    {children}
  </button>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const UsersPage = () => {
  const [users,            setUsers]            = useState([]);
  const [studentProfiles,  setStudentProfiles]  = useState([]);
  const [teacherProfiles,  setTeacherProfiles]  = useState([]);
  const [filieres,         setFilieres]         = useState([]);
  const [departments,      setDepartments]      = useState([]);
  const [search,          setSearch]          = useState("");
  const [roleFilter,      setRoleFilter]      = useState("ALL");
  const [statusFilter,    setStatusFilter]    = useState("ALL");   // ALL | ACTIVE | INACTIVE
  const [faceFilter,      setFaceFilter]      = useState("ALL");   // ALL | HAS_FACE | NO_FACE
  const [filiereFilter,   setFiliereFilter]   = useState("");      // filiere id or ""
  const [semesterFilter,  setSemesterFilter]  = useState("");      // "1".."10" or ""
  const [deptFilter,      setDeptFilter]      = useState("");      // department id or ""
  const [sortBy,          setSortBy]          = useState("newest");
  const [loading,         setLoading]         = useState(true);
  const [modalOpen,       setModalOpen]       = useState(false);
  const [editingUser,     setEditingUser]     = useState(null);
  const [faceTarget,      setFaceTarget]      = useState(null);
  const [deleteTarget,    setDeleteTarget]    = useState(null);
  const [deleting,        setDeleting]        = useState(false);
  const [detailTarget,    setDetailTarget]    = useState(null);
  const [importOpen,      setImportOpen]      = useState(false);
  const [toast,           setToast]           = useState(null);

  const showToast = (message, type="success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [u,sp,tp,d,f] = await Promise.all([
        axiosClient.get("users/"), axiosClient.get("student-profiles/"),
        axiosClient.get("teacher-profiles/"),
        axiosClient.get("departments/"), axiosClient.get("filieres/"),
      ]);
      setUsers(Array.isArray(u.data) ? u.data : u.data.results||[]);
      setStudentProfiles(Array.isArray(sp.data) ? sp.data : sp.data.results||[]);
      setTeacherProfiles(Array.isArray(tp.data) ? tp.data : tp.data.results||[]);
      setDepartments(Array.isArray(d.data) ? d.data : d.data.results||[]);
      setFilieres(Array.isArray(f.data) ? f.data : f.data.results||[]);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Reset sub-filters when role tab changes
  const handleRoleFilter = (role) => {
    setRoleFilter(role);
    setFaceFilter("ALL");
    setFiliereFilter("");
    setSemesterFilter("");
    setDeptFilter("");
  };

  const clearAll = () => {
    setSearch(""); setRoleFilter("ALL"); setStatusFilter("ALL");
    setFaceFilter("ALL"); setFiliereFilter(""); setSemesterFilter(""); setDeptFilter("");
    setSortBy("newest");
  };

  const getSP = (uid) => studentProfiles.find(p => (p.user?.id ?? p.user) === uid);
  const getTP = (uid) => teacherProfiles.find(p => (p.user?.id ?? p.user) === uid);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosClient.delete(`users/${deleteTarget.id}/`);
      showToast("User deleted","success"); setDeleteTarget(null); fetchAll();
    } catch { showToast("Failed to delete user","error"); }
    finally { setDeleting(false); }
  };

  const filtered = users.filter(u => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (statusFilter === "ACTIVE"   && !u.is_active) return false;
    if (statusFilter === "INACTIVE" &&  u.is_active) return false;

    const sp = u.role === "STUDENT" ? getSP(u.id) : null;
    const tp = u.role === "TEACHER" ? getTP(u.id) : null;

    // Face filter (students only)
    if (faceFilter === "HAS_FACE" && !sp?.face_encoding) return false;
    if (faceFilter === "NO_FACE"  &&  sp?.face_encoding) return false;

    // Filière filter (students)
    if (filiereFilter && sp) {
      const spFiliereId = String(sp.filiere?.id ?? sp.filiere ?? "");
      if (spFiliereId !== filiereFilter) return false;
    }

    // Semester filter (students)
    if (semesterFilter && sp) {
      if (String(sp.semester) !== semesterFilter) return false;
    }

    // Department filter (teachers)
    if (deptFilter && tp) {
      const tpDeptId = String(tp.department?.id ?? tp.department ?? "");
      if (tpDeptId !== deptFilter) return false;
    }

    // Search
    if (search) {
      const s = search.toLowerCase();
      const nameMatch = `${u.first_name||""} ${u.last_name||""}`.toLowerCase().includes(s);
      const usernameMatch = u.username.toLowerCase().includes(s);
      const emailMatch = u.email?.toLowerCase().includes(s) || false;
      const studentIdMatch = sp?.student_id?.toLowerCase().includes(s) || false;
      if (!nameMatch && !usernameMatch && !emailMatch && !studentIdMatch) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "newest")    return b.id - a.id;
    if (sortBy === "oldest")    return a.id - b.id;
    if (sortBy === "username")  return a.username.localeCompare(b.username);
    const nameA = `${a.first_name||""} ${a.last_name||""}`.trim().toLowerCase();
    const nameB = `${b.first_name||""} ${b.last_name||""}`.trim().toLowerCase();
    if (sortBy === "name_asc")  return nameA.localeCompare(nameB);
    if (sortBy === "name_desc") return nameB.localeCompare(nameA);
    return 0;
  });

  const counts = {
    ALL: users.length,
    ADMIN: users.filter(u=>u.role==="ADMIN").length,
    TEACHER: users.filter(u=>u.role==="TEACHER").length,
    STUDENT: users.filter(u=>u.role==="STUDENT").length,
  };

  const hasActiveFilters = statusFilter !== "ALL" || faceFilter !== "ALL" || filiereFilter || semesterFilter || deptFilter || search || sortBy !== "newest";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <p className="label">Admin / Users</p>
            <h1 className="page-title mt-1">Users</h1>
            <p className="page-sub">Create and manage platform users across all roles.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setImportOpen(true)}
                    className="flex items-center gap-1.5 rounded-[var(--radius)] border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/20 transition">
              <Table2 className="h-4 w-4" /> Import CSV
            </button>
            <button onClick={() => { setEditingUser(null); setModalOpen(true); }} className="btn-primary gap-1.5">
              <Plus className="h-4 w-4" /> New User
            </button>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="space-y-3">

          {/* Row 1: Role tabs + Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-[var(--radius)] p-1" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
              {[{key:"ALL",label:"Tous"},{key:"ADMIN",label:"Admins"},{key:"TEACHER",label:"Enseignants"},{key:"STUDENT",label:"Étudiants"}].map(({key,label}) => (
                <button key={key} onClick={() => handleRoleFilter(key)}
                        className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition ${roleFilter===key?"bg-[var(--text-1)] text-[var(--bg)]":"text-[var(--text-3)] hover:text-[var(--text-2)]"}`}>
                  {label}
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${roleFilter===key?"opacity-60":"opacity-50"}`}>{counts[key]}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-1 max-w-xs items-center gap-2 rounded-[var(--radius)] px-3 py-2"
                 style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
              <Search className="h-4 w-4 shrink-0" style={{ color:"var(--text-3)" }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                     placeholder="Nom, email, username, ID…"
                     className="w-full bg-transparent text-sm outline-none" style={{ color:"var(--text-1)" }} />
              {search && (
                <button onClick={() => setSearch("")} style={{ color:"var(--text-3)" }}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-2"
                 style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0" style={{ color:"var(--text-3)" }} />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-medium outline-none cursor-pointer"
                style={{ color: sortBy !== "newest" ? "#a78bfa" : "var(--text-2)" }}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-[#0c1120] text-white">{o.label}</option>
                ))}
              </select>
            </div>

            {/* Result count */}
            <span className="badge badge-violet text-xs">
              {filtered.length} / {users.length} utilisateur{filtered.length !== 1 ? "s" : ""}
            </span>

            {hasActiveFilters && (
              <button onClick={clearAll} className="text-xs text-violet-400 hover:text-violet-300 transition flex items-center gap-1">
                <X className="h-3 w-3" /> Effacer les filtres
              </button>
            )}
          </div>

          {/* Row 2: Contextual filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status — always visible */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-3)" }}>Statut</span>
              <FilterPill active={statusFilter==="ALL"}      onClick={() => setStatusFilter("ALL")}>Tous</FilterPill>
              <FilterPill active={statusFilter==="ACTIVE"}   onClick={() => setStatusFilter("ACTIVE")}>Actif</FilterPill>
              <FilterPill active={statusFilter==="INACTIVE"} onClick={() => setStatusFilter("INACTIVE")}>Inactif</FilterPill>
            </div>

            {/* Face filter — students only */}
            {(roleFilter === "STUDENT" || roleFilter === "ALL") && (
              <>
                <div className="h-3 w-px mx-1" style={{ background: "var(--border)" }} />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-3)" }}>Visage</span>
                  <FilterPill active={faceFilter==="ALL"}      onClick={() => setFaceFilter("ALL")}>Tous</FilterPill>
                  <FilterPill active={faceFilter==="HAS_FACE"} onClick={() => setFaceFilter("HAS_FACE")}>Enregistré ✓</FilterPill>
                  <FilterPill active={faceFilter==="NO_FACE"}  onClick={() => setFaceFilter("NO_FACE")}>Non enregistré</FilterPill>
                </div>
              </>
            )}

            {/* Filière filter — students */}
            {(roleFilter === "STUDENT") && filieres.length > 0 && (
              <>
                <div className="h-3 w-px mx-1" style={{ background: "var(--border)" }} />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-3)" }}>Filière</span>
                  <select
                    value={filiereFilter}
                    onChange={e => setFiliereFilter(e.target.value)}
                    className="rounded-full px-3 py-1 text-xs font-medium outline-none transition-all"
                    style={filiereFilter
                      ? { background: "rgba(167,139,250,0.18)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.35)" }
                      : { background: "transparent", color: "var(--text-3)", border: "1px solid var(--border)" }}
                  >
                    <option value="">Toutes</option>
                    {filieres.map(f => <option key={f.id} value={String(f.id)}>{f.code} — {f.name}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Semester filter — students */}
            {(roleFilter === "STUDENT") && (
              <>
                <div className="h-3 w-px mx-1" style={{ background: "var(--border)" }} />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-3)" }}>Semestre</span>
                  <select
                    value={semesterFilter}
                    onChange={e => setSemesterFilter(e.target.value)}
                    className="rounded-full px-3 py-1 text-xs font-medium outline-none transition-all"
                    style={semesterFilter
                      ? { background: "rgba(34,211,238,0.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)" }
                      : { background: "transparent", color: "var(--text-3)", border: "1px solid var(--border)" }}
                  >
                    <option value="">Tous</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(s => (
                      <option key={s} value={String(s)}>S{s}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Department filter — teachers */}
            {(roleFilter === "TEACHER") && departments.length > 0 && (
              <>
                <div className="h-3 w-px mx-1" style={{ background: "var(--border)" }} />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-3)" }}>Département</span>
                  <select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className="rounded-full px-3 py-1 text-xs font-medium outline-none transition-all"
                    style={deptFilter
                      ? { background: "rgba(34,211,238,0.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)" }
                      : { background: "transparent", color: "var(--text-3)", border: "1px solid var(--border)" }}
                  >
                    <option value="">Tous</option>
                    {departments.map(d => <option key={d.id} value={String(d.id)}>{d.code} — {d.name}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-14 rounded-[var(--radius-lg)]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Users className="h-8 w-8" style={{ color:"var(--text-3)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color:"var(--text-1)" }}>Aucun utilisateur trouvé</p>
              {hasActiveFilters && <button onClick={clearAll} className="text-xs text-violet-400 mt-1">Effacer les filtres</button>}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead><tr><th>User</th><th>Role</th><th>Email</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filtered.map(u => {
                  const role = ROLES[u.role]||ROLES.STUDENT;
                  const RoleIcon = role.icon;
                  const sp = u.role==="STUDENT" ? getSP(u.id) : null;
                  const hasFace = !!sp?.face_encoding;
                  const fullName = `${u.first_name||""} ${u.last_name||""}`.trim()||u.username;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-semibold"
                               style={{ background:"var(--surface-2)", color:"var(--text-2)" }}>
                            {getInitials(u)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate" style={{ color:"var(--text-1)" }}>{fullName}</p>
                            <p className="text-xs" style={{ color:"var(--text-3)" }}>@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.role==="ADMIN"?"badge-pink":u.role==="TEACHER"?"badge-cyan":"badge-violet"}`}>
                          <RoleIcon className="h-3 w-3" /> {role.label}
                        </span>
                      </td>
                      <td><span className="text-sm" style={{ color:"var(--text-2)" }}>{u.email||"N/A"}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`badge ${u.is_active?"badge-green":"badge-gray"}`}>{u.is_active?"Active":"Inactive"}</span>
                          {u.role==="STUDENT" && sp && (
                            <span className={`badge ${hasFace?"badge-green":"badge-amber"}`}>
                              <ScanFace className="h-3 w-3" /> {hasFace?"Face OK":"No face"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          {(u.role==="STUDENT" || u.role==="TEACHER") && (
                            <button onClick={() => setDetailTarget({ userId: u.id, role: u.role })}
                                    className={`btn p-2 ${u.role==="TEACHER" ? "text-cyan-400" : "text-violet-400"}`}
                                    style={{ border: u.role==="TEACHER" ? "1px solid rgba(8,145,178,0.2)" : "1px solid rgba(139,92,246,0.2)",
                                             background: u.role==="TEACHER" ? "rgba(8,145,178,0.06)" : "rgba(139,92,246,0.06)" }}
                                    title={`View ${u.role.toLowerCase()} details`}>
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {u.role==="STUDENT" && sp && (
                            <button onClick={() => setFaceTarget(sp)} className="btn-ghost p-2" title="Register face">
                              <ScanFace className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => { setEditingUser(u); setModalOpen(true); }} className="btn-ghost p-2"><Edit2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setDeleteTarget(u)} className="btn p-2 text-red-400"
                                  style={{ border:"1px solid rgba(185,28,28,0.2)", background:"rgba(185,28,28,0.06)" }}>
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

      <UserFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchAll}
                     user={editingUser} departments={departments} filieres={filieres} showToast={showToast}
                     studentCount={studentProfiles.length} />
      <FaceOnlyModal open={!!faceTarget} onClose={() => setFaceTarget(null)} studentProfile={faceTarget} onSaved={fetchAll} showToast={showToast} />
      <DeleteConfirm user={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} deleting={deleting} />
      <UserDetailModal open={!!detailTarget} onClose={() => setDetailTarget(null)} userId={detailTarget?.userId} role={detailTarget?.role} />
      <ImportCSVModal open={importOpen} onClose={() => setImportOpen(false)} onImported={fetchAll} showToast={showToast} />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
};

export default UsersPage;
