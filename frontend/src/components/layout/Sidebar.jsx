import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, ScanLine, UserCircle, Users,
  Building2, GraduationCap, BookOpen, LogOut,
  MessageSquare, CalendarDays, X, ChevronRight,
} from "lucide-react";
import logo from "../../assets/smart_education_icon_mark.png";

/* ── Role config ─────────────────────────────────────────────── */
const ROLE_CONFIG = {
  TEACHER: {
    label: "Teacher",
    color: "text-cyan-400",
    dot: "bg-cyan-400",
    links: [
      { to: "/teacher",         label: "Dashboard",  icon: LayoutDashboard },
      { to: "/teacher/scan",    label: "Live Scan",   icon: ScanLine },
      { to: "/teacher/profile", label: "Profile",     icon: UserCircle },
    ],
  },
  ADMIN: {
    label: "Admin",
    color: "text-pink-400",
    dot: "bg-pink-400",
    links: [
      { to: "/admin",             label: "Dashboard",   icon: LayoutDashboard },
      { to: "/admin/users",       label: "Users",       icon: Users },
      { to: "/admin/departments", label: "Departments", icon: Building2 },
      { to: "/admin/filieres",    label: "Filieres",    icon: GraduationCap },
      { to: "/admin/courses",     label: "Courses",     icon: BookOpen },
      { to: "/admin/profile",     label: "Profile",     icon: UserCircle },
    ],
  },
  STUDENT: {
    label: "Student",
    color: "text-violet-400",
    dot: "bg-violet-400",
    links: [
      { to: "/student",            label: "Dashboard",  icon: LayoutDashboard },
      { to: "/student/attendance", label: "Attendance", icon: CalendarDays },
      { to: "/student/chat",       label: "AI Tutor",   icon: MessageSquare },
      { to: "/student/profile",    label: "Profile",    icon: UserCircle },
    ],
  },
};

/* ── Sidebar content ─────────────────────────────────────────── */
const SidebarContent = ({ user, logout, onClose }) => {
  const config = ROLE_CONFIG[user?.role] ?? ROLE_CONFIG.STUDENT;
  const location = useLocation();

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username ?? "User";

  const initials = user
    ? (`${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`
        .toUpperCase() || user.username?.[0]?.toUpperCase() || "?")
    : "?";

  return (
    <div className="flex h-full flex-col">

      {/* ── Brand ──────────────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg"
               style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <img src={logo} alt="CampusEye" className="h-4.5 w-4.5 object-contain" style={{ width: 18, height: 18 }} />
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
            CampusEye
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition lg:hidden"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="divider mx-4" />

      {/* ── User card ──────────────────────────────────────── */}
      <div className="mx-3 mt-3 rounded-[var(--radius)] p-3"
           style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${config.dot}`}
               style={{ opacity: 0.9 }}>
            {initials}
          </div>
          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: "var(--text-1)" }}>
              {displayName}
            </p>
            <p className={`text-[11px] font-medium ${config.color}`}>
              {config.label}
            </p>
          </div>
          {/* Status dot */}
          <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="mt-4 flex-1 overflow-y-auto px-3">
        <p className="label mb-2 px-3">Navigation</p>
        <ul className="space-y-0.5">
          {config.links.map(({ to, label, icon: Icon }) => {
            const isActive = to === `/${user?.role?.toLowerCase()}`
              ? location.pathname === to
              : location.pathname.startsWith(to);

            return (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === `/${user?.role?.toLowerCase()}`}
                  onClick={onClose}
                  className={() =>
                    `nav-item group ${isActive ? "active" : ""}`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-sm">{label}</span>
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Logout ─────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-4">
        <div className="divider mb-3" />
        <button
          onClick={logout}
          className="nav-item w-full hover:!text-red-400"
          style={{ color: "var(--text-3)" }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="text-sm">Sign out</span>
        </button>
      </div>

    </div>
  );
};

/* ── Sidebar wrapper ─────────────────────────────────────────── */
const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden w-56 shrink-0 lg:flex lg:flex-col"
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <SidebarContent user={user} logout={handleLogout} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 h-full w-56 flex flex-col"
            style={{
              background: "var(--surface)",
              borderRight: "1px solid var(--border)",
            }}
          >
            <SidebarContent
              user={user}
              logout={handleLogout}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
