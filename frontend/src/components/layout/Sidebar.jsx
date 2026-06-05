import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, UserCircle, Users, Building2,
  GraduationCap, BookOpen, LogOut, MessageSquare,
  CalendarDays, X, ChevronRight, Layers, ScanFace,
  CalendarCheck, Zap,
} from "lucide-react";
import logo from "../../assets/smart_education_icon_mark.png";

const ROLES = {
  TEACHER: {
    label: "Teacher", accent: "#22d3ee",
    glow: "rgba(8,145,178,0.35)", dot: "bg-cyan-400",
    gradFrom: "rgba(8,145,178,0.18)", gradTo: "rgba(8,145,178,0)",
    links: [
      { to: "/teacher",         label: "Dashboard",  icon: LayoutDashboard },
      { to: "/teacher/courses", label: "My Courses", icon: BookOpen        },
      { to: "/teacher/profile", label: "Profile",    icon: UserCircle      },
    ],
  },
  ADMIN: {
    label: "Admin", accent: "#f472b6",
    glow: "rgba(190,24,93,0.35)", dot: "bg-pink-400",
    gradFrom: "rgba(190,24,93,0.18)", gradTo: "rgba(190,24,93,0)",
    links: [
      { to: "/admin",             label: "Dashboard",   icon: LayoutDashboard },
      { to: "/admin/users",       label: "Users",       icon: Users           },
      { to: "/admin/departments", label: "Departments", icon: Building2       },
      { to: "/admin/filieres",    label: "Filieres",    icon: Layers          },
      { to: "/admin/courses",       label: "Courses",     icon: BookOpen   },
      { to: "/admin/face-requests", label: "Face ID",     icon: ScanFace   },
      { to: "/admin/profile",       label: "Profile",     icon: UserCircle },
    ],
  },
  STUDENT: {
    label: "Student", accent: "#a78bfa",
    glow: "rgba(124,58,237,0.35)", dot: "bg-violet-400",
    gradFrom: "rgba(124,58,237,0.18)", gradTo: "rgba(124,58,237,0)",
    links: [
      { to: "/student",            label: "Dashboard", icon: LayoutDashboard },
      { to: "/student/seances",    label: "Séances",   icon: CalendarCheck   },
      { to: "/student/attendance", label: "Attendance",icon: CalendarDays    },
      { to: "/student/novaa",      label: "NOVAA",     icon: MessageSquare, novaa: true },
      { to: "/student/profile",    label: "Profile",   icon: UserCircle      },
    ],
  },
};

const SidebarContent = ({ user, logout, onClose }) => {
  const cfg      = ROLES[user?.role] ?? ROLES.STUDENT;
  const location = useLocation();

  const name = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username ?? "User";
  const initials = (
    `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() ||
    user?.username?.[0]?.toUpperCase() || "?"
  );

  return (
    <div
      className="flex h-full flex-col relative overflow-hidden"
      style={{
        background: "rgba(4,4,16,0.88)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
      }}
    >
      {/* Aurora glow top — role-coloured */}
      <div
        className="pointer-events-none absolute left-0 top-0 w-full"
        style={{
          height: 280,
          background: `radial-gradient(ellipse 130% 60% at 30% 0%, ${cfg.glow}, transparent 70%)`,
        }}
      />
      {/* Aurora glow bottom */}
      <div
        className="pointer-events-none absolute left-0 bottom-0 w-full"
        style={{
          height: 160,
          background: "radial-gradient(ellipse 100% 80% at 50% 100%, rgba(8,145,178,0.12), transparent 70%)",
        }}
      />

      {/* ── Brand ──────────────────────────────────────── */}
      <div className="relative flex h-16 shrink-0 items-center justify-between px-5">
        <div className="flex items-center gap-3">
          {/* Logo glow ring */}
          <div
            className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(8,145,178,0.25))",
              border: "1px solid rgba(139,92,246,0.4)",
              boxShadow: `0 0 20px rgba(124,58,237,0.3), 0 0 40px rgba(124,58,237,0.12), inset 0 1px 0 rgba(255,255,255,0.12)`,
            }}
          >
            <img src={logo} alt="CampusEye" className="w-5 h-5 object-contain" />
          </div>

          <div>
            <div className="text-sm font-bold leading-none" style={{ letterSpacing: "-0.025em", color: "#f0f0ff" }}>
              Campus<span style={{ color: cfg.accent }}>Eye</span>
            </div>
            <div
              className="mt-0.5 text-[9px] font-semibold uppercase"
              style={{ letterSpacing: "0.1em", color: "rgba(139,92,246,0.6)" }}
            >
              Platform
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-all lg:hidden"
            style={{ color: "var(--text-3)", border: "1px solid var(--border)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-1)"; e.currentTarget.style.borderColor = "var(--border-hover)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="divider mx-4" />

      {/* ── User card ──────────────────────────────────── */}
      <div
        className="relative mx-3 mt-4 overflow-hidden rounded-[14px] p-3.5"
        style={{
          background: `linear-gradient(135deg, ${cfg.gradFrom}, ${cfg.gradTo} 80%)`,
          border: `1px solid ${cfg.accent}25`,
          boxShadow: `0 0 30px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.07)`,
        }}
      >
        {/* Top shimmer */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.accent}55, transparent)` }}
        />
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
            style={{
              background: `linear-gradient(135deg, ${cfg.accent}35, ${cfg.accent}18)`,
              border: `1px solid ${cfg.accent}35`,
              color: cfg.accent,
              boxShadow: `0 0 16px ${cfg.glow}`,
              letterSpacing: "-0.01em",
              fontSize: 13,
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: "#eeeeff", letterSpacing: "-0.015em" }}>
              {name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="live-dot shrink-0">
                <span className={cfg.dot} />
                <span className={cfg.dot} />
              </div>
              <p
                className="text-[10px] font-bold uppercase"
                style={{ letterSpacing: "0.09em", color: cfg.accent }}
              >
                {cfg.label}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────── */}
      <nav className="mt-5 flex-1 overflow-y-auto px-3">
        <p className="label mb-3 px-3" style={{ letterSpacing: "0.12em" }}>Navigation</p>
        <ul className="space-y-1">
          {cfg.links.map(({ to, label, icon: Icon, novaa }) => {
            const active = to === `/${user?.role?.toLowerCase()}`
              ? location.pathname === to
              : location.pathname.startsWith(to);

            /* NOVAA — special neon style */
            if (novaa) {
              return (
                <li key={to}>
                  <NavLink
                    to={to} onClick={onClose}
                    className="flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 select-none cursor-pointer transition-all duration-150"
                    style={{
                      background: active ? "rgba(0,210,255,0.1)" : "rgba(0,210,255,0.04)",
                      border: `1px solid ${active ? "rgba(0,210,255,0.35)" : "rgba(0,210,255,0.12)"}`,
                      boxShadow: active ? "0 0 20px rgba(0,210,255,0.15), inset 0 0 20px rgba(0,210,255,0.04)" : "none",
                      color: active ? "#00d2ff" : "#1a6070",
                    }}
                  >
                    <Zap
                      className="h-4 w-4 shrink-0"
                      style={{
                        color: active ? "#00d2ff" : "#1a5060",
                        filter: active ? "drop-shadow(0 0 6px #00d2ff)" : "none",
                      }}
                    />
                    <span style={{ flex: 1, fontFamily: "monospace", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: active ? "#00d2ff" : "#1a6070" }}>
                      NOVAA
                    </span>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full animate-pulse shrink-0" style={{ background: "#00d2ff", boxShadow: "0 0 8px #00d2ff, 0 0 16px rgba(0,210,255,0.4)" }} />
                    )}
                  </NavLink>
                </li>
              );
            }

            return (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === `/${user?.role?.toLowerCase()}`}
                  onClick={onClose}
                  className={({ isActive: a }) => `nav-item group ${a ? "active" : ""}`}
                  style={active ? {
                    background: `linear-gradient(90deg, ${cfg.gradFrom}, transparent 80%)`,
                    border: `1px solid ${cfg.accent}20`,
                    boxShadow: `inset 0 0 24px ${cfg.glow.replace("0.35", "0.06")}`,
                  } : {}}
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    style={{
                      color: active ? cfg.accent : "var(--text-3)",
                      filter: active ? `drop-shadow(0 0 5px ${cfg.accent})` : "none",
                      transition: "color 150ms, filter 150ms",
                    }}
                  />
                  <span className="flex-1 text-sm" style={{ letterSpacing: "-0.01em" }}>
                    {label}
                  </span>
                  {active && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: cfg.accent, opacity: 0.7 }} />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Logout ─────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-6 relative">
        {/* Fade mask */}
        <div
          className="pointer-events-none absolute -top-10 left-0 right-0 h-10"
          style={{ background: "linear-gradient(to bottom, rgba(4,4,16,0), #04040f)" }}
        />
        <div className="divider mb-3" />
        <button
          onClick={logout}
          className="nav-item w-full"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "#f87171";
            e.currentTarget.style.background = "rgba(185,28,28,0.1)";
            e.currentTarget.style.border = "1px solid rgba(185,28,28,0.2)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "var(--text-3)";
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.border = "1px solid transparent";
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="text-sm" style={{ letterSpacing: "-0.01em" }}>Sign out</span>
        </button>
      </div>
    </div>
  );
};

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const handleLogout = () => { logout(); window.location.href = "/login"; };

  return (
    <>
      <aside
        className="relative hidden w-60 shrink-0 overflow-hidden lg:flex lg:flex-col"
        style={{ borderRight: "1px solid rgba(139,92,246,0.12)" }}
      >
        <SidebarContent user={user} logout={handleLogout} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(3,3,18,0.8)", backdropFilter: "blur(10px)" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 h-full w-60 flex flex-col overflow-hidden"
            style={{
              animation: "slide-in-right 0.24s cubic-bezier(0.16,1,0.3,1) both",
              borderRight: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            <SidebarContent user={user} logout={handleLogout} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
