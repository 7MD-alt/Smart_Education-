import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axiosClient from "../../api/axiosClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import EditCredentialsSection from "../../components/EditCredentialsSection";
import { User, Mail, ShieldCheck, Users, BookOpen, Building2, GraduationCap, FileText, Layers } from "lucide-react";

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-4 rounded-[var(--radius)] px-4 py-3"
       style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
         style={{ background: "var(--surface-2)" }}>
      <Icon className="h-4 w-4" style={{ color: "var(--text-3)" }} />
    </div>
    <div className="min-w-0">
      <p className="label">{label}</p>
      <p className="mt-0.5 text-sm font-medium" style={{ color: "var(--text-1)" }}>{value || "—"}</p>
    </div>
  </div>
);

const AdminProfilePage = () => {
  const { user } = useAuth();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get("admin/stats/").then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || user.username?.[0]?.toUpperCase()
    : "A";
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="page-header">
          <div>
            <p className="label">Account</p>
            <h1 className="page-title mt-1">My Profile</h1>
            <p className="page-sub">Your account details and platform overview.</p>
          </div>
        </div>

        {/* Avatar card */}
        <div className="card flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius-lg)] text-xl font-bold text-white bg-pink-700">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>{fullName}</h2>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>@{user?.username}</p>
            <div className="mt-2 flex gap-2">
              <span className="badge badge-pink"><ShieldCheck className="h-3 w-3" /> Administrator</span>
              {user?.is_active && <span className="badge badge-green"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Active</span>}
            </div>
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="label mb-3">Account Information</p>
          <div className="space-y-2">
            <InfoRow icon={User}       label="Full Name"       value={fullName} />
            <InfoRow icon={Mail}       label="Email"           value={user?.email} />
            <InfoRow icon={ShieldCheck} label="Role"           value="Administrator" />
            <InfoRow icon={Users}      label="Account Status"  value={user?.is_active ? "Active" : "Inactive"} />
          </div>
        </div>

        <EditCredentialsSection accent="pink" />

        {/* Platform stats */}
        <div>
          <p className="label mb-3">Platform Overview</p>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-20 rounded-[var(--radius-lg)]" />)}
            </div>
          ) : stats && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Users",       value: stats.users,       icon: Users,        color: "text-pink-400"   },
                { label: "Students",    value: stats.students,    icon: GraduationCap, color: "text-violet-400" },
                { label: "Teachers",    value: stats.teachers,    icon: User,         color: "text-cyan-400"   },
                { label: "Courses",     value: stats.courses,     icon: BookOpen,     color: "text-amber-400"  },
                { label: "Departments", value: stats.departments, icon: Building2,    color: "text-blue-400"   },
                { label: "Filieres",    value: stats.filieres,    icon: Layers,       color: "text-fuchsia-400"},
                { label: "Materials",   value: stats.materials,   icon: FileText,     color: "text-green-400"  },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="stat-card">
                  <div className="flex items-center justify-between">
                    <p className="stat-label">{label}</p>
                    <Icon className={`h-4 w-4 ${color}`} style={{ opacity: 0.7 }} />
                  </div>
                  <p className="stat-value">{value ?? "—"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminProfilePage;