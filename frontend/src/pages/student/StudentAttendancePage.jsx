import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  CheckCircle, XCircle, Clock, ArrowLeft,
  CalendarDays, BookOpen, TrendingUp, AlertTriangle,
} from "lucide-react";

const STATUS = {
  PRESENT: { label: "Present", icon: CheckCircle, badge: "badge-green",  dot: "bg-green-400",  color: "#4ade80", track: "rgba(74,222,128,0.1)" },
  ABSENT:  { label: "Absent",  icon: XCircle,     badge: "badge-red",    dot: "bg-red-400",    color: "#f87171", track: "rgba(248,113,113,0.1)" },
  LATE:    { label: "Late",    icon: Clock,        badge: "badge-amber",  dot: "bg-amber-400",  color: "#fbbf24", track: "rgba(251,191,36,0.1)" },
};

const Ring = ({ value, max, color, track }) => {
  const r = 44; const circ = 2 * Math.PI * r;
  const filled = (Math.min(value / max, 1)) * circ;
  return (
    <div className="relative" style={{ width: 110, height: 110 }}>
      <svg width="110" height="110" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx="55" cy="55" r={r} fill="none" stroke={track} strokeWidth="9" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="9"
                strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>{value}</span>
        <span className="text-[10px]" style={{ color: "var(--text-3)" }}>/ {max}</span>
      </div>
    </div>
  );
};

const StudentAttendancePage = () => {
  const { courseId } = useParams();
  const toast = useToast();
  const [records,      setRecords]      = useState([]);
  const [course,       setCourse]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortOrder,    setSortOrder]    = useState("desc");

  useEffect(() => {
    const load = async () => {
      try {
        const params = courseId ? `?course_id=${courseId}` : "";
        const [recRes, coursesRes] = await Promise.all([
          axiosClient.get(`me/attendance/${params}`),
          axiosClient.get("me/courses/"),
        ]);
        setRecords(recRes.data);
        const all = Array.isArray(coursesRes.data) ? coursesRes.data : coursesRes.data.results ?? [];
        setCourse(all.find(c => String(c.id) === String(courseId)) ?? null);
      } catch { toast.error("Failed to load attendance."); }
      finally { setLoading(false); }
    };
    load();
  }, [courseId]);

  const total   = records.length;
  const present = records.filter(r => r.status === "PRESENT").length;
  const absent  = records.filter(r => r.status === "ABSENT").length;
  const late    = records.filter(r => r.status === "LATE").length;
  const rate    = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
  const maxAbs  = course?.max_absences ?? 3;
  const rateColor = rate >= 75 ? "#4ade80" : rate >= 50 ? "#fbbf24" : "#f87171";

  const visible = records
    .filter(r => filterStatus === "ALL" || r.status === filterStatus)
    .sort((a, b) => sortOrder === "desc"
      ? new Date(b.date) - new Date(a.date)
      : new Date(a.date) - new Date(b.date));

  if (loading) return (
    <DashboardLayout>
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Back + Header */}
        <div>
          <Link to="/student" className="inline-flex items-center gap-1.5 text-xs transition-colors mb-4"
                style={{ color: "var(--text-3)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <div className="page-header">
            <div>
              <p className="label">Attendance History</p>
              <h1 className="page-title mt-1">{course?.title ?? "All Courses"}</h1>
              {course?.teacher?.user && (
                <p className="page-sub">
                  {`${course.teacher.user.first_name} ${course.teacher.user.last_name}`.trim() || course.teacher.user.username}
                </p>
              )}
            </div>
            {absent >= maxAbs - 1 && (
              <span className={`badge ${absent >= maxAbs ? "badge-red" : "badge-amber"} gap-1.5 px-3 py-2`}>
                <AlertTriangle className="h-3.5 w-3.5" />
                {absent >= maxAbs ? "Absence limit reached" : "Near absence limit"}
              </span>
            )}
          </div>
        </div>

        {/* Summary row */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Attendance rate ring */}
          <div className="card flex flex-col items-center py-8 gap-3">
            <div className="relative" style={{ width: 110, height: 110 }}>
              <svg width="110" height="110" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
                <circle cx="55" cy="55" r={44} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
                <circle cx="55" cy="55" r={44} fill="none" stroke={rateColor} strokeWidth="9"
                        strokeDasharray={`${(rate / 100) * 2 * Math.PI * 44} ${2 * Math.PI * 44}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>{rate}%</span>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Rate</span>
              </div>
            </div>
            <p className="text-xs" style={{ color: "var(--text-2)" }}>Attendance rate</p>
          </div>

          {/* Breakdown */}
          <div className="card">
            <p className="label mb-4">Breakdown</p>
            <div className="space-y-2.5">
              {[
                { label: "Present", value: present, icon: CheckCircle, bg: "rgba(21,128,61,0.08)",   border: "rgba(21,128,61,0.2)",  color: "text-green-400" },
                { label: "Absent",  value: absent,  icon: XCircle,     bg: "rgba(185,28,28,0.08)",  border: "rgba(185,28,28,0.2)", color: "text-red-400"   },
                { label: "Late",    value: late,    icon: Clock,        bg: "rgba(180,83,9,0.08)",   border: "rgba(180,83,9,0.2)",  color: "text-amber-400" },
              ].map(({ label, value, icon: Icon, bg, border, color }) => (
                <div key={label} className={`flex items-center justify-between rounded-[var(--radius)] px-4 py-3`}
                     style={{ background: bg, border: `1px solid ${border}` }}>
                  <div className={`flex items-center gap-2 text-sm font-medium ${color}`}>
                    <Icon className="h-4 w-4" /> {label}
                  </div>
                  <span className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Absence limit ring */}
          <div className="card flex flex-col items-center py-8 gap-3">
            <Ring
              value={absent} max={maxAbs}
              color={absent >= maxAbs ? "#f87171" : absent >= maxAbs - 1 ? "#fbbf24" : "#4ade80"}
              track={absent >= maxAbs ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.05)"}
            />
            <p className="text-xs text-center" style={{ color: "var(--text-2)" }}>
              {maxAbs - absent > 0 ? `${maxAbs - absent} absence${maxAbs - absent !== 1 ? "s" : ""} remaining` : "Limit reached"}
            </p>
          </div>
        </div>

        {/* Records table */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" style={{ color: "var(--text-3)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Session Records</h2>
              <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-3)" }}>{total}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Filter */}
              <div className="flex rounded-[var(--radius)] p-1 text-xs" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {["ALL", "PRESENT", "ABSENT", "LATE"].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                          className={`rounded-[6px] px-3 py-1.5 font-medium transition-colors ${filterStatus === s ? "bg-white text-black" : ""}`}
                          style={{ color: filterStatus === s ? undefined : "var(--text-2)" }}>
                    {s === "ALL" ? "All" : STATUS[s].label}
                  </button>
                ))}
              </div>
              <button onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}
                      className="btn-ghost px-3 py-1.5 text-xs">
                {sortOrder === "desc" ? "Newest first" : "Oldest first"}
              </button>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="empty-state">
              <CalendarDays className="h-8 w-8" style={{ color: "var(--text-3)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Aucun enregistrement trouvé</p>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>
                {filterStatus !== "ALL" ? "Try changing the filter above" : "Attendance appears here once sessions are recorded"}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table-base">
                <thead><tr><th>Date</th><th className="hidden sm:table-cell">Day</th><th>Status</th></tr></thead>
                <tbody>
                  {visible.map((rec, i) => {
                    const cfg = STATUS[rec.status] ?? STATUS.ABSENT;
                    const Icon = cfg.icon;
                    const d = rec.date ? new Date(rec.date) : null;
                    return (
                      <tr key={rec.id ?? i}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                            <span className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                              {d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                            </span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          {d ? d.toLocaleDateString("fr-FR", { weekday: "long" }) : "—"}
                        </td>
                        <td>
                          <span className={`badge ${cfg.badge}`}>
                            <Icon className="h-3 w-3" /> {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default StudentAttendancePage;
