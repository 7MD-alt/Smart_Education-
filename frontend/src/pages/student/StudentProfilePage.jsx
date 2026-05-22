import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import EditCredentialsSection from "../../components/EditCredentialsSection";
import { User, Mail, Hash, BookOpen, GraduationCap, Building2, Calendar, ShieldCheck } from "lucide-react";

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-4 rounded-[var(--radius)] px-4 py-3 transition-colors"
       style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
       onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-hover)"}
       onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
         style={{ background: "var(--surface-2)" }}>
      <Icon className="h-4 w-4" style={{ color: "var(--text-3)" }} />
    </div>
    <div className="min-w-0">
      <p className="label">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium" style={{ color: "var(--text-1)" }}>{value || "—"}</p>
    </div>
  </div>
);

const StudentProfilePage = () => {
  const { user, profile } = useAuth();
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join("").toUpperCase()
    || user?.username?.[0]?.toUpperCase() || "S";
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">

        <div className="page-header">
          <div>
            <p className="label">Account</p>
            <h1 className="page-title mt-1">My Profile</h1>
          </div>
        </div>

        {/* Avatar card */}
        <div className="card flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius-lg)] text-xl font-bold text-white bg-violet-600">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>{fullName}</h2>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>@{user?.username}</p>
            <div className="mt-2 flex gap-2">
              <span className="badge badge-violet"><ShieldCheck className="h-3 w-3" /> Student</span>
              {user?.is_active && <span className="badge badge-green"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Active</span>}
            </div>
          </div>
        </div>

        {/* Personal info */}
        <div>
          <p className="label mb-3">Personal Information</p>
          <div className="space-y-2">
            <InfoRow icon={User}  label="Full Name" value={fullName} />
            <InfoRow icon={Mail}  label="Email"     value={user?.email} />
            <InfoRow icon={Hash}  label="Username"  value={user?.username} />
          </div>
        </div>

        {/* Academic info */}
        <div>
          <p className="label mb-3">Academic Information</p>
          <div className="space-y-2">
            <InfoRow icon={Hash}         label="Student ID"       value={profile?.student_id} />
            <InfoRow icon={BookOpen}     label="Filière (Program)" value={profile?.filiere?.name} />
            <InfoRow icon={Building2}    label="Department"        value={profile?.filiere?.department?.name} />
            <InfoRow icon={Calendar}     label="Semester"          value={profile?.semester ? `Semester ${profile.semester}` : null} />
            <InfoRow icon={GraduationCap} label="Account Type"    value="Student" />
          </div>
        </div>

        <EditCredentialsSection accent="violet" />
      </div>
    </DashboardLayout>
  );
};

export default StudentProfilePage;