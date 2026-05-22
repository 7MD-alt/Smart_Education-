import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

let _id = 0;

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: {
    bar: "bg-green-400",
    icon: "text-green-400",
    border: "border-green-500/20",
    bg: "bg-green-500/[0.06]",
  },
  error: {
    bar: "bg-red-400",
    icon: "text-red-400",
    border: "border-red-500/20",
    bg: "bg-red-500/[0.06]",
  },
  warning: {
    bar: "bg-amber-400",
    icon: "text-amber-400",
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.06]",
  },
  info: {
    bar: "bg-violet-400",
    icon: "text-violet-400",
    border: "border-violet-500/20",
    bg: "bg-violet-500/[0.06]",
  },
};

const Toast = ({ toast, onDismiss }) => {
  const s = STYLES[toast.type] || STYLES.info;
  const Icon = ICONS[toast.type] || Info;

  return (
    <div
      className={`pointer-events-auto relative w-[340px] overflow-hidden rounded-2xl border ${s.border} ${s.bg} backdrop-blur-xl shadow-2xl shadow-black/40`}
      style={{ animation: "toastIn 0.3s cubic-bezier(0.22,1,0.36,1) both" }}
    >
      {/* progress bar */}
      <div
        className={`absolute left-0 top-0 h-[2px] ${s.bar} rounded-full`}
        style={{ animation: `toastBar ${toast.duration}ms linear forwards` }}
      />
      <div className="flex items-start gap-3 px-4 py-3.5">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.icon}`} />
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-sm font-semibold text-white">{toast.title}</p>
          )}
          {toast.message && (
            <p className={`text-sm text-white/60 ${toast.title ? "mt-0.5" : ""}`}>
              {toast.message}
            </p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="mt-0.5 shrink-0 text-white/30 transition hover:text-white/70"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((type, titleOrOpts, message) => {
    const id = ++_id;
    const duration = 3500;
    const entry =
      typeof titleOrOpts === "string"
        ? { id, type, title: titleOrOpts, message, duration }
        : { id, type, duration, ...titleOrOpts };

    setToasts((prev) => [...prev.slice(-4), entry]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const api = {
    success: (t, m) => toast("success", t, m),
    error: (t, m) => toast("error", t, m),
    warning: (t, m) => toast("warning", t, m),
    info: (t, m) => toast("info", t, m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Portal */}
      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex flex-col gap-2.5">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(24px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
        @keyframes toastBar {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
};
