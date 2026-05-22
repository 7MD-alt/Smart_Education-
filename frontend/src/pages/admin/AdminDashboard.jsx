import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import {
  Users, GraduationCap, BookOpen, Building2,
  Layers, FileText, ArrowUpRight, Plus,
  Activity, Wifi, Bot,
} from "lucide-react";

/* ── Stat card ───────────────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="stat-card">
    <div className="flex items-center justify-between">
      <p className="stat-label">{label}</p>
      <Icon className={`h-4 w-4 ${color}`} style={{ opacity: 0.7 }} />
    </div>
    <p className="stat-value count-enter">{value ?? "—"}</p>
  </div>
);

/* ── User breakdown bar ──────────────────────────────────────── */
const UserBreakdown = ({ admins = 0, teachers = 0, students = 0 }) => {
  const total = admins + teachers + students;
  const items = [
    { label: "Students", value: students, color: "bg-violet-500", text: "text-violet-400" },
    { label: "Teachers", value: teachers, color: "bg-cyan-500",   text: "text-cyan-400" },
    { label: "Admins",   value: admins,   color: "bg-pink-500",   text: "text-pink-400" },
  ];

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="label">User distribution</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--text-1)" }}>
            {total} <span className="text-sm font-normal" style={{ color: "var(--text-3)" }}>total</span>
          </p>
        </div>
        <Link to="/admin/users" className="btn-ghost px-3 py-1.5 text-xs">
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Bar */}
      {total > 0 ? (
        <>
          <div className="mt-5 flex h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
            {items.map(({ label, value, color }) => (
              <div
                key={label}
                className={`${color} transition-all duration-700`}
                style={{ width: `${(value / total) * 100}%` }}
                title={`${label}: ${value}`}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2.5">
            {items.map(({ label, value, text }) => {
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-2)" }}>
                    <span className={`text-sm font-medium ${text}`}>{label}</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs tabular-nums" style={{ color: "var(--text-3)" }}>{pct}%</span>
                    <span className="w-5 text-right text-sm font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>{value}</span>
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

/* ── Management row ──────────────────────────────────────────── */
const ManageRow = ({ to, title, description, icon: Icon, count, color }) => (
  <Link to={to} className="group block">
    <div
      className="flex items-center gap-4 rounded-[var(--radius-lg)] p-4 transition-colors duration-150"
      style={{ border: "1px solid var(--border)" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-hover)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] ${color}`}
        style={{ background: "var(--surface-2)" }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{title}</p>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>{description}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-lg font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>
          {count ?? 0}
        </span>
        <ArrowUpRight
          className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          style={{ color: "var(--text-3)" }}
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
      const raw   = usersRes.data;
      const users = Array.isArray(raw) ? raw : raw.results || [];
      setUserBreakdown({
        admins:   users.filter(u => u.role === "ADMIN").length,
        teachers: users.filter(u => u.role === "TEACHER").length,
        students: users.filter(u => u.role === "STUDENT").length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const firstName = user?.first_name || user?.username || "Admin";

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header">
          <div>
            <p className="label">Admin Panel</p>
            <h1 className="page-title mt-1">Welcome back, {firstName}</h1>
            <p className="page-sub">Overview of platform users and structure.</p>
          </div>
          <Link to="/admin/users">
            <button className="btn-primary gap-1.5">
              <Plus className="h-4 w-4" /> Add User
            </button>
          </Link>
        </div>

        {/* Stat row */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : stats && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Students"   value={stats.students}   icon={GraduationCap} color="text-violet-400" />
            <StatCard label="Teachers"   value={stats.teachers}   icon={Users}         color="text-cyan-400" />
            <StatCard label="Courses"    value={stats.courses}    icon={BookOpen}      color="text-amber-400" />
            <StatCard label="Materials"  value={stats.materials}  icon={FileText}      color="text-green-400" />
          </div>
        )}

        {/* Main row */}
        {!loading && stats && (
          <div className="grid gap-5 lg:grid-cols-5">
            {/* User breakdown — 3 col */}
            <div className="lg:col-span-3">
              <UserBreakdown {...userBreakdown} />
            </div>

            {/* Structure — 2 col */}
            <div className="lg:col-span-2 space-y-3">
              {[
                { to: "/admin/departments", label: "Departments", value: stats.departments, icon: Building2, color: "text-blue-400" },
                { to: "/admin/filieres",    label: "Filieres",    value: stats.filieres,    icon: Layers,    color: "text-pink-400" },
              ].map(({ to, label, value, icon: Icon, color }) => (
                <Link to={to} key={label} className="group block card hover:border-[var(--border-hover)] transition-colors duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${color}`} style={{ opacity: 0.8 }} />
                      <p className="label">{label}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-3)" }} />
                  </div>
                  <p className="mt-3 text-3xl font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>{value}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Management table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Management</h2>
            <span className="text-xs" style={{ color: "var(--text-3)" }}>Click to manage</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <ManageRow to="/admin/users"       title="Users"       description="Create, edit and manage platform users."       icon={Users}     count={stats?.users}       color="text-violet-400" />
            <ManageRow to="/admin/departments" title="Departments" description="Academic departments and structure."           icon={Building2} count={stats?.departments} color="text-blue-400"   />
            <ManageRow to="/admin/filieres"    title="Filieres"    description="Programs organized within departments."        icon={Layers}    count={stats?.filieres}    color="text-pink-400"   />
            <ManageRow to="/admin/courses"     title="Courses"     description="Manage courses, materials, assignments."      icon={BookOpen}  count={stats?.courses}     color="text-amber-400"  />
          </div>
        </div>

        {/* Platform status */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4" style={{ color: "var(--text-3)" }} />
            <p className="label">Platform Status</p>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { icon: Wifi, label: "API active",              color: "bg-green-400", textColor: "text-green-400" },
              { icon: Activity, label: "Face recognition",   color: "bg-green-400", textColor: "text-green-400" },
              { icon: Bot, label: "AI Tutor (dev mode)",      color: "bg-amber-400", textColor: "text-amber-400" },
            ].map(({ icon: Icon, label, color, textColor }) => (
              <div key={label} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                <span className="relative flex h-2 w-2">
                  <span className={`absolute h-full w-full animate-ping rounded-full ${color} opacity-50`} />
                  <span className={`relative h-2 w-2 rounded-full ${color}`} />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;