/**
 * NOVAAStatusPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Floating system-health & platform-metrics panel.
 * Replaces the AIChatWidget with a compact status dashboard that shows:
 *   • Backend / DB / AI service reachability
 *   • Role-aware platform metrics (students, courses, attendance rate, etc.)
 *   • Active sessions count
 *   • Danger-zone & pending-face-request alerts (admin/teacher)
 * Auto-refreshes every 30 s. Minimisable.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

// ─── tiny icons (inline SVG so no extra deps) ────────────────────────────────
const Icon = ({ d, size = 14, color = "currentColor", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  server:  "M2 3h20v6H2zM2 15h20v6H2zM6 6h.01M6 18h.01",
  db:      "M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zM12 11c-5.52 0-10-2.02-10-4.5S6.48 2 12 2s10 2.02 10 4.5S17.52 11 12 11z",
  ai:      "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z",
  users:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  courses: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
  rate:    "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
  danger:  "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  session: "M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7",
  face:    "M9 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0zM12 1a11 11 0 1 0 0 22A11 11 0 0 0 12 1zm0 20a9 9 0 0 1-4.59-16.78A9 9 0 1 1 12 21z",
  refresh: "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15",
  close:   "M18 6 6 18M6 6l12 12",
  chevron: "M6 9l6 6 6-6",
  pulse:   "M22 12h-4l-3 9L9 3l-3 9H2",
  absent:  "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
};

// ─── role colour palette ──────────────────────────────────────────────────────
const ROLE_COLOR = {
  ADMIN:   { main: "#8c28ff", glow: "rgba(140,40,255,.45)", label: "ADMIN" },
  TEACHER: { main: "#00d2ff", glow: "rgba(0,210,255,.45)",  label: "TEACHER" },
  STUDENT: { main: "#006eff", glow: "rgba(0,110,255,.45)",  label: "STUDENT" },
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function StatusDot({ ok, pending }) {
  const c = pending ? "#f59e0b" : ok ? "#00ff82" : "#ef4444";
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: c, boxShadow: `0 0 5px ${c}`, flexShrink: 0,
    }} />
  );
}

function Pill({ label, value, icon, color, sub }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "rgba(0,18,40,.55)", border: `1px solid ${color}22`,
      borderRadius: 9, padding: "7px 10px", minWidth: 0,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon d={ICONS[icon]} size={13} color={color} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 9, color: "#4a7aaa", fontFamily: "monospace",
          letterSpacing: 1, textTransform: "uppercase", lineHeight: 1 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#cce8ff",
          lineHeight: 1.2, marginTop: 1 }}>{value ?? "—"}</div>
        {sub && <div style={{ fontSize: 9, color: `${color}aa`, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function ServiceRow({ name, ok, pending, detail }) {
  const c = pending ? "#f59e0b" : ok ? "#00ff82" : "#ef4444";
  const label = pending ? "CHECKING…" : ok ? "ONLINE" : "OFFLINE";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8,
      padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
      <StatusDot ok={ok} pending={pending} />
      <span style={{ flex: 1, fontSize: 11, color: "#8ab8d8", fontFamily: "monospace" }}>{name}</span>
      <span style={{ fontSize: 9, color: c, fontFamily: "monospace",
        letterSpacing: 1, background: `${c}15`, borderRadius: 4,
        padding: "2px 5px" }}>{label}</span>
      {detail && <span style={{ fontSize: 9, color: "#4a7aaa" }}>{detail}</span>}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function NOVAAStatusPanel() {
  const { user } = useAuth();
  const role = user?.role || "STUDENT";
  const palette = ROLE_COLOR[role] || ROLE_COLOR.STUDENT;
  const C = palette.main;
  const G = palette.glow;

  const [open,      setOpen]      = useState(false);
  const [minimized, setMinimized] = useState(false);

  // service health
  const [svcBackend, setSvcBackend] = useState({ ok: false, pending: true, ms: null });
  const [svcAI,      setSvcAI]      = useState({ ok: false, pending: true });
  const [svcDB,      setSvcDB]      = useState({ ok: false, pending: true });

  // metrics
  const [stats,    setStats]    = useState(null);
  const [summary,  setSummary]  = useState(null);
  const [sessions, setSessions] = useState(null); // active seances
  const [danger,   setDanger]   = useState(null); // danger count (admin/teacher)
  const [faceReqs, setFaceReqs] = useState(null); // pending face (admin)
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);

  const timerRef = useRef(null);

  // ── fetch all data ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setRefreshing(true);

    // 1. Backend ping (any fast endpoint)
    const t0 = Date.now();
    try {
      await axiosClient.get("me/");
      const ms = Date.now() - t0;
      setSvcBackend({ ok: true, pending: false, ms });
      setSvcDB({ ok: true, pending: false });   // if Django responds, DB is up
    } catch {
      setSvcBackend({ ok: false, pending: false, ms: null });
      setSvcDB({ ok: false, pending: false });
    }

    // 2. Role stats
    try {
      const endpoint =
        role === "ADMIN"   ? "admin/stats/"   :
        role === "TEACHER" ? "teacher/stats/" : "student/stats/";
      const r = await axiosClient.get(endpoint);
      setStats(r.data);
    } catch { setStats(null); }

    // 3. Attendance summary
    try {
      const endpoint =
        role === "TEACHER" ? "teacher/attendance-summary/" :
        role === "STUDENT" ? "student/attendance-summary/" : null;
      if (endpoint) {
        const r = await axiosClient.get(endpoint);
        setSummary(r.data);
      }
    } catch { setSummary(null); }

    // 4. Active seances (teacher: their own; admin: platform-wide via hud stats)
    if (role === "TEACHER") {
      try {
        // Use me/courses then check active seances
        const r = await axiosClient.get("me/courses/");
        const courses = Array.isArray(r.data) ? r.data : (r.data.courses || []);
        // Count active sessions from the first course's seances list if available
        let activeCnt = 0;
        for (const c of courses.slice(0, 5)) {
          try {
            const s = await axiosClient.get(`teacher/courses/${c.id}/seances/`);
            const seances = Array.isArray(s.data) ? s.data : (s.data.seances || []);
            activeCnt += seances.filter(x => x.status === "ACTIVE").length;
          } catch { /* ignore */ }
        }
        setSessions(activeCnt);
      } catch { setSessions(null); }
    }

    // 5. Danger zone / face requests (admin)
    if (role === "ADMIN") {
      try {
        const r = await axiosClient.get("admin/face-requests/");
        const reqs = Array.isArray(r.data) ? r.data : (r.data.results || []);
        setFaceReqs(reqs.filter(x => x.status === "PENDING").length);
      } catch { setFaceReqs(null); }
    }

    // 6. AI health — try a minimal ask (no question → returns 400 which means backend is up)
    // We actually just check if the route exists; a 400 still means the service is alive.
    try {
      await axiosClient.post("ai/ask/", { question: "__ping__" });
      setSvcAI({ ok: true, pending: false });
    } catch (e) {
      // 400 = route exists, AI service alive (bad question)
      // 5xx = service down
      const status = e?.response?.status;
      setSvcAI({ ok: status && status < 500, pending: false });
    }

    setLastRefresh(new Date());
    setRefreshing(false);
  }, [role]);

  // auto-refresh every 30 s
  useEffect(() => {
    if (!open) return;
    fetchAll();
    timerRef.current = setInterval(fetchAll, 30_000);
    return () => clearInterval(timerRef.current);
  }, [open, fetchAll]);

  // ── derived values ──────────────────────────────────────────────────────────
  const attendanceRate =
    summary?.attendance_rate ??
    (summary?.present != null && summary?.total_records
      ? Math.round(summary.present / summary.total_records * 100)
      : null);

  const rateColor =
    attendanceRate == null ? C :
    attendanceRate >= 80   ? "#00ff82" :
    attendanceRate >= 60   ? "#f59e0b" : "#ef4444";

  const timeStr = lastRefresh
    ? lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating orb button ─────────────────────────────────────────────── */}
      {!open && (
        <button onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 9999,
            width: 52, height: 52, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${C}44, ${C}18)`,
            border: `1.5px solid ${C}66`,
            boxShadow: `0 0 18px ${G}, 0 4px 16px rgba(0,0,0,.5)`,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", flexDirection: "column", gap: 3,
            transition: "all .2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 28px ${G}, 0 6px 24px rgba(0,0,0,.6)`; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 18px ${G}, 0 4px 16px rgba(0,0,0,.5)`; }}
        >
          <Icon d={ICONS.pulse} size={20} color={C} />
          {/* pulsing ring */}
          <span style={{
            position: "absolute", inset: -4, borderRadius: "50%",
            border: `1px solid ${C}44`,
            animation: "novaa-ping 2s ease-in-out infinite",
          }} />
        </button>
      )}

      {/* ── Panel ───────────────────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 320,
          background: "rgba(4,10,24,.97)",
          border: `1px solid ${C}33`,
          borderRadius: 14,
          boxShadow: `0 0 40px ${G}, 0 8px 48px rgba(0,0,0,.7)`,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          color: "#cce8ff",
          display: "flex", flexDirection: "column",
          maxHeight: minimized ? "auto" : 520,
          transition: "max-height .25s ease",
          overflow: "hidden",
        }}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 12px",
            borderBottom: minimized ? "none" : `1px solid ${C}1a`,
            flexShrink: 0,
          }}>
            {/* logo / status dot */}
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: `radial-gradient(circle at 35% 35%, ${C}44, ${C}18)`,
              border: `1px solid ${C}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon d={ICONS.pulse} size={14} color={C} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C,
                  fontFamily: "monospace", letterSpacing: 2 }}>N.O.V.A.A</span>
                <span style={{ fontSize: 8, color: `${C}77`, fontFamily: "monospace",
                  letterSpacing: 1, background: `${C}15`, borderRadius: 4,
                  padding: "1px 5px" }}>STATUS</span>
              </div>
              <div style={{ fontSize: 9, color: "#4a7aaa", fontFamily: "monospace",
                letterSpacing: 1 }}>
                {palette.label} · {timeStr}
              </div>
            </div>

            {/* Refresh */}
            <button onClick={fetchAll} disabled={refreshing}
              style={{ background: "none", border: "none", cursor: "pointer",
                color: refreshing ? `${C}44` : `${C}99`, padding: 4, borderRadius: 6,
                transition: "color .2s",
              }}>
              <span style={{ display: "inline-block",
                animation: refreshing ? "novaa-ring-cw .8s linear infinite" : "none" }}>
                <Icon d={ICONS.refresh} size={13} color="currentColor" />
              </span>
            </button>

            {/* Minimise */}
            <button onClick={() => setMinimized(v => !v)}
              style={{ background: "none", border: "none", cursor: "pointer",
                color: `${C}77`, padding: 4, borderRadius: 6 }}>
              <span style={{ display: "inline-block",
                transform: minimized ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                <Icon d={ICONS.chevron} size={13} color="currentColor" />
              </span>
            </button>

            {/* Close */}
            <button onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer",
                color: `${C}77`, padding: 4, borderRadius: 6 }}>
              <Icon d={ICONS.close} size={13} color="currentColor" />
            </button>
          </div>

          {/* ── Body ─────────────────────────────────────────────────────────── */}
          {!minimized && (
            <div style={{ overflowY: "auto", padding: "10px 12px",
              display: "flex", flexDirection: "column", gap: 10 }}>

              {/* ── Services ───────────────────────────────────────────────── */}
              <div>
                <div style={{ fontSize: 8, color: `${C}66`, fontFamily: "monospace",
                  letterSpacing: 3, marginBottom: 4 }}>— SERVICES —</div>
                <div style={{ background: "rgba(0,18,40,.5)", border: `1px solid ${C}15`,
                  borderRadius: 8, padding: "6px 10px" }}>
                  <ServiceRow
                    name="Django Backend"
                    ok={svcBackend.ok}
                    pending={svcBackend.pending}
                    detail={svcBackend.ms ? `${svcBackend.ms}ms` : null}
                  />
                  <ServiceRow
                    name="Database"
                    ok={svcDB.ok}
                    pending={svcDB.pending}
                  />
                  <ServiceRow
                    name="NOVAA AI (Groq)"
                    ok={svcAI.ok}
                    pending={svcAI.pending}
                  />
                </div>
              </div>

              {/* ── Platform metrics ───────────────────────────────────────── */}
              {stats && (
                <div>
                  <div style={{ fontSize: 8, color: `${C}66`, fontFamily: "monospace",
                    letterSpacing: 3, marginBottom: 6 }}>— PLATFORM —</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>

                    {role === "ADMIN" && <>
                      <Pill label="Students"  value={stats.students}    icon="users"   color={C} />
                      <Pill label="Teachers"  value={stats.teachers}    icon="users"   color={C} />
                      <Pill label="Courses"   value={stats.courses}     icon="courses" color={C} />
                      <Pill label="Materials" value={stats.materials}   icon="courses" color={C} />
                    </>}

                    {role === "TEACHER" && <>
                      <Pill label="My Courses"   value={stats.courses}            icon="courses" color={C} />
                      <Pill label="My Students"  value={stats.students}           icon="users"   color={C} />
                      <Pill label="Materials"    value={stats.materials}          icon="courses" color={C} />
                      <Pill label="Att. Records" value={stats.attendance_records} icon="rate"    color={C} />
                    </>}

                    {role === "STUDENT" && <>
                      <Pill label="Courses"    value={stats.courses}            icon="courses" color={C} />
                      <Pill label="Absences"   value={stats.absences}           icon="absent"  color={stats.absences > 2 ? "#ef4444" : C}
                        sub={stats.absences > 2 ? "⚠ at risk" : "within limit"} />
                      <Pill label="Records"    value={stats.attendance_records} icon="rate"    color={C} />
                      <Pill label="AI Sessions" value={stats.chat_sessions}     icon="ai"      color={C} />
                    </>}

                  </div>
                </div>
              )}

              {/* ── Attendance rate ─────────────────────────────────────────── */}
              {summary?.attendance_rate != null && (
                <div style={{ background: "rgba(0,18,40,.5)",
                  border: `1px solid ${rateColor}22`, borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 8, color: `${rateColor}88`, fontFamily: "monospace",
                    letterSpacing: 3, marginBottom: 5 }}>— ATTENDANCE RATE —</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 6, background: "rgba(255,255,255,.06)",
                        borderRadius: 99, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 99,
                          width: `${Math.min(summary.attendance_rate, 100)}%`,
                          background: `linear-gradient(90deg, ${rateColor}88, ${rateColor})`,
                          transition: "width .6s ease",
                        }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: rateColor,
                      fontFamily: "monospace", minWidth: 46, textAlign: "right" }}>
                      {summary.attendance_rate}%
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 5 }}>
                    {[
                      { label: "present", value: summary.present,  color: "#00ff82" },
                      { label: "absent",  value: summary.absent,   color: "#ef4444" },
                      { label: "late",    value: summary.late,     color: "#f59e0b" },
                    ].map(x => x.value != null && (
                      <span key={x.label} style={{ fontSize: 9, color: x.color,
                        fontFamily: "monospace" }}>
                        {x.value} {x.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Active sessions (teacher) ──────────────────────────────── */}
              {role === "TEACHER" && sessions != null && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: sessions > 0 ? "rgba(0,255,130,.06)" : "rgba(0,18,40,.5)",
                  border: `1px solid ${sessions > 0 ? "#00ff8244" : C + "15"}`,
                  borderRadius: 8, padding: "8px 10px",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: sessions > 0 ? "rgba(0,255,130,.15)" : `${C}18`,
                    border: `1px solid ${sessions > 0 ? "#00ff8244" : C + "33"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon d={ICONS.session} size={13}
                      color={sessions > 0 ? "#00ff82" : C} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#4a7aaa", fontFamily: "monospace",
                      letterSpacing: 1, textTransform: "uppercase" }}>Active Sessions</div>
                    <div style={{ fontSize: 16, fontWeight: 700,
                      color: sessions > 0 ? "#00ff82" : "#cce8ff" }}>
                      {sessions}
                      {sessions > 0 && <span style={{ fontSize: 9, color: "#00ff8277",
                        fontFamily: "monospace", marginLeft: 6 }}>● LIVE</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Alerts (admin) ─────────────────────────────────────────── */}
              {role === "ADMIN" && (faceReqs != null) && faceReqs > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(245,158,11,.07)",
                  border: "1px solid rgba(245,158,11,.25)",
                  borderRadius: 8, padding: "8px 10px",
                }}>
                  <Icon d={ICONS.face} size={16} color="#f59e0b" />
                  <span style={{ fontSize: 11, color: "#f59e0b" }}>
                    <strong>{faceReqs}</strong> face registration request{faceReqs !== 1 ? "s" : ""} pending review
                  </span>
                </div>
              )}

              {/* ── Footer ─────────────────────────────────────────────────── */}
              <div style={{ display: "flex", justifyContent: "center",
                paddingTop: 2, paddingBottom: 2 }}>
                <span style={{ fontSize: 8, color: `${C}33`, fontFamily: "monospace",
                  letterSpacing: 2 }}>
                  AUTO-REFRESH · 30s · CAMPUSEYE
                </span>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ── keyframes ─────────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes novaa-ping {
          0%, 100% { opacity: .5; transform: scale(1); }
          50%       { opacity: 0; transform: scale(1.35); }
        }
        @keyframes novaa-ring-cw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
