import { useEffect, useRef, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Camera, CameraOff, ScanLine, StopCircle,
  CheckCircle2, XCircle, AlertCircle, Loader2,
  Users, Eye, ChevronDown,
} from "lucide-react";

const StatusBadge = ({ status }) => {
  if (!status) return null;
  const map = {
    PRESENT: { label: "Present", cls: "badge-green",  Icon: CheckCircle2 },
    ABSENT:  { label: "Absent",  cls: "badge-red",    Icon: XCircle      },
    LATE:    { label: "Late",    cls: "badge-amber",   Icon: AlertCircle  },
  };
  const { label, cls, Icon } = map[status] ?? { label: status, cls: "badge", Icon: CheckCircle2 };
  return <span className={`badge ${cls}`}><Icon className="h-3 w-3" />{label}</span>;
};

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

  useEffect(() => {
    axiosClient.get("me/courses/")
      .then(r => { const d = Array.isArray(r.data) ? r.data : r.data.results || []; setCourses(d); if (d.length > 0) setCourseId(d[0].id); })
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
      const v = videoRef.current, cv = canvasRef.current, ctx = cv.getContext("2d");
      cv.width = v.videoWidth; cv.height = v.videoHeight; ctx.drawImage(v, 0, 0, cv.width, cv.height);
      const blob = await new Promise(res => cv.toBlob(f => res(f), "image/jpeg"));
      if (!blob) { toast.error("Failed to capture frame."); return; }
      const fd = new FormData(); fd.append("image", blob, "frame.jpg"); fd.append("course_id", courseId);
      const res = await axiosClient.post("attendance/scan/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data); setScanCount(c => c + 1);
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

  const selectedCourse = courses.find(c => c.id === Number(courseId));

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header">
          <div>
            <p className="label">Attendance</p>
            <h1 className="page-title mt-1">Live Attendance Scan</h1>
            <p className="page-sub">Point the camera at students to auto-mark attendance via face recognition.</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">

          {/* Left: camera */}
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
                  <select value={courseId} onChange={e => setCourseId(e.target.value)}
                          disabled={isScanning || cameraStarted} className="input w-full appearance-none pr-9 disabled:opacity-50">
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
                </div>
              )}
              {selectedCourse && <p className="mt-2 text-xs" style={{ color: "var(--text-3)" }}>Max absences: {selectedCourse.max_absences}</p>}
            </div>

            {/* Camera feed */}
            <div className="relative overflow-hidden rounded-[var(--radius-xl)]"
                 style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-[var(--radius-xl)]"
                     style={{ display: cameraStarted ? "block" : "none" }} />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraStarted && (
                <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
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
                  <StopCircle className="h-4 w-4" /> Stop Auto Scan
                </button>
              )}
            </div>
          </div>

          {/* Right: results */}
          <div className="space-y-4">
            {/* Scan stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Scans Run",       value: scanCount,                                                              color: "var(--text-1)" },
                { label: "Faces Detected",  value: result?.faces_detected   ?? "—",                                       color: "#22d3ee" },
                { label: "Recognized",      value: result?.recognized_count ?? "—",                                       color: "#4ade80" },
                { label: "Unrecognized",    value: result ? (result.faces_detected ?? 0) - (result.recognized_count ?? 0) : "—", color: "#fbbf24" },
              ].map(({ label, value, color }) => (
                <div key={label} className="stat-card">
                  <p className="stat-label">{label}</p>
                  <p className="stat-value text-xl" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Recognized students */}
            <div className="card overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                <Users className="h-4 w-4" style={{ color: "var(--text-3)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Recognized Students</h2>
                {result?.recognized_students?.length > 0 && (
                  <span className="badge badge-green ml-auto">{result.recognized_students.length}</span>
                )}
              </div>
              <div className="p-4">
                {!result ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ScanLine className="h-8 w-8" style={{ color: "var(--text-3)" }} />
                    <p className="mt-3 text-sm" style={{ color: "var(--text-2)" }}>No scan results yet</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>Start scanning to see recognized students</p>
                  </div>
                ) : result.recognized_students?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <XCircle className="h-8 w-8" style={{ color: "var(--text-3)" }} />
                    <p className="mt-3 text-sm" style={{ color: "var(--text-2)" }}>No students recognized</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>Make sure faces are well-lit and visible</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {result.recognized_students.map(s => (
                      <div key={s.student_id} className="flex items-center justify-between rounded-[var(--radius)] px-3 py-2"
                           style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-semibold"
                               style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                            {s.full_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{s.full_name}</p>
                            <p className="text-xs" style={{ color: "var(--text-3)" }}>{s.student_id}</p>
                          </div>
                        </div>
                        <StatusBadge status={s.status_marked} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ScanAttendance;
