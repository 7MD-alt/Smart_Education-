import { useEffect, useState, useRef } from "react";
import axiosClient from "../../api/axiosClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Users, Plus, Search, Edit2, Trash2,
  ShieldCheck, GraduationCap, UserCircle,
  X, AlertCircle, Check, ScanFace, Camera,
  Upload, RefreshCcw, ChevronRight,
} from "lucide-react";

// ── Role config ───────────────────────────────────────────────────────────────
const ROLES = {
  ADMIN:   { label: "Admin",   icon: ShieldCheck,    color: "text-pink-300",   bg: "bg-pink-500/15",   border: "border-pink-500/30"   },
  TEACHER: { label: "Teacher", icon: UserCircle,     color: "text-cyan-300",   bg: "bg-cyan-500/15",   border: "border-cyan-500/30"   },
  STUDENT: { label: "Student", icon: GraduationCap,  color: "text-violet-300", bg: "bg-violet-500/15", border: "border-violet-500/30" },
};

const getInitials = (u) => {
  const parts = [u?.first_name?.[0], u?.last_name?.[0]].filter(Boolean);
  return parts.length ? parts.join("").toUpperCase() : (u?.username?.[0]?.toUpperCase() || "?");
};

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, type = "success", onClose }) => (
  <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 rounded-xl border border-white/10 bg-[#0c1120] px-4 py-3 shadow-xl">
    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${type === "success" ? "bg-green-500/20" : "bg-red-500/20"}`}>
      {type === "success" ? <Check className="h-3.5 w-3.5 text-green-400" /> : <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
    </div>
    <p className="text-sm text-white">{message}</p>
    <button onClick={onClose} className="ml-2 text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
  </div>
);

// ── Inputs ────────────────────────────────────────────────────────────────────
const Input = ({ label, ...props }) => (
  <div>
    <label className="text-xs font-medium text-white/50">{label}</label>
    <input
      {...props}
      className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none transition"
    />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div>
    <label className="text-xs font-medium text-white/50">{label}</label>
    <select
      {...props}
      className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none transition"
    >
      {children}
    </select>
  </div>
);

// ── User Card ─────────────────────────────────────────────────────────────────
const UserCard = ({ user, studentProfile, onEdit, onDelete, onRegisterFace }) => {
  const role = ROLES[user.role] || ROLES.STUDENT;
  const RoleIcon = role.icon;
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
  const isStudent = user.role === "STUDENT";
  const hasFace = !!studentProfile?.face_encoding;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-white/20 to-white/[0.03] text-sm font-semibold text-white">
          {getInitials(user)}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border ${role.border} ${role.bg} px-2 py-0.5 text-[10px] font-medium ${role.color}`}>
          <RoleIcon className="h-2.5 w-2.5" />
          {role.label}
        </span>
      </div>

      <div className="mt-4">
        <p className="truncate text-base font-semibold text-white">{fullName}</p>
        <p className="mt-0.5 truncate text-xs text-white/40">@{user.username}</p>
        {isStudent && studentProfile?.student_id && (
          <p className="mt-0.5 truncate text-xs text-white/40 font-mono">ID: {studentProfile.student_id}</p>
        )}
        {user.email && <p className="mt-1 truncate text-xs text-white/30">{user.email}</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-green-400" : "bg-white/20"}`} />
          <span className="text-[10px] text-white/40">{user.is_active ? "Active" : "Inactive"}</span>
        </div>

        {isStudent && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            hasFace
              ? "bg-green-500/10 text-green-300 border border-green-500/20"
              : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
          }`}>
            <ScanFace className="h-2.5 w-2.5" />
            {hasFace ? "Face ready" : "No face"}
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-2 border-t border-white/5 pt-4">
        <button
          onClick={() => onEdit(user)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/[0.06] hover:text-white transition"
        >
          <Edit2 className="h-3 w-3" /> Edit
        </button>
        {isStudent && studentProfile && (
          <button
            onClick={() => onRegisterFace(studentProfile)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300 hover:bg-violet-500/20 transition"
            title={hasFace ? "Re-register face" : "Register face"}
          >
            <ScanFace className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={() => onDelete(user)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

// ── Face Capture Component (webcam + upload) ──────────────────────────────────
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
    if (mode === "webcam" && !cameraOn && !capturedBlob) {
      startCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line
  }, [mode]);

  const startCamera = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraOn(true);
      }
    } catch (e) {
      console.error(e);
      setErr("Cannot access camera. Use the upload option instead.");
    }
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video?.srcObject) {
      video.srcObject.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setCameraOn(false);
  };

  const captureFromWebcam = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
      }
    }, "image/jpeg", 0.92);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Please select an image file.");
      return;
    }
    setCapturedBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErr("");
  };

  const retake = () => {
    setCapturedBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (mode === "webcam") startCamera();
    else fileInputRef.current?.click();
  };

  const registerFace = async () => {
    if (!capturedBlob) return;
    setUploading(true);
    setErr("");
    try {
      const formData = new FormData();
      formData.append("student_id", studentIdStr); // ✅ the string student_id, e.g. "S12345"
      formData.append("image", capturedBlob, "face.jpg");

      await axiosClient.post("students/register-face/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast("Face registered successfully", "success");
      onDone();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error
        || error.response?.data?.detail
        || (typeof error.response?.data === "object" ? JSON.stringify(error.response.data) : null)
        || "Face registration failed. Make sure the face is clearly visible.";
      setErr(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-6 py-5 space-y-4">
      <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-400" />
          <p className="text-sm text-green-300 font-medium">Account ready for {studentName}</p>
        </div>
        <p className="mt-1 text-xs text-green-300/70">
          Now capture the student's face so they can be recognized during attendance.
        </p>
      </div>

      {err && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</div>
      )}

      {!capturedBlob && (
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button
            onClick={() => { stopCamera(); setMode("webcam"); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "webcam" ? "bg-white text-black" : "text-white/60 hover:text-white"
            }`}
          >
            <Camera className="h-4 w-4" /> Webcam
          </button>
          <button
            onClick={() => { stopCamera(); setMode("upload"); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "upload" ? "bg-white text-black" : "text-white/60 hover:text-white"
            }`}
          >
            <Upload className="h-4 w-4" /> Upload Photo
          </button>
        </div>
      )}

      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
        {capturedBlob && previewUrl ? (
          <img src={previewUrl} alt="Captured face" className="h-full w-full object-cover" />
        ) : mode === "webcam" ? (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Upload className="h-10 w-10 text-white/20" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
            >
              Choose an image
            </button>
            <p className="text-xs text-white/30">JPG or PNG · clear face</p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      </div>

      <div className="flex items-center gap-2">
        {capturedBlob ? (
          <>
            <button
              onClick={retake}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.05] transition"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Retake
            </button>
            <button
              onClick={registerFace}
              disabled={uploading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition"
            >
              {uploading ? "Registering…" : "Register Face"}
              {!uploading && <ChevronRight className="h-4 w-4" />}
            </button>
          </>
        ) : mode === "webcam" ? (
          <button
            onClick={captureFromWebcam}
            disabled={!cameraOn}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition"
          >
            <Camera className="h-4 w-4" /> Capture
          </button>
        ) : null}
      </div>

      <div className="text-center">
        <button onClick={onSkip} className="text-xs text-white/40 hover:text-white/60 transition">
          Skip for now · register later
        </button>
      </div>
    </div>
  );
};

// ── Create/Edit Modal with wizard ─────────────────────────────────────────────
const UserFormModal = ({ open, onClose, onSaved, user, departments, filieres, showToast }) => {
  const isEdit = !!user;
  const [step, setStep] = useState(1);
  const [createdStudent, setCreatedStudent] = useState(null);

  const [form, setForm] = useState({
    username: "", email: "", first_name: "", last_name: "",
    role: "STUDENT", password: "", is_active: true,
    student_id: "", filiere_id: "", semester: 1, department_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || "",
        email: user.email || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        role: user.role || "STUDENT",
        password: "",
        is_active: user.is_active ?? true,
        student_id: "", filiere_id: "", semester: 1, department_id: "",
      });
    } else {
      setForm({
        username: "", email: "", first_name: "", last_name: "",
        role: "STUDENT", password: "", is_active: true,
        student_id: "", filiere_id: "", semester: 1, department_id: "",
      });
    }
    setStep(1);
    setCreatedStudent(null);
    setErr("");
  }, [user, open]);

  const handleChange = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");

    try {
      const userPayload = {
        username: form.username,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
        is_active: form.is_active,
      };
      if (form.password) userPayload.password = form.password;

      let savedUser;
      if (isEdit) {
        const res = await axiosClient.patch(`users/${user.id}/`, userPayload);
        savedUser = res.data;
      } else {
        if (!form.password) {
          setErr("Password is required for new users.");
          setSaving(false);
          return;
        }
        const res = await axiosClient.post("users/", userPayload);
        savedUser = res.data;

        if (form.role === "STUDENT") {
          if (!form.student_id || !form.filiere_id) {
            setErr("Student ID and Filiere are required.");
            setSaving(false);
            return;
          }
          await axiosClient.post("student-profiles/", {
            user_id: savedUser.id,
            student_id: form.student_id,
            filiere_id: form.filiere_id,
            semester: Number(form.semester),
          });
        } else if (form.role === "TEACHER") {
          if (!form.department_id) {
            setErr("Department is required.");
            setSaving(false);
            return;
          }
          await axiosClient.post("teacher-profiles/", {
            user_id: savedUser.id,
            department_id: form.department_id,
          });
        } else if (form.role === "ADMIN") {
          await axiosClient.post("admin-profiles/", { user_id: savedUser.id });
        }
      }

      if (!isEdit && form.role === "STUDENT") {
        const fullName = `${form.first_name} ${form.last_name}`.trim() || form.username;
        // ✅ Pass the student_id string (like "S12345"), not the user's db id
        setCreatedStudent({ studentIdStr: form.student_id, studentName: fullName });
        setStep(2);
        showToast("User created", "success");
        onSaved();
      } else {
        showToast(isEdit ? "User updated" : "User created", "success");
        onSaved();
        onClose();
      }
    } catch (error) {
      console.error(error);
      const msg = error.response?.data
        ? (typeof error.response.data === "string" ? error.response.data : JSON.stringify(error.response.data))
        : error.message;
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleFaceDone = () => { onSaved(); onClose(); };
  const handleSkip     = () => { onSaved(); onClose(); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1120] shadow-2xl">

        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/30">
              {step === 2 && (
                <>
                  <span>Step 2 of 2</span>
                  <span className="text-white/20">·</span>
                </>
              )}
              <span>{isEdit ? "Edit User" : step === 1 ? "Account Info" : "Face Registration"}</span>
            </div>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {isEdit ? user.username : step === 1 ? "Create a new user" : "Register Face"}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isEdit && form.role === "STUDENT" && (
          <div className="h-1 bg-white/5">
            <div
              className="h-1 bg-violet-400 transition-all duration-300"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>
        )}

        {step === 1 && (
          <>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {err && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</div>
              )}

              {!isEdit && (
                <div>
                  <label className="text-xs font-medium text-white/50">Role</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {Object.entries(ROLES).map(([key, r]) => {
                      const Icon = r.icon;
                      const selected = form.role === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, role: key }))}
                          className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 transition ${
                            selected ? `${r.border} ${r.bg} ${r.color}` : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-xs font-medium">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" value={form.first_name} onChange={handleChange("first_name")} />
                <Input label="Last Name"  value={form.last_name}  onChange={handleChange("last_name")}  />
              </div>

              <Input label="Username" value={form.username} onChange={handleChange("username")} required />
              <Input label="Email" type="email" value={form.email} onChange={handleChange("email")} />
              <Input
                label={isEdit ? "New Password (leave blank to keep)" : "Password"}
                type="password"
                value={form.password}
                onChange={handleChange("password")}
                required={!isEdit}
              />

              {!isEdit && form.role === "STUDENT" && (
                <div className="space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-widest text-violet-300">Student Info</p>
                  <Input label="Student ID" value={form.student_id} onChange={handleChange("student_id")} required placeholder="e.g. S12345" />
                  <Select label="Filiere" value={form.filiere_id} onChange={handleChange("filiere_id")} required>
                    <option value="" className="bg-[#0c1120]">Select filiere…</option>
                    {filieres.map((f) => (
                      <option key={f.id} value={f.id} className="bg-[#0c1120]">{f.code} — {f.name}</option>
                    ))}
                  </Select>
                  <Input label="Semester" type="number" min="1" max="10" value={form.semester} onChange={handleChange("semester")} required />
                </div>
              )}

              {!isEdit && form.role === "TEACHER" && (
                <div className="space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-widest text-cyan-300">Teacher Info</p>
                  <Select label="Department" value={form.department_id} onChange={handleChange("department_id")} required>
                    <option value="" className="bg-[#0c1120]">Select department…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id} className="bg-[#0c1120]">{d.code} — {d.name}</option>
                    ))}
                  </Select>
                </div>
              )}

              <label className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={handleChange("is_active")}
                  className="h-4 w-4 rounded border-white/20 bg-transparent"
                />
                <span className="text-sm text-white/60">Account is active</span>
              </label>
            </form>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/[0.05] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50 transition"
              >
                {saving ? "Saving…" : isEdit ? "Save Changes" : (form.role === "STUDENT" ? "Continue" : "Create User")}
                {!saving && !isEdit && form.role === "STUDENT" && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}

        {step === 2 && createdStudent && (
          <FaceCaptureStep
            studentIdStr={createdStudent.studentIdStr}
            studentName={createdStudent.studentName}
            onDone={handleFaceDone}
            onSkip={handleSkip}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
};

// ── Standalone Face Modal for existing students ───────────────────────────────
const FaceOnlyModal = ({ open, onClose, studentProfile, onSaved, showToast }) => {
  if (!open || !studentProfile) return null;
  const u = studentProfile.user || {};
  const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || "student";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1120] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/30">Face Registration</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Register / Update Face</h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <FaceCaptureStep
          studentIdStr={studentProfile.student_id}
          studentName={fullName}
          onDone={() => { onSaved(); onClose(); }}
          onSkip={onClose}
          showToast={showToast}
        />
      </div>
    </div>
  );
};

// ── Delete Confirm ────────────────────────────────────────────────────────────
const DeleteConfirm = ({ user, onCancel, onConfirm, deleting }) => {
  if (!user) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0c1120] p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">Delete user?</h3>
        <p className="mt-2 text-sm text-white/50">
          This will permanently delete <span className="text-white">{user.username}</span> and all their data.
          This action cannot be undone.
        </p>
        <div className="mt-5 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/[0.05] transition">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50 transition"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [studentProfiles, setStudentProfiles] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [faceTarget, setFaceTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [u, sp, d, f] = await Promise.all([
        axiosClient.get("users/"),
        axiosClient.get("student-profiles/"),
        axiosClient.get("departments/"),
        axiosClient.get("filieres/"),
      ]);
      setUsers(Array.isArray(u.data) ? u.data : u.data.results || []);
      setStudentProfiles(Array.isArray(sp.data) ? sp.data : sp.data.results || []);
      setDepartments(Array.isArray(d.data) ? d.data : d.data.results || []);
      setFilieres(Array.isArray(f.data) ? f.data : f.data.results || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const getStudentProfile = (userId) =>
    studentProfiles.find((p) => (p.user?.id ?? p.user) === userId);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosClient.delete(`users/${deleteTarget.id}/`);
      showToast("User deleted", "success");
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      console.error(err);
      showToast("Failed to delete user", "error");
    } finally {
      setDeleting(false);
    }
  };

  const openCreate      = ()   => { setEditingUser(null); setModalOpen(true); };
  const openEdit        = (u)  => { setEditingUser(u);   setModalOpen(true); };
  const openFaceCapture = (sp) => { setFaceTarget(sp); };

  const filtered = users.filter((u) => {
    if (filter !== "ALL" && u.role !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      const full = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
      return (
        u.username.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        full.includes(s)
      );
    }
    return true;
  });

  const counts = {
    ALL:     users.length,
    ADMIN:   users.filter((u) => u.role === "ADMIN").length,
    TEACHER: users.filter((u) => u.role === "TEACHER").length,
    STUDENT: users.filter((u) => u.role === "STUDENT").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div className="page-header">
          <div>
            <p className="label">Admin / Users</p>
            <h1 className="page-title mt-1">Users</h1>
            <p className="page-sub">Create and manage platform users across all roles.</p>
          </div>
          <button onClick={openCreate} className="btn-primary gap-1.5">
            <Plus className="h-4 w-4" /> New User
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-[var(--radius)] p-1" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            {[{key:"ALL",label:"All"},{key:"ADMIN",label:"Admins"},{key:"TEACHER",label:"Teachers"},{key:"STUDENT",label:"Students"}].map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                      className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition ${
                        filter === key ? "bg-[var(--text-1)] text-[var(--bg)]" : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                      }`}>
                {label}
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${filter === key ? "opacity-60" : "opacity-50"}`}>{counts[key]}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-1 max-w-xs items-center gap-2 rounded-[var(--radius)] px-3 py-2"
               style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-3)" }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                   placeholder="Search name, email, username…"
                   className="w-full bg-transparent text-sm outline-none" style={{ color: "var(--text-1)" }} />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-[var(--radius-lg)]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Users className="h-8 w-8" style={{ color: "var(--text-3)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>No users found</p>
              {(search || filter !== "ALL") && (
                <button onClick={() => { setSearch(""); setFilter("ALL"); }} className="text-xs text-violet-400 mt-1">Clear filters</button>
              )}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead><tr><th>User</th><th>Role</th><th>Email</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filtered.map(u => {
                  const role = ROLES[u.role] || ROLES.STUDENT;
                  const RoleIcon = role.icon;
                  const sp = u.role === "STUDENT" ? getStudentProfile(u.id) : null;
                  const hasFace = !!sp?.face_encoding;
                  const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-semibold"
                               style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                            {getInitials(u)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate" style={{ color: "var(--text-1)" }}>{fullName}</p>
                            <p className="text-xs" style={{ color: "var(--text-3)" }}>@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === "ADMIN" ? "badge-pink" : u.role === "TEACHER" ? "badge-cyan" : "badge-violet"}`}>
                          <RoleIcon className="h-3 w-3" /> {role.label}
                        </span>
                      </td>
                      <td><span className="text-sm" style={{ color: "var(--text-2)" }}>{u.email || "—"}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`badge ${u.is_active ? "badge-green" : "badge-gray"}`}>{u.is_active ? "Active" : "Inactive"}</span>
                          {u.role === "STUDENT" && sp && (
                            <span className={`badge ${hasFace ? "badge-green" : "badge-amber"}`}>
                              <ScanFace className="h-3 w-3" /> {hasFace ? "Face ✓" : "No face"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          {u.role === "STUDENT" && sp && (
                            <button onClick={() => openFaceCapture(sp)} className="btn-ghost p-2" title="Register face">
                              <ScanFace className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => openEdit(u)} className="btn-ghost p-2"><Edit2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setDeleteTarget(u)} className="btn p-2 text-red-400"
                                  style={{ border: "1px solid rgba(185,28,28,0.2)", background: "rgba(185,28,28,0.06)" }}>
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

      <UserFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchAll}
        user={editingUser}
        departments={departments}
        filieres={filieres}
        showToast={showToast}
      />

      <FaceOnlyModal
        open={!!faceTarget}
        onClose={() => setFaceTarget(null)}
        studentProfile={faceTarget}
        onSaved={fetchAll}
        showToast={showToast}
      />

      <DeleteConfirm
        user={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
};

export default UsersPage;