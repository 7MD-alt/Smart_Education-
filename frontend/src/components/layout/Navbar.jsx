import { Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "react-router-dom";

/* ── Route label map ─────────────────────────────────────────── */
const ROUTE_LABELS = {
  "/admin":             "Dashboard",
  "/admin/users":       "Users",
  "/admin/departments": "Departments",
  "/admin/filieres":    "Filieres",
  "/admin/courses":     "Courses",
  "/admin/profile":     "Profile",
  "/teacher":           "Dashboard",
  "/teacher/scan":      "Live Scan",
  "/teacher/profile":   "Profile",
  "/student":           "Dashboard",
  "/student/attendance":"Attendance",
  "/student/chat":      "AI Tutor",
  "/student/profile":   "Profile",
};

function getPageLabel(pathname) {
  // Exact match first
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  // Partial match (e.g. /teacher/courses/:id/attendance)
  if (pathname.includes("/attendance")) return "Attendance";
  if (pathname.includes("/materials"))  return "Materials";
  if (pathname.includes("/danger-zone"))return "Danger Zone";
  return "CampusEye";
}

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
            background: "rgba(9,9,14,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "10px 18px",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden"
                 style={{ background: "rgba(255,255,255,0.07)", border: "1px solid var(--border)" }}>
              <img src={undefined} alt="C" className="hidden" />
              <span className="text-xs font-bold text-violet-400">CE</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              CampusEye
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
                className="rounded-lg px-3 py-1.5 text-sm transition-colors duration-150"
                style={{ color: "var(--text-2)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-2)"}
              >
                {label}
              </a>
            ))}
          </div>

          <a
            href="/login"
            className="btn-primary text-sm px-4 py-2"
            style={{ borderRadius: "var(--radius)" }}
          >
            Sign in
          </a>
        </nav>
      </header>
    );
  }

  /* ── Dashboard variant ───────────────────────────────────── */
  const pageLabel = getPageLabel(location.pathname);
  const initials = user
    ? (`${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`
        .toUpperCase() || user.username?.[0]?.toUpperCase() || "?")
    : "?";

  const roleColors = {
    ADMIN:   "bg-pink-500",
    TEACHER: "bg-cyan-500",
    STUDENT: "bg-violet-500",
  };
  const avatarBg = roleColors[user?.role] ?? "bg-violet-500";

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between px-5 md:px-6"
      style={{
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition lg:hidden"
          style={{ border: "1px solid var(--border)", color: "var(--text-2)" }}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: "var(--text-3)" }}>CampusEye</span>
          <span style={{ color: "var(--text-3)" }}>/</span>
          <span className="font-medium" style={{ color: "var(--text-1)" }}>
            {pageLabel}
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Role badge */}
        <span
          className="hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline-flex"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text-2)",
          }}
        >
          {user?.role}
        </span>

        {/* Avatar */}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white ${avatarBg}`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
};

export default Navbar;