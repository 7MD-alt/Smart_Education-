import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useToast } from "../../context/ToastContext";
import { ArrowLeft, Calendar, CheckCircle2, XCircle, Clock, Save, Download, Loader2, Users, RefreshCw } from "lucide-react";

const STATUS_OPTIONS = ["PRESENT", "ABSENT", "LATE"];

const STATUS_CFG = {
  PRESENT: {
    active:   { color: "text-green-300",  bg: "rgba(21,128,61,0.15)",  border: "rgba(21,128,61,0.4)"  },
    inactive: { color: "var(--text-3)",   bg: "transparent",           border: "var(--border)"        },
    icon: CheckCircle2,
  },
  ABSENT: {
    active:   { color: "text-red-300",    bg: "rgba(185,28,28,0.15)",  border: "rgba(185,28,28,0.4)"  },
    inactive: { color: "var(--text-3)",   bg: "transparent",           border: "var(--border)"        },
    icon: XCircle,
  },
  LATE: {
    active:   { color: "text-amber-300",  bg: "rgba(180,83,9,0.15)",   border: "rgba(180,83,9,0.4)"   },
    inactive: { color: "var(--text-3)",   bg: "transparent",           border: "var(--border)"        },
    icon: Clock,
  },
};

const today = () => new Date().toISOString().split("T")[0];

const ManualAttendancePage = () => {
  const { courseId } = useParams();
  const toast = useToast();

  const [courseTitle, setCourseTitle] = useState("");
  const [date,        setDate]        = useState(today());
  const [students,    setStudents]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [exporting,   setExporting]   = useState(false);

  const fetchStudents = useCallback(async (d) => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`teacher/courses/${courseId}/students/?date=${d}`);
      setCourseTitle(res.data.course_title);
      setStudents(res.data.students);
    } catch { toast.error("Failed to load students."); }
    finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { fetchStudents(date); }, [date, fetchStudents]);

  const setStatus = (id, status) => setStudents(p => p.map(s => s.student_profile_id === id ? { ...s, status } : s));
  const markAll   = (status)     => setStudents(p => p.map(s => ({ ...s, status })));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axiosClient.post(`teacher/courses/${courseId}/attendance/save/`, {
        date, records: students.map(s => ({ student_profile_id: s.student_profile_id, status: s.status })),
      });
      toast.success(`Saved ${res.data.saved} records for ${date}.`);
    } catch { toast.error("Failed to save attendance."); }
    finally { setSaving(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = [
        ["#", "Student ID", "Full Name", `Status (${date})`].join(","),
        ...students.map((s, i) => [i + 1, s.student_id, s.full_name, s.status].join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `attendance_${courseTitle.replace(/\s+/g, "_")}_${date}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Exported successfully.");
    } catch { toast.error("Export failed."); }
    finally { setExporting(false); }
  };

  const counts = students.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, { PRESENT: 0, ABSENT: 0, LATE: 0 });

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div>
          <Link to="/teacher" className="inline-flex items-center gap-1.5 text-xs mb-4 transition"
                style={{ color: "var(--text-3)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <div className="page-header">
            <div>
              <p className="label">Manual Attendance</p>
              <h1 className="page-title mt-1">{courseTitle || "Loading…"}</h1>
            </div>
          </div>
        </div>

        {/* Date picker + actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-[var(--radius)] px-3 py-2"
               style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Calendar className="h-4 w-4" style={{ color: "var(--text-3)" }} />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                   className="bg-transparent text-sm outline-none" style={{ color: "var(--text-1)" }} />
          </div>
          <button onClick={() => fetchStudents(date)} className="btn-ghost gap-1.5 px-3 py-2 text-sm">
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
          <div className="ml-auto flex gap-2">
            <button onClick={handleSave} disabled={saving || loading}
                    className="btn gap-1.5 px-4 py-2 text-sm text-cyan-300 disabled:opacity-40"
                    style={{ border: "1px solid rgba(8,145,178,0.2)", background: "rgba(8,145,178,0.08)" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={handleExport} disabled={exporting || loading || students.length === 0}
                    className="btn gap-1.5 px-4 py-2 text-sm text-green-300 disabled:opacity-40"
                    style={{ border: "1px solid rgba(21,128,61,0.2)", background: "rgba(21,128,61,0.08)" }}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary bar */}
        {students.length > 0 && (
          <div className="card flex flex-wrap items-center gap-6 py-3 px-5">
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-2)" }}>
              <Users className="h-4 w-4" style={{ color: "var(--text-3)" }} /> {students.length} students
            </div>
            <div className="flex items-center gap-1.5 text-sm text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> {counts.PRESENT} present</div>
            <div className="flex items-center gap-1.5 text-sm text-red-400"><XCircle className="h-3.5 w-3.5" /> {counts.ABSENT} absent</div>
            <div className="flex items-center gap-1.5 text-sm text-amber-400"><Clock className="h-3.5 w-3.5" /> {counts.LATE} late</div>
            <div className="ml-auto flex gap-2">
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => markAll(s)} className="btn-ghost px-3 py-1 text-xs">
                  All {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Student list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <Users className="h-8 w-8" style={{ color: "var(--text-3)" }} />
            <p className="text-sm" style={{ color: "var(--text-2)" }}>No students found for this course.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((s, idx) => (
              <div key={s.student_profile_id} className="flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 transition-colors"
                   style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <span className="w-5 shrink-0 text-center text-xs" style={{ color: "var(--text-3)" }}>{idx + 1}</span>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-sm font-semibold"
                     style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                  {s.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--text-1)" }}>{s.full_name}</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>{s.student_id}</p>
                </div>
                <div className="flex gap-1.5">
                  {STATUS_OPTIONS.map(opt => {
                    const cfg = STATUS_CFG[opt];
                    const Icon = cfg.icon;
                    const active = s.status === opt;
                    const style = active ? cfg.active : cfg.inactive;
                    return (
                      <button key={opt} onClick={() => setStatus(s.student_profile_id, opt)}
                              className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-xs font-medium transition-all ${active ? style.color : ""}`}
                              style={{ background: style.bg, borderColor: style.border, color: !active ? style.color : undefined }}>
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{opt.charAt(0) + opt.slice(1).toLowerCase()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom save */}
        {students.length > 0 && (
          <div className="flex justify-end pb-6">
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-1.5 px-6 py-3 text-sm font-semibold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Attendance"}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManualAttendancePage;
