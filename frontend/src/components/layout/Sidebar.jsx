import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  ScanLine,
  UserCircle,
  Users,
  Building2,
  GraduationCap,
  BookOpen,
  LogOut,
} from "lucide-react";

const Sidebar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const teacherLinks = [
    { to: "/teacher", label: "Dashboard", icon: LayoutDashboard },
    { to: "/teacher/scan", label: "Live Scan", icon: ScanLine },
    { to: "/teacher/profile", label: "Profile", icon: UserCircle },
  ];

  const adminLinks = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/departments", label: "Departments", icon: Building2 },
    { to: "/admin/filieres", label: "Filieres", icon: GraduationCap },
    { to: "/admin/courses", label: "Courses", icon: BookOpen },
    { to: "/admin/profile", label: "Profile", icon: UserCircle },
  ];

  const studentLinks = [
    { to: "/student", label: "Dashboard", icon: LayoutDashboard },
    { to: "/student/profile", label: "Profile", icon: UserCircle },
  ];

  let links = [];

  if (user.role === "TEACHER") links = teacherLinks;
  if (user.role === "ADMIN") links = adminLinks;
  if (user.role === "STUDENT") links = studentLinks;

  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-white/10 bg-[#070707] px-5 py-5 lg:flex lg:flex-col">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-white">
          SE
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Smart Education</p>
          <p className="text-xs text-white/40">Academic Workspace</p>
        </div>
      </div>

      <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/35">
          Signed in as
        </p>
        <p className="mt-3 text-lg font-semibold text-white">
          {user.first_name || user.username}
        </p>
        <p className="mt-1 text-sm text-white/50">{user.role}</p>
      </div>

      <nav className="mt-8 flex flex-col gap-2">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition duration-300 ${
                  isActive
                    ? "border border-white/10 bg-white text-black"
                    : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-black" : "text-white/55"
                    }`}
                  />
                  <span>{link.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/35">
          Workspace
        </p>
        <p className="mt-2 text-sm leading-6 text-white/55">
          Role-based academic tools and insights.
        </p>
      </div>

      <button
        onClick={logout}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition duration-300 hover:bg-red-500/15"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;