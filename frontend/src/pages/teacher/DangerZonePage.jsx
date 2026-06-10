import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  ArrowLeft, AlertTriangle, Users, Loader2,
  CheckCircle2, ShieldAlert, Mail, Skull,
} from "lucide-react";

const DangerZonePage = () => {
  const { courseId } = useParams();
  const toast = useToast();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axiosClient.get(`courses/${courseId}/danger-zone-students/`)
      .then(r => setData(r.data))
      .catch(() => { setError("Failed to load danger zone data."); toast.error("Failed to load danger zone students."); })
      .finally(() => setLoading(false));
  }, [courseId]);

  const dangerCt  = data?.danger_students?.filter(s => s.status === "DANGER").length  ?? 0;
  const warningCt = data?.danger_students?.filter(s => s.status === "WARNING").length ?? 0;

  const sendAlerts = async () => {
    setSending(true);
    try {
      // Trigger n8n webhook — n8n fetches danger zone students and emails them via Django
      const n8nUrl = import.meta.env.VITE_N8N_DANGER_WEBHOOK
        || "http://localhost:5678/webhook/campuseye-danger-alerts";
      await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId }),
      });
      toast.success("Alert workflow triggered — emails are being sent to at-risk students.");
    } catch {
      // Fallback: call Django directly if n8n is unreachable
      try {
        const res = await axiosClient.post(`teacher/courses/${courseId}/send-alerts/`);
        toast.success(res.data.message || `Alerts sent to ${res.data.sent} student(s).`);
      } catch { toast.error("Failed to send alerts. Make sure n8n is running."); }
    }
    finally { setSending(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Back + Header */}
        <div>
          <Link to="/teacher" className="inline-flex items-center gap-1.5 text-xs mb-4 transition"
                style={{ color: "var(--text-3)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <div className="page-header">
            <div>
              <p className="label flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-red-400" /> Danger Zone</p>
              <h1 className="page-title mt-1">{data?.course_title ?? "Loading…"}</h1>
              <p className="page-sub">Étudiants proches ou au-delà de la limite d'absences.</p>
            </div>
            {data && !loading && (
              <button onClick={sendAlerts} disabled={sending || (dangerCt + warningCt === 0)}
                      className="btn gap-1.5 px-4 py-2.5 text-sm text-amber-300 disabled:opacity-40"
                      style={{ border: "1px solid rgba(180,83,9,0.25)", background: "rgba(180,83,9,0.08)" }}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {sending ? "Sending…" : "Send Email Alerts"}
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-[var(--radius)] px-4 py-3 text-sm text-red-400"
               style={{ background: "rgba(185,28,28,0.08)", border: "1px solid rgba(185,28,28,0.2)" }}>
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Flagged", value: data.danger_students.length, icon: Users,    color: "text-[var(--text-1)]", bg: "var(--surface)", border: "var(--border)" },
                { label: "Warning", value: warningCt,                   icon: ShieldAlert, color: "text-amber-400",  bg: "rgba(180,83,9,0.08)", border: "rgba(180,83,9,0.2)" },
                { label: "Danger",  value: dangerCt,                    icon: Skull,     color: "text-red-400",     bg: "rgba(185,28,28,0.08)", border: "rgba(185,28,28,0.2)" },
              ].map(({ label, value, icon: Icon, color, bg, border }) => (
                <div key={label} className="rounded-[var(--radius-lg)] p-5" style={{ background: bg, border: `1px solid ${border}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="label">{label}</p>
                    <Icon className={`h-4 w-4 ${color}`} style={{ opacity: 0.7 }} />
                  </div>
                  <p className={`text-3xl font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Student list */}
            {data.danger_students.length === 0 ? (
              <div className="empty-state">
                <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(21,128,61,0.1)" }}>
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-400">Tous les étudiants sont dans les limites</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Aucun problème de présence pour ce cours.</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>At-Risk Students</h2>
                  <span className="label">{data.danger_students.length} flagged</span>
                </div>
                <div className="table-wrap">
                  <table className="table-base">
                    <thead><tr><th>Student</th><th>ID</th><th>Absences</th><th>Progress</th><th>Status</th></tr></thead>
                    <tbody>
                      {[...data.danger_students].sort((a, b) => a.status === "DANGER" && b.status !== "DANGER" ? -1 : 1).map(s => {
                        const isDanger = s.status === "DANGER";
                        const pct = Math.min((s.absences / s.max_absences) * 100, 100);
                        return (
                          <tr key={s.student_id}>
                            <td>
                              <div className="flex items-center gap-2.5">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${isDanger ? "text-red-300" : "text-amber-300"}`}
                                     style={{ background: isDanger ? "rgba(185,28,28,0.1)" : "rgba(180,83,9,0.1)", border: `1px solid ${isDanger ? "rgba(185,28,28,0.2)" : "rgba(180,83,9,0.2)"}` }}>
                                  {s.full_name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <span className="font-medium" style={{ color: "var(--text-1)" }}>{s.full_name}</span>
                              </div>
                            </td>
                            <td><code className="text-xs" style={{ color: "var(--text-3)" }}>{s.student_id}</code></td>
                            <td><span className={`font-semibold ${isDanger ? "text-red-400" : "text-amber-400"}`}>{s.absences} / {s.max_absences}</span></td>
                            <td style={{ minWidth: 120 }}>
                              <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                <div className={`h-1.5 rounded-full ${isDanger ? "bg-red-400" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${isDanger ? "badge-red" : "badge-amber"}`}>
                                {isDanger ? <Skull className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DangerZonePage;
