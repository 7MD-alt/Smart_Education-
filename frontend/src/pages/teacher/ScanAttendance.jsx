import { useEffect, useRef, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Camera, CameraOff, ScanLine, StopCircle,
  CheckCircle2, XCircle, AlertCircle, Loader2,
  Users, Eye, ChevronDown, Download, FileSpreadsheet,
  Sparkles, Clock,
} from "lucide-react";

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status, highlight }) => {
  const map = {
    PRESENT: { label: "Present", cls: "badge-green",  Icon: CheckCircle2 },
    ABSENT:  { label: "Absent",  cls: "badge-red",    Icon: XCircle      },
    LATE:    { label: "Late",    cls: "badge-amber",   Icon: AlertCircle  },
  };
  const { label, cls, Icon } = map[status] ?? { label: status, cls: "badge", Icon: CheckCircle2 };
  return (
    <span className={`badge ${cls} ${highlight ? "ring-1 ring-offset-1 ring-green-400/60" : ""}`}>
      <Icon className="h-3 w-3" />{label}
      {highlight && <Sparkles className="h-3 w-3 ml-0.5 text-green-300" />}
    </span>
  );
};

// ── Stat tile ─────────────────────────────────────────────────────────────────
const StatTile = ({ label, value, color }) => (
  <div className="stat-card">
    <p className="stat-label">{label}</p>
    <p className="stat-value text-xl" style={{ color }}>{value}</p>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
function ScanAttendance() {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const intervalRef = useRef(null);
  const toast = useToast();

  const [courses,        setCourses]        = useState([]);
  const [courseId,       setCourseId]       = useState("");
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [result,         setResult]         = useState(null);
  const [cameraStarted,  setCameraStarted]  = useState(false);
  const [isScanning,     setIsScanning]     = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [scanCount,      setScanCount]      = useState(0);
  const [downloading,    setDownloading]    = useState(false);

  useEffect(() => {
    axiosClient.get("me/courses/")
      .then(r => {
        const d = Array.isArray(r.data) ? r.data : r.data.results || [];
        setCourses(d);
        if (d.length > 0) setCourseId(d[0].id);
      })
      .catch(() => toast.error("Failed to load courses."))
      .finally(() => setCoursesLoading(false));
    return () => { stopAutoScan(); stopCamera(); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) { videoRef.current.srcObject = stream; setCameraStarted(true); }
    } catch { toast.error("Unable to access camera. Check browser permissions."); }
  };

  const stopCamera = () => {
    const v = videoRef.current;
    if (v?.srcObject) { v.srcObject.getTracks().forEach(t => t.stop()); v.srcObject = null; }
    setCameraStarted(false); stopAutoScan();
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || !courseId) return;
    setLoading(true);
    try {
      const v = videoRef.current, cv = canvasRef.current;
      cv.width = v.videoWidth; cv.height = v.videoHeight;
      cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height);
      const blob = await new Promise(res => cv.toBlob(f => res(f), "image/jpeg"));
      if (!blob) { toast.error("Failed to capture frame."); return; }
      const fd = new FormData();
      fd.append("image", blob, "frame.jpg");
      fd.append("course_id", courseId);
      const res = await axiosClient.post("attendance/scan/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data);
      setScanCount(c => c + 1);
      if (res.data.recognized_count > 0) {
        toast.success(`${res.data.recognized_count} student${res.data.recognized_count > 1 ? "s" : ""} recognised`);
      }
    } catch (e) { toast.error(e.response?.data?.error || "Scan failed."); }
    finally { setLoading(false); }
  };

  const startAutoScan = () => {
    if (!cameraStarted) { toast.error("Start the camera first."); return; }
    if (isScanning) return;
    setIsScanning(true);
    intervalRef.current = setInterval(captureAndScan, 2000);
  };

  const stopAutoScan = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsScanning(false);
  };

  const downloadReport = async (dateFilter) => {
    if (!courseId) return;
    setDownloading(true);
    try {
      const params = dateFilter ? `?date=${dateFilter}` : "";
      const res = await axiosClient.get(
        `teacher/courses/${courseId}/report/${params}`,
        { responseType: "blob" }
      );
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement("a");
      const course = courses.find(c => c.id === Number(courseId));
      const label  = dateFilter ? `_${dateFilter}` : "_full";
      a.href       = url;
      a.download   = `attendance_${course?.title?.replace(/\s+/g, "_") || courseId}${label}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Failed to download report."); }
    finally { setDownloading(false); }
  };

  const selectedCourse = courses.find(c => c.id === Number(courseId));

  // Separate roster into present/late and absent
  const rosterPresent = result?.roster?.filter(s => s.status !== "ABSENT") ?? [];
  const rosterAbsent  = result?.roster?.filter(s => s.status === "ABSENT")  ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header">
          <div>
            <p className="label">Attendance</p>
            <h1 className="page-title mt-1">Scan de présence en direct</h1>
            <p className="page-sub">Pointez la caméra vers les étudiants pour marquer la présence automatiquement par reconnaissance faciale.</p>
          </div>
          {result && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadReport(result.scan_date)}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-[var(--radius)] border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50 transition"
              >
                {downloading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <FileSpreadsheet className="h-4 w-4" />}
                Session Report
              </button>
              <button
                onClick={() => downloadReport(null)}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-[var(--radius)] border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-50 transition"
              >
                <Download className="h-4 w-4" /> Full Report
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_400px]">

          {/* ── Left: camera ── */}
          <div className="space-y-4">

            {/* Course selector */}
            <div className="card">
              <p className="label mb-2">Select Course</p>
              {coursesLoading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-2)" }}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading courses…
                </div>
              ) : courses.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-2)" }}>No courses assigned to you.</p>
              ) : (
                <div className="relative">
                  <select value={courseId} onChange={e => { setCourseId(e.target.value); setResult(null); setScanCount(0); }}
                          disabled={isScanning || cameraStarted} className="input w-full appearance-none pr-9 disabled:opacity-50">
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
                </div>
              )}
              {selectedCourse && (
                <p className="mt-2 text-xs" style={{ color: "var(--text-3)" }}>Max absences: {selectedCourse.max_absences}</p>
              )}
            </div>

            {/* Camera feed */}
            <div className="relative overflow-hidden rounded-[var(--radius-xl)]"
                 style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-[var(--radius-xl)]"
                     style={{ display: cameraStarted ? "block" : "none" }} />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraStarted && (
                <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)]"
                       style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <CameraOff className="h-6 w-6" style={{ color: "var(--text-3)" }} />
                  </div>
                  <p className="mt-4 text-sm" style={{ color: "var(--text-2)" }}>Camera is off</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>Start the camera to begin scanning</p>
                </div>
              )}

              {isScanning && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[var(--radius-xl)]">
                  <span className="badge badge-cyan gap-2 px-4 py-2 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Auto-scanning every 2 s
                  </span>
                </div>
              )}
              {loading && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[var(--radius-xl)]"
                     style={{ background: "rgba(0,0,0,0.2)" }}>
                  <Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--text-2)" }} />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
              {!cameraStarted ? (
                <button onClick={startCamera} disabled={coursesLoading || !courseId} className="btn-primary gap-1.5 disabled:opacity-40">
                  <Camera className="h-4 w-4" /> Start Camera
                </button>
              ) : (
                <button onClick={stopCamera} className="btn-ghost gap-1.5">
                  <CameraOff className="h-4 w-4" /> Stop Camera
                </button>
              )}
              <button onClick={captureAndScan} disabled={!cameraStarted || loading} className="btn-ghost gap-1.5 disabled:opacity-40">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {loading ? "Scanning…" : "Scan Now"}
              </button>
              {!isScanning ? (
                <button onClick={startAutoScan} disabled={!cameraStarted} className="btn gap-1.5 text-sm text-cyan-300 disabled:opacity-40"
                        style={{ border: "1px solid rgba(8,145,178,0.2)", background: "rgba(8,145,178,0.08)" }}>
                  <ScanLine className="h-4 w-4" /> Auto Scan
                </button>
              ) : (
                <button onClick={stopAutoScan} className="btn gap-1.5 text-sm text-red-300"
                        style={{ border: "1px solid rgba(185,28,28,0.2)", background: "rgba(185,28,28,0.08)" }}>
                  <StopCircle className="h-4 w-4" /> Stop
                </button>
              )}
            </div>
          </div>

          {/* ── Right: results ── */}
          <div className="space-y-4">

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Scans Run"      value={scanCount}                      color="var(--text-1)" />
              <StatTile label="Faces Detected" value={result?.faces_detected ?? "—"}  color="#22d3ee" />
              <StatTile label="Present"        value={result?.present_count  ?? "—"}  color="#4ade80" />
              <StatTile label="Absent"         value={result?.absent_count   ?? "—"}  color="#f87171" />
            </div>

            {/* Session date banner */}
            {result?.scan_date && (
              <div className="flex items-center gap-2 rounded-[var(--radius)] border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <Clock className="h-4 w-4 shrink-0" style={{ color: "var(--text-3)" }} />
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  Session: <span className="font-medium" style={{ color: "var(--text-2)" }}>{result.scan_date}</span>
                  {result.course_title && (
                    <> · <span className="font-medium" style={{ color: "var(--text-2)" }}>{result.course_title}</span></>
                  )}
                  {result.total_enrolled != null && (
                    <> · {result.total_enrolled} enrolled</>
                  )}
                </p>
              </div>
            )}

            {/* Full roster panel */}
            <div className="card overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                <Users className="h-4 w-4" style={{ color: "var(--text-3)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Class Roster</h2>
                {result?.roster && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="badge badge-green">{result.present_count} present</span>
                    <span className="badge badge-red">{result.absent_count} absent</span>
                  </div>
                )}
              </div>

              <div className="p-3 max-h-[420px] overflow-y-auto space-y-1.5">
                {!result ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ScanLine className="h-8 w-8" style={{ color: "var(--text-3)" }} />
                    <p className="mt-3 text-sm" style={{ color: "var(--text-2)" }}>Aucun résultat de scan</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>Start scanning to see the class roster</p>
                  </div>
                ) : result.roster?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <XCircle className="h-8 w-8" style={{ color: "var(--text-3)" }} />
                    <p className="mt-3 text-sm" style={{ color: "var(--text-2)" }}>Aucun étudiant inscrit</p>
                  </div>
                ) : (
                  <>
                    {/* Present / Late first */}
                    {rosterPresent.length > 0 && (
                      <div className="space-y-1">
                        <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-green-400/70">
                          Present · {rosterPresent.length}
                        </p>
                        {rosterPresent.map(s => (
                          <StudentRow key={s.student_id} student={s} />
                        ))}
                      </div>
                    )}

                    {/* Absent */}
                    {rosterAbsent.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-red-400/70">
                          Absent · {rosterAbsent.length}
                        </p>
                        {rosterAbsent.map(s => (
                          <StudentRow key={s.student_id} student={s} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Download buttons (bottom, shown after first scan) */}
            {result && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => downloadReport(result.scan_date)}
                  disabled={downloading}
                  className="flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50 transition"
                >
                  {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                  Today's Session (.xlsx)
                </button>
                <button
                  onClick={() => downloadReport(null)}
                  disabled={downloading}
                  className="flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-violet-500/30 bg-violet-500/10 px-3 py-2.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-50 transition"
                >
                  <Download className="h-3.5 w-3.5" /> Full Course (.xlsx)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ── Student row ───────────────────────────────────────────────────────────────
function StudentRow({ student }) {
  const initials = student.full_name?.charAt(0)?.toUpperCase() || "?";
  return (
    <div className={`flex items-center justify-between rounded-[var(--radius)] px-3 py-2 transition ${student.just_recognized ? "ring-1 ring-green-500/30" : ""}`}
         style={{ border: "1px solid var(--border)", background: student.just_recognized ? "rgba(74,222,128,0.05)" : "var(--bg)" }}>
      <div className="flex items-center gap-2.5">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-semibold ${student.just_recognized ? "bg-green-500/20 text-green-300" : ""}`}
             style={!student.just_recognized ? { background: "var(--surface-2)", color: "var(--text-2)" } : {}}>
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{student.full_name}</p>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>{student.student_id}</p>
        </div>
      </div>
      <StatusBadge status={student.status} highlight={student.just_recognized} />
    </div>
  );
}

export default ScanAttendance;
