import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, UserCircle, Users,
  Building2, GraduationCap, BookOpen, LogOut,
  MessageSquare, CalendarDays, X, ChevronRight,
  Layers, ScanFace, CalendarCheck,
} from "lucide-react";
import logo from "../../assets/smart_education_icon_mark.png";

/* ── Role config ─────────────────────────────────────────────── */
const ROLE_CONFIG = {
  TEACHER: {
    label: "Teacher",
    color: "text-cyan-400",
    accent: "#22d3ee",
    glow: "rgba(8,145,178,0.25)",
    dot: "bg-cyan-400",
    gradient: "from-cyan-500/20 to-cyan-500/5",
    links: [
      { to: "/teacher",         label: "Dashboard",  icon: LayoutDashboard },
      { to: "/teacher/courses", label: "My Courses", icon: BookOpen        },
      { to: "/teacher/profile", label: "Profile",    icon: UserCircle      },
    ],
  },
  ADMIN: {
    label: "Admin",
    color: "text-pink-400",
    accent: "#f472b6",
    glow: "rgba(190,24,93,0.25)",
    dot: "bg-pink-400",
    gradient: "from-pink-500/20 to-pink-500/5",
    links: [
      { to: "/admin",             label: "Dashboard",   icon: LayoutDashboard },
      { to: "/admin/users",       label: "Users",       icon: Users },
      { to: "/admin/departments", label: "Departments", icon: Building2 },
      { to: "/admin/filieres",    label: "Filieres",    icon: Layers },
      { to: "/admin/courses",       label: "Courses",       icon: BookOpen  },
      { to: "/admin/face-requests", label: "Face Requests", icon: ScanFace  },
      { to: "/admin/profile",       label: "Profile",       icon: UserCircle },
    ],
  },
  STUDENT: {
    label: "Student",
    color: "text-violet-400",
    accent: "#a78bfa",
    glow: "rgba(124,58,237,0.25)",
    dot: "bg-violet-400",
    gradient: "from-violet-500/20 to-violet-500/5",
    links: [
      { to: "/student",            label: "Dashboard",  icon: LayoutDashboard },
      { to: "/student/seances",    label: "Séances",    icon: CalendarCheck   },
      { to: "/student/attendance", label: "Attendance", icon: CalendarDays    },
      { to: "/student/chat",       label: "AI Tutor",   icon: MessageSquare   },
      { to: "/student/profile",    label: "Profile",    icon: UserCircle      },
    ],
  },
};

/* ── Sidebar content ─────────────────────────────────────────── */
const SidebarContent = ({ user, logout, onClose }) => {
  const config  = ROLE_CONFIG[user?.role] ?? ROLE_CONFIG.STUDENT;
  const location = useLocation();

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username ?? "User";

  const initials = user
    ? (`${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`
        .toUpperCase() || user.username?.[0]?.toUpperCase() || "?")
    : "?";

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--surface)" }}>

      {/* Decorative glow at top */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-48 w-full"
        style={{ background: `radial-gradient(ellipse at 30% 0%, ${config.glow}, transparent 70%)`, opacity: 0.6 }}
      />

      {/* ── Brand ──────────────────────────────────────────── */}
      <div className="relative flex h-14 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(8,145,178,0.2))",
              border: "1px solid rgba(124,58,237,0.3)",
              boxShadow: "0 0 12px rgba(124,58,237,0.2)",
            }}
          >
            <img src={logo} alt="CampusEye" style={{ width: 18, height: 18, objectFit: "contain" }} />
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
            Campus<span style={{ color: config.accent }}>Eye</span>
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition lg:hidden"
            style={{ color: "var(--text-3)" }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="divider mx-4" />

      {/* ── User card ──────────────────────────────────────── */}
      <div
        className="relative mx-3 mt-3 overflow-hidden rounded-[var(--radius-lg)] p-3"
        style={{
          background: `linear-gradient(135deg, ${config.glow}, transparent)`,
          border: `1px solid ${config.accent}30`,
        }}
      >
        {/* Shimmer effect */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${config.accent}40, transparent)` }}
        />
        <div className="flex items-center gap-3">
          {/* Avatar with glow */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${config.accent}40, ${config.accent}20)`,
              border: `1px solid ${config.accent}40`,
              boxShadow: `0 0 12px ${config.glow}`,
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: "var(--text-1)" }}>{displayName}</p>
            <p className={`text-[11px] font-semibold ${config.color}`}>{config.label}</p>
          </div>
          {/* Live dot */}
          <div className="live-dot shrink-0">
            <span className={config.dot} />
            <span className={config.dot} />
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="mt-5 flex-1 overflow-y-auto px-3">
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
                  style={isActive ? {
                    background: `linear-gradient(90deg, ${config.glow}, rgba(0,0,0,0))`,
                    border: `1px solid ${config.accent}20`,
                    color: "var(--text-1)",
                  } : {}}
                  className={({ isActive: navActive }) =>
                    `nav-item group ${navActive ? "active" : ""}`
                  }
                >
                  <Icon
                    className="h-4 w-4 shrink-0 transition-all duration-200"
                    style={isActive ? { color: config.accent, filter: `drop-shadow(0 0 4px ${config.accent})` } : {}}
                  />
                  <span className="flex-1 text-sm">{label}</span>
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5" style={{ color: config.accent, opacity: 0.7 }} />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Logout ─────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-5">
        <div className="divider mb-3" />
        <button
          onClick={logout}
          className="nav-item w-full group"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(185,28,28,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut className="h-4 w-4 shrink-0 transition-all group-hover:text-red-400" />
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
        className="relative hidden w-56 shrink-0 overflow-hidden lg:flex lg:flex-col"
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
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 h-full w-56 flex flex-col overflow-hidden"
            style={{ animation: "slide-in-right 0.2s ease-out both", borderRight: "1px solid var(--border)" }}
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
