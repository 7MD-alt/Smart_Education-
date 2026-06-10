import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ArrowRight, ArrowLeft, AlertCircle, Sparkles, ScanLine, ShieldCheck, Eye, EyeOff, Zap } from "lucide-react";

const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='1'/%3E%3C/svg%3E")`;

const LoginPage = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPwd,  setShowPwd]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      if (result.role === "ADMIN")   navigate("/admin");
      if (result.role === "TEACHER") navigate("/teacher");
      if (result.role === "STUDENT") navigate("/student");
    } else {
      setError(result.message || "Invalid credentials.");
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>

      {/* ── BACKGROUND ──────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-depth" />
        <div className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.024) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.024) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "linear-gradient(to bottom, transparent, black 12%, black 78%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 12%, black 78%, transparent)",
          }} />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: GRAIN, backgroundSize: "200px 200px" }} />
      </div>

      {/* ── LEFT PANEL — branding ───────────────────────────────── */}
      <div
        className="relative hidden lg:flex lg:w-[46%] flex-col justify-between overflow-hidden p-12"
        style={{
          background: "rgba(4,4,16,0.5)",
          backdropFilter: "blur(8px)",
          borderRight: "1px solid rgba(139,92,246,0.15)",
        }}
      >
        {/* Top shimmer line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)" }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(8,145,178,0.3))",
              border: "1px solid rgba(139,92,246,0.5)",
              boxShadow: "0 0 24px rgba(124,58,237,0.4), 0 0 48px rgba(124,58,237,0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <Zap className="h-5 w-5" style={{ color: "#a78bfa", filter: "drop-shadow(0 0 6px #a78bfa)" }} />
          </div>
          <div>
            <div className="text-base font-bold" style={{ letterSpacing: "-0.025em", color: "#f0f0ff" }}>
              Campus<span style={{ color: "#a78bfa" }}>Eye</span>
            </div>
            <div className="text-[9px] font-semibold uppercase" style={{ letterSpacing: "0.12em", color: "rgba(139,92,246,0.5)" }}>
              Academic Platform
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative max-w-sm">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs font-semibold" style={{ color: "#a78bfa", letterSpacing: "0.04em" }}>
              AI-Powered · Smart Attendance
            </span>
          </div>

          <h1
            className="leading-[1.08]"
            style={{
              fontSize: "3rem", fontWeight: 750,
              letterSpacing: "-0.045em", color: "#f0f0ff",
            }}
          >
            Your campus,
            <br />
            <span style={{
              background: "linear-gradient(135deg, #a78bfa 0%, #67e8f9 60%, #22d3ee 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              intelligently
            </span>
            <br />
            managed.
          </h1>

          <p className="mt-6 text-[15px] leading-relaxed" style={{ color: "rgba(120,120,160,1)" }}>
            Face recognition attendance, AI tutoring with 17 specialist agents,
            and full academic oversight for every role.
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              { icon: Sparkles,    color: "#a78bfa", bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.25)", text: "NOVAA AI Tutor" },
              { icon: ScanLine,    color: "#22d3ee", bg: "rgba(8,145,178,0.12)",  border: "rgba(8,145,178,0.25)",  text: "Face Scan" },
              { icon: ShieldCheck, color: "#f472b6", bg: "rgba(190,24,93,0.12)",  border: "rgba(190,24,93,0.25)",  text: "Admin Control" },
            ].map(({ icon: Icon, color, bg, border, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color }} />
                <span className="text-xs font-semibold" style={{ color }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>PFE · EST · 2026</p>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ──────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12">

        {/* Mobile logo */}
        <div className="mb-8 flex w-full max-w-sm items-center justify-between lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(139,92,246,0.4)", boxShadow: "0 0 16px rgba(124,58,237,0.25)" }}>
              <Zap className="h-4 w-4" style={{ color: "#a78bfa" }} />
            </div>
            <span className="text-sm font-bold" style={{ color: "#f0f0ff" }}>Campus<span style={{ color: "#a78bfa" }}>Eye</span></span>
          </div>
          <Link to="/" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{ color: "var(--text-3)", border: "1px solid var(--border)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "transparent"; }}>
            <ArrowLeft className="h-3 w-3" /> Home
          </Link>
        </div>

        <div className="w-full max-w-sm">

          {/* Retour à l'accueil — desktop only (shown here for right panel) */}
          <div className="mb-6 hidden lg:flex items-center justify-between">
            <Link to="/" className="flex items-center gap-1.5 text-xs font-medium transition-all"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}>
              <ArrowLeft className="h-3 w-3" /> Retour à l'accueil
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2
              className="leading-none"
              style={{ fontSize: "1.85rem", fontWeight: 700, letterSpacing: "-0.04em", color: "#f0f0ff" }}
            >
              Bon retour
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>
              Connectez-vous à votre compte CampusEye
            </p>
          </div>

          {/* Form card */}
          <div
            className="relative rounded-[var(--radius-xl)] p-7"
            style={{
              background: "linear-gradient(180deg, rgba(18,25,42,0.94), rgba(10,15,27,0.9))",
              backdropFilter: "blur(18px) saturate(1.16)",
              WebkitBackdropFilter: "blur(18px) saturate(1.16)",
              border: "1px solid var(--border)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Top accent line */}
            <div className="absolute inset-x-7 top-0 h-px rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), rgba(34,211,238,0.4), transparent)" }} />

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="label" htmlFor="username">Username</label>
                <input
                  id="username" type="text" className="input"
                  placeholder="Entrez votre nom d'utilisateur"
                  value={username} onChange={e => setUsername(e.target.value)}
                  required autoComplete="username" autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="label" htmlFor="password">Password</label>
                <div className="relative">
                  <input
                    id="password" type={showPwd ? "text" : "password"}
                    className="input pr-10"
                    placeholder="Entrez votre mot de passe"
                    value={password} onChange={e => setPassword(e.target.value)}
                    required autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "var(--text-3)" }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}>
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-[var(--radius)] p-3 text-sm"
                  style={{ background: "rgba(185,28,28,0.1)", border: "1px solid rgba(185,28,28,0.3)", color: "#f87171" }}>
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="relative w-full overflow-hidden rounded-[var(--radius)] py-3 text-sm font-bold transition-all duration-200 disabled:opacity-50"
                style={{
                  background: loading ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0891b2 100%)",
                  color: "white", border: "none",
                  boxShadow: loading ? "none" : "0 0 30px rgba(124,58,237,0.4), 0 4px 16px rgba(0,0,0,0.4)",
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = "0 0 50px rgba(124,58,237,0.6), 0 4px 20px rgba(0,0,0,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 30px rgba(124,58,237,0.4), 0 4px 16px rgba(0,0,0,0.4)"; e.currentTarget.style.transform = "none"; }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign in <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Demo accounts */}
          <div className="mt-4 rounded-[var(--radius-lg)] p-4"
            style={{ background: "rgba(6,6,22,0.7)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="label mb-3">Quick access — demo accounts</p>
            <div className="space-y-2 text-xs" style={{ color: "var(--text-2)" }}>
              {[
                { role: "Admin",   color: "#f472b6", glow: "rgba(244,114,182,0.4)", cred: "admin / admin" },
                { role: "Teacher", color: "#22d3ee", glow: "rgba(34,211,238,0.4)",  cred: "username / Teacher@2026" },
                { role: "Student", color: "#a78bfa", glow: "rgba(167,139,250,0.4)", cred: "IATE-S4-001 / …" },
              ].map(({ role, color, glow, cred }) => (
                <div key={role}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] px-2.5 py-2 transition-all cursor-pointer"
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 6px ${glow}` }} />
                    <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{role}</span>
                  </div>
                  <code style={{ color: "var(--text-3)", fontSize: 10 }}>{cred}</code>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
