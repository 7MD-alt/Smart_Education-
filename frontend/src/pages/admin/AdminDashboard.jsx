import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import AnalyticsCharts from "../../components/AnalyticsCharts";
import { useAuth } from "../../context/AuthContext";
import {
  Users, GraduationCap, BookOpen, Building2,
  Layers, FileText, ArrowUpRight, Plus,
  Activity, Wifi, Bot, TrendingUp,
} from "lucide-react";

/* ── Animated stat card ──────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, accent, glow, delay = 0 }) => (
  <div
    className="fade-up group cursor-default relative overflow-hidden rounded-[var(--radius-lg)] p-6 spotlight"
    style={{
      animationDelay: `${delay}ms`,
      background: "var(--surface)",
      backdropFilter: "blur(20px)",
      border: `1px solid ${accent}18`,
      boxShadow: `0 0 40px ${glow.replace("0.15","0.06")}`,
      transition: "border-color 220ms, box-shadow 220ms, transform 220ms",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = `${accent}45`;
      e.currentTarget.style.boxShadow = `0 0 60px ${glow.replace("0.15","0.18")}, 0 8px 32px rgba(0,0,0,0.4)`;
      e.currentTarget.style.transform = "translateY(-3px)";
      const bar = e.currentTarget.querySelector("[data-accent-bar]");
      if (bar) bar.style.transform = "scaleX(1)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = `${accent}18`;
      e.currentTarget.style.boxShadow = `0 0 40px ${glow.replace("0.15","0.06")}`;
      e.currentTarget.style.transform = "translateY(0)";
      const bar = e.currentTarget.querySelector("[data-accent-bar]");
      if (bar) bar.style.transform = "scaleX(0)";
    }}
  >
    {/* Large ambient glow blob */}
    <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full"
      style={{ background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`, filter: "blur(20px)" }} />
    {/* Bottom accent bar — slides in on hover */}
    <div data-accent-bar className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px]"
      style={{
        background: `linear-gradient(90deg, transparent, ${accent}60, transparent)`,
        transform: "scaleX(0)", transformOrigin: "left",
        transition: "transform 400ms cubic-bezier(0.16,1,0.3,1)",
      }} />

    <div className="relative flex items-start justify-between mb-4">
      <p className="label">{label}</p>
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${accent}25, ${accent}12)`,
          border: `1px solid ${accent}35`,
          boxShadow: `0 0 16px ${accent}25`,
        }}
      >
        <Icon className="h-5 w-5" style={{ color: accent, filter: `drop-shadow(0 0 4px ${accent})` }} />
      </div>
    </div>
    <p
      className="count-enter relative"
      style={{
        fontSize: "2.5rem", fontWeight: 750, letterSpacing: "-0.05em",
        color: accent, lineHeight: 1,
        textShadow: `0 0 32px ${accent}65`,
        animationDelay: `${delay + 100}ms`,
      }}
    >
      {value ?? "—"}
    </p>
    <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-3)" }}>
      <TrendingUp className="h-3 w-3" style={{ color: accent }} />
      <span>Platform total</span>
    </div>
  </div>
);

/* ── User distribution card ──────────────────────────────────── */
const UserBreakdown = ({ admins = 0, teachers = 0, students = 0 }) => {
  const total = admins + teachers + students;
  const items = [
    { label: "Students", value: students, accent: "#a78bfa", bg: "bg-violet-500", track: "rgba(124,58,237,0.15)" },
    { label: "Teachers", value: teachers, accent: "#22d3ee", bg: "bg-cyan-500",   track: "rgba(8,145,178,0.15)"   },
    { label: "Admins",   value: admins,   accent: "#f472b6", bg: "bg-pink-500",   track: "rgba(190,24,93,0.15)"   },
  ];

  return (
    <div className="card spotlight h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="label">User Distribution</p>
          <p className="mt-1.5 tabular-nums" style={{ fontSize: "1.75rem", fontWeight: 750, letterSpacing: "-0.03em", lineHeight: 1.2, color: "var(--text-1)" }}>
            {total}{" "}
            <span className="text-sm font-normal" style={{ color: "var(--text-3)" }}>total users</span>
          </p>
        </div>
        <Link to="/admin/users" className="btn-ghost px-3 py-1.5 text-xs">Gérer<ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {total > 0 ? (
        <>
          {/* Segmented bar */}
          <div className="mt-5 flex h-2 overflow-hidden rounded-full gap-0.5" style={{ background: "var(--surface-3)" }}>
            {items.map(({ label, value, bg }) => (
              <div
                key={label}
                className={`${bg} h-full transition-all duration-1000 rounded-full`}
                style={{ width: `${(value / total) * 100}%`, boxShadow: `0 0 8px currentColor` }}
                title={`${label}: ${value}`}
              />
            ))}
          </div>

          {/* Breakdown rows */}
          <div className="mt-5 space-y-3">
            {items.map(({ label, value, accent, track }) => {
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: accent }}>{label}</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs tabular-nums" style={{ color: "var(--text-3)" }}>{pct}%</span>
                      <span className="w-5 text-right text-sm font-bold tabular-nums" style={{ color: "var(--text-1)" }}>{value}</span>
                    </div>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}80, ${accent})`, boxShadow: `0 0 6px ${accent}60` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm" style={{ color: "var(--text-3)" }}>No users yet.</p>
      )}
    </div>
  );
};

/* ── Quick-access management link ────────────────────────────── */
const ManageCard = ({ to, title, description, icon: Icon, count, accent, glow, delay = 0 }) => (
  <Link to={to} className="group block fade-up" style={{ animationDelay: `${delay}ms` }}>
    <div
      className="spotlight relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-lg)] p-5"
      style={{
        border: `1px solid ${accent}15`,
        background: "var(--surface)",
        backdropFilter: "blur(20px)",
        transition: "border-color 200ms, box-shadow 200ms, transform 200ms, background 200ms",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${accent}40`;
        e.currentTarget.style.background = `rgba(6,6,22,0.9)`;
        e.currentTarget.style.boxShadow = `0 0 40px ${glow}, 0 8px 32px rgba(0,0,0,0.4), inset 0 0 40px ${glow.replace("0.12","0.04")}`;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = `${accent}15`;
        e.currentTarget.style.background = "var(--surface)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Top shimmer */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}35, transparent)` }} />

      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${accent}25, ${accent}12)`,
          border: `1px solid ${accent}35`,
          boxShadow: `0 0 20px ${accent}20`,
        }}
      >
        <Icon style={{ color: accent, width: 20, height: 20, filter: `drop-shadow(0 0 4px ${accent})` }} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.015em" }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{description}</p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span
          className="tabular-nums"
          style={{ fontSize: "1.75rem", fontWeight: 750, letterSpacing: "-0.04em", lineHeight: 1, color: accent, filter: `drop-shadow(0 0 6px ${accent}80)` }}
        >
          {count ?? 0}
        </span>
        <ArrowUpRight
          className="h-4 w-4 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 opacity-0 group-hover:opacity-100"
          style={{ color: accent }}
        />
      </div>
    </div>
  </Link>
);

/* ── Main ────────────────────────────────────────────────────── */
const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats,         setStats]         = useState(null);
  const [userBreakdown, setUserBreakdown] = useState({ admins: 0, teachers: 0, students: 0 });
  const [loading,       setLoading]       = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        axiosClient.get("admin/stats/"),
        axiosClient.get("users/"),
      ]);
      setStats(statsRes.data);
      const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || [];
      setUserBreakdown({
        admins:   users.filter(u => u.role === "ADMIN").length,
        teachers: users.filter(u => u.role === "TEACHER").length,
        students: users.filter(u => u.role === "STUDENT").length,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const firstName = user?.first_name || user?.username || "Admin";

  const STATS = stats ? [
    { label: "Students",  value: stats.students,  icon: GraduationCap, accent: "#a78bfa", glow: "rgba(124,58,237,0.15)", delay: 0   },
    { label: "Teachers",  value: stats.teachers,  icon: Users,         accent: "#22d3ee", glow: "rgba(8,145,178,0.15)",  delay: 60  },
    { label: "Courses",   value: stats.courses,   icon: BookOpen,      accent: "#fbbf24", glow: "rgba(180,83,9,0.15)",   delay: 120 },
    { label: "Materials", value: stats.materials, icon: FileText,      accent: "#4ade80", glow: "rgba(21,128,61,0.15)",  delay: 180 },
  ] : [];

  const MANAGE_CARDS = stats ? [
    { to: "/admin/users",       title: "Users",       description: "Manage platform accounts & roles",      icon: Users,     count: stats.users,       accent: "#a78bfa", glow: "rgba(124,58,237,0.12)", delay: 0   },
    { to: "/admin/departments", title: "Departments", description: "Academic structure & organization",      icon: Building2, count: stats.departments, accent: "#60a5fa", glow: "rgba(29,78,216,0.12)",  delay: 60  },
    { to: "/admin/filieres",    title: "Filieres",    description: "Programs within departments",            icon: Layers,    count: stats.filieres,    accent: "#f472b6", glow: "rgba(190,24,93,0.12)",  delay: 120 },
    { to: "/admin/courses",     title: "Courses",     description: "Courses, teachers & materials",          icon: BookOpen,  count: stats.courses,     accent: "#fbbf24", glow: "rgba(180,83,9,0.12)",   delay: 180 },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header fade-up">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 max-w-[40px]"
                style={{ background: "linear-gradient(90deg, rgba(244,114,182,0.5), transparent)" }} />
              <p className="label">Admin Command Center</p>
            </div>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 750, letterSpacing: "-0.04em", color: "#f0f0ff", lineHeight: 1.1 }}>
              Welcome,{" "}
              <span style={{
                background: "linear-gradient(135deg, #f472b6 0%, #a78bfa 50%, #22d3ee 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{firstName}</span>
            </h1>
            <p className="page-sub mt-2">Aperçu complet de la plateforme · {new Date().toLocaleDateString("fr-FR", { weekday: "long", month: "long", day: "numeric" })}</p>
          </div>
          <Link to="/admin/users">
            <button className="btn-primary gap-1.5 px-5 py-2.5">
              <Plus className="h-4 w-4" /> Nouvel utilisateur
            </button>
          </Link>
        </div>

        {/* Stat cards */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-28 rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 stagger">
            {STATS.map(s => <StatCard key={s.label} {...s} />)}
          </div>
        )}

        {/* Main two-column */}
        {!loading && stats && (
          <div className="grid gap-5 lg:grid-cols-5 fade-up" style={{ animationDelay: "200ms" }}>
            <div className="lg:col-span-3">
              <UserBreakdown {...userBreakdown} />
            </div>

            {/* Dept & Filiere quick stats */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              {[
                { to: "/admin/departments", label: "Departments", value: stats.departments, icon: Building2, accent: "#60a5fa", glow: "rgba(29,78,216,0.15)" },
                { to: "/admin/filieres",    label: "Filieres",    value: stats.filieres,    icon: Layers,    accent: "#f472b6", glow: "rgba(190,24,93,0.15)" },
              ].map(({ to, label, value, icon: Icon, accent, glow }) => (
                <Link to={to} key={label} className="group flex-1 block">
                  <div
                    className="spotlight relative h-full overflow-hidden rounded-[var(--radius-lg)] p-5 transition-all duration-200"
                    style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.background = `linear-gradient(135deg, ${glow}, var(--surface))`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
                  >
                    <div
                      className="pointer-events-none absolute right-4 top-4 h-16 w-16 rounded-full"
                      style={{ background: glow, filter: "blur(20px)" }}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: accent }} />
                        <p className="label">{label}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: accent }} />
                    </div>
                    <p className="mt-3 tabular-nums" style={{ fontSize: "2.25rem", fontWeight: 750, letterSpacing: "-0.04em", lineHeight: 1, color: accent, textShadow: `0 0 20px ${accent}50` }}>{value}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Management cards */}
        {!loading && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: "0.8125rem", fontWeight: 650, letterSpacing: "-0.01em", color: "var(--text-1)" }}>Quick Management</h2>
              <span className="text-xs" style={{ color: "var(--text-3)" }}>Click any card to manage</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 stagger">
              {MANAGE_CARDS.map(c => <ManageCard key={c.title} {...c} />)}
            </div>
          </div>
        )}

        {/* Platform status */}
        <div className="card spotlight fade-up" style={{ animationDelay: "350ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4" style={{ color: "#4ade80" }} />
            <p className="label">Platform Status</p>
            <div className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-green-400"
                 style={{ background: "rgba(21,128,61,0.1)", border: "1px solid rgba(74,222,128,0.15)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> All systems operational
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            {[
              { icon: Wifi,     label: "API Server",          status: "online",  color: "#4ade80" },
              { icon: Activity, label: "Face Recognition",    status: "online",  color: "#4ade80" },
              { icon: Bot,      label: "AI Tutor",            status: "dev",     color: "#fbbf24" },
            ].map(({ icon: Icon, label, status, color }) => (
              <div key={label} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                <div className="live-dot" style={{ color }}>
                  <span style={{ background: color }} />
                  <span style={{ background: color }} />
                </div>
                <span>{label}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Attendance analytics ─────────────────────────────────────── */}
        <AnalyticsCharts />

      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;