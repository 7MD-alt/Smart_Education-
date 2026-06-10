import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, Bell, CheckCheck, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

/* ── Route label map ─────────────────────────────────────────── */
const ROUTE_LABELS = {
  /* Admin */
  "/admin":             "Tableau de bord",
  "/admin/users":       "Utilisateurs",
  "/admin/departments": "Départements",
  "/admin/filieres":    "Filières",
  "/admin/courses":     "Cours",
  "/admin/face-requests": "Demandes Face ID",
  "/admin/profile":     "Profil",
  /* Teacher */
  "/teacher":           "Tableau de bord",
  "/teacher/courses":   "Mes cours",
  "/teacher/scan":      "Scan en direct",
  "/teacher/profile":   "Profil",
  /* Student */
  "/student":           "Tableau de bord",
  "/student/attendance":"Présence",
  "/student/seances":   "Mes séances",
  "/student/novaa":     "NOVAA",
  "/student/chat":      "Tuteur IA",
  "/student/profile":   "Profil",
};

function getPageLabel(pathname) {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  /* Dynamic segments — order matters: most specific first */
  if (pathname.includes("/roster"))      return "Liste de présence";
  if (pathname.includes("/danger-zone")) return "Zone de danger";
  if (pathname.includes("/materials"))   return "Supports de cours";
  if (pathname.includes("/attendance"))  return "Présence";
  if (pathname.includes("/seances"))     return "Séances";
  if (pathname.includes("/chat"))        return "Tuteur IA";
  return "CampusEye";
}

const ROLE_CONFIG = {
  ADMIN:   { label: "Admin",      accent: "#f472b6", bg: "rgba(190,24,93,0.15)",  border: "rgba(190,24,93,0.3)"  },
  TEACHER: { label: "Enseignant", accent: "#22d3ee", bg: "rgba(8,145,178,0.15)", border: "rgba(8,145,178,0.3)"  },
  STUDENT: { label: "Étudiant",   accent: "#a78bfa", bg: "rgba(124,58,237,0.15)",border: "rgba(124,58,237,0.3)" },
};

/* ── Notification type styling ───────────────────────────────── */
const NOTIF_STYLE = {
  ABSENCE_INFO:    { dot: "#60a5fa", bg: "rgba(29,78,216,0.08)"  },
  ABSENCE_WARNING: { dot: "#fbbf24", bg: "rgba(180,83,9,0.08)"   },
  ABSENCE_DANGER:  { dot: "#f87171", bg: "rgba(185,28,28,0.08)"  },
  MATERIAL_ADDED:  { dot: "#4ade80", bg: "rgba(21,128,61,0.08)"  },
  STUDENT_JOINED:  { dot: "#22d3ee", bg: "rgba(8,145,178,0.08)"  },
  COURSE_ASSIGNED: { dot: "#a78bfa", bg: "rgba(124,58,237,0.08)" },
};

function fmtRelative(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)   return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

/* ── NotificationBell ────────────────────────────────────────── */
const NotificationBell = () => {
  const [open,         setOpen]         = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [loading,      setLoading]      = useState(false);
  const dropRef  = useRef(null);
  const navigate = useNavigate();

  /* Poll unread count every 30 s */
  const fetchCount = useCallback(async () => {
    try {
      const { data } = await axiosClient.get("notifications/unread-count/");
      setUnreadCount(data.unread_count ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  /* Fetch full list when dropdown opens */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("notifications/");
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markOne = async (id) => {
    try {
      await axiosClient.post(`notifications/${id}/read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAll = async () => {
    try {
      await axiosClient.post("notifications/read-all/");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleClick = (notif) => {
    if (!notif.is_read) markOne(notif.id);
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150"
        style={{ border: "1px solid var(--border)", color: "var(--text-2)" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-1)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)";       e.currentTarget.style.color = "var(--text-2)"; }}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
            style={{ background: "#7c3aed", color: "#fff", boxShadow: "0 0 6px rgba(124,58,237,0.6)" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-[var(--radius-lg)] shadow-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" style={{ color: "#a78bfa" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>
                  {unreadCount} {unreadCount > 1 ? "nouveaux" : "nouveau"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAll}
                  title="Tout marquer comme lu"
                  className="flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-all"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Tout lu
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded transition-all"
                style={{ color: "var(--text-3)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full"
                     style={{ border: "2px solid var(--border)", borderTopColor: "#a78bfa" }} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Bell className="h-8 w-8 opacity-20" style={{ color: "var(--text-3)" }} />
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const style = NOTIF_STYLE[notif.type] ?? { dot: "#a78bfa", bg: "transparent" };
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-all duration-150"
                    style={{
                      background: notif.is_read ? "transparent" : style.bg,
                      borderBottom: "1px solid var(--border)",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                    onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? "transparent" : style.bg}
                  >
                    {/* Dot */}
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: notif.is_read ? "var(--border)" : style.dot,
                               boxShadow: notif.is_read ? "none" : `0 0 6px ${style.dot}` }}
                    />
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-semibold leading-snug"
                        style={{ color: notif.is_read ? "var(--text-2)" : "var(--text-1)" }}
                      >
                        {notif.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed line-clamp-2"
                         style={{ color: "var(--text-3)" }}>
                        {notif.message}
                      </p>
                      <p className="mt-1 text-[10px]" style={{ color: "var(--text-3)", opacity: 0.6 }}>
                        {fmtRelative(notif.created_at)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-2.5 text-center"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                Showing last {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Navbar ──────────────────────────────────────────────────── */
const Navbar = ({ variant = "dashboard", onMenuClick }) => {
  const { user } = useAuth();
  const location = useLocation();

  /* ── Landing variant ─────────────────────────────────────── */
  if (variant === "landing") {
    return (
      <header className="sticky top-0 z-50 px-4 py-3 md:px-8 md:py-4">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between"
          style={{
            background: "rgba(7,7,13,0.9)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-xl)",
            padding: "10px 20px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(8,145,178,0.3))",
                border: "1px solid rgba(124,58,237,0.4)",
                boxShadow: "0 0 10px rgba(124,58,237,0.2)",
              }}
            >
              <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>CE</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
              Campus<span style={{ color: "#a78bfa" }}>Eye</span>
            </span>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {[
              { label: "Platform", href: "#features" },
              { label: "Roles",    href: "#roles" },
              { label: "Preview",  href: "#preview" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="rounded-lg px-3 py-1.5 text-sm transition-all duration-150"
                style={{ color: "var(--text-2)" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--text-1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-2)"; e.currentTarget.style.background = "transparent"; }}
              >
                {label}
              </a>
            ))}
          </div>

          <a href="/login" className="btn-primary text-sm px-4 py-2" style={{ borderRadius: "var(--radius)" }}>
            Sign in
          </a>
        </nav>
      </header>
    );
  }

  /* ── Dashboard variant ───────────────────────────────────── */
  const pageLabel = getPageLabel(location.pathname);
  const initials  = user
    ? (`${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`
        .toUpperCase() || user.username?.[0]?.toUpperCase() || "?")
    : "?";

  const roleConf = ROLE_CONFIG[user?.role] ?? ROLE_CONFIG.STUDENT;

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between px-5 md:px-6"
      style={{
        background: "rgba(3,3,18,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 0 rgba(139,92,246,0.08), 0 4px 20px rgba(0,0,0,0.2)",
      }}
    >
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all lg:hidden"
          style={{ border: "1px solid var(--border)", color: "var(--text-2)" }}
          aria-label="Open navigation"
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-1)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: "var(--text-3)" }}>CampusEye</span>
          <span style={{ color: "var(--text-3)", opacity: 0.4 }}>/</span>
          <span className="font-semibold" style={{ color: "var(--text-1)" }}>
            {pageLabel}
          </span>
        </div>
      </div>

      {/* Right — bell + role pill + avatar */}
      <div className="flex items-center gap-3">
        {/* Notification bell (only when logged in) */}
        {user && <NotificationBell />}

        <span
          className="hidden rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:inline-flex"
          style={{
            background: roleConf.bg,
            border: `1px solid ${roleConf.border}`,
            color: roleConf.accent,
            boxShadow: `0 0 10px ${roleConf.bg}`,
          }}
        >
          {roleConf.label}
        </span>

        {/* Avatar */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
          style={{
            background: `linear-gradient(135deg, ${roleConf.accent}40, ${roleConf.accent}20)`,
            border: `1px solid ${roleConf.accent}40`,
            color: roleConf.accent,
            boxShadow: `0 0 10px ${roleConf.bg}`,
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
