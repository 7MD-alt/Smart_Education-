import { useState } from "react";
import { KeyRound, User, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const ACCENT = {
  violet: {
    ring:    "focus:ring-violet-500/30 focus:border-violet-500/50",
    btn:     "bg-violet-600 hover:bg-violet-500",
    label:   "text-violet-300",
    border:  "border-violet-500/20",
    bg:      "bg-violet-500/[0.06]",
    header:  "via-violet-400/20",
  },
  cyan: {
    ring:    "focus:ring-cyan-500/30 focus:border-cyan-500/50",
    btn:     "bg-cyan-600 hover:bg-cyan-500",
    label:   "text-cyan-300",
    border:  "border-cyan-500/20",
    bg:      "bg-cyan-500/[0.06]",
    header:  "via-cyan-400/20",
  },
  pink: {
    ring:    "focus:ring-pink-500/30 focus:border-pink-500/50",
    btn:     "bg-pink-600 hover:bg-pink-500",
    label:   "text-pink-300",
    border:  "border-pink-500/20",
    bg:      "bg-pink-500/[0.06]",
    header:  "via-pink-400/20",
  },
};

const Field = ({ label, type, value, onChange, error, placeholder, accentRing, action }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-white/40">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none ring-1 ring-transparent transition ${accentRing} ${error ? "border-red-500/40 ring-red-500/20" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

const EditCredentialsSection = ({ accent = "violet" }) => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const a = ACCENT[accent] ?? ACCENT.violet;

  const [username, setUsername]           = useState(user?.username ?? "");
  const [currentPw, setCurrentPw]         = useState("");
  const [newPw, setNewPw]                 = useState("");
  const [confirmPw, setConfirmPw]         = useState("");
  const [errors, setErrors]               = useState({});
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);

  const handleSave = async () => {
    const localErrors = {};

    if (!username.trim()) {
      localErrors.username = "Username cannot be empty.";
    }

    if (newPw || confirmPw) {
      if (!currentPw) localErrors.current_password = "Enter your current password.";
      if (newPw.length < 8) localErrors.new_password = "At least 8 characters required.";
      if (newPw !== confirmPw) localErrors.confirm_password = "Passwords do not match.";
    }

    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }

    const payload = {};
    if (username.trim() !== user?.username) payload.username = username.trim();
    if (newPw) {
      payload.current_password = currentPw;
      payload.new_password = newPw;
    }

    if (!Object.keys(payload).length) {
      toast.info("Nothing to update.");
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await axiosClient.patch("me/", payload);
      await refreshUser();
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success("Credentials updated successfully.");
    } catch (err) {
      const data = err.response?.data ?? {};
      setErrors(data);
      toast.error("Failed to update credentials.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${a.border} ${a.bg} p-6 backdrop-blur-xl`}>
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${a.header} to-transparent`} />

      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]">
          <KeyRound className="h-4 w-4 text-white/50" />
        </div>
        <div>
          <p className={`text-sm font-semibold ${a.label}`}>Security &amp; Credentials</p>
          <p className="text-xs text-white/30">Update your username or password</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Username */}
        <Field
          label="Username"
          type="text"
          value={username}
          onChange={setUsername}
          placeholder="Enter new username"
          error={errors.username}
          accentRing={a.ring}
        />

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-xs text-white/20">Change password (optional)</span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* Current password */}
        <Field
          label="Current password"
          type="password"
          value={currentPw}
          onChange={setCurrentPw}
          placeholder="Required to set a new password"
          error={errors.current_password}
          accentRing={a.ring}
        />

        {/* New password */}
        <Field
          label="New password"
          type="password"
          value={newPw}
          onChange={setNewPw}
          placeholder="Min. 8 characters"
          error={errors.new_password}
          accentRing={a.ring}
        />

        {/* Confirm password */}
        <Field
          label="Confirm new password"
          type="password"
          value={confirmPw}
          onChange={setConfirmPw}
          placeholder="Repeat new password"
          error={errors.confirm_password}
          accentRing={a.ring}
        />
      </div>

      {/* Save button */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${a.btn}`}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
          {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
        </button>

        {saved && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Changes applied
          </span>
        )}
      </div>
    </div>
  );
};

export default EditCredentialsSection;
