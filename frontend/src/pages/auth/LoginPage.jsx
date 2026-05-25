import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ArrowRight, ArrowLeft, AlertCircle, Sparkles, ScanLine, ShieldCheck, Eye, EyeOff } from "lucide-react";

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
    setLoading(true);
    setError("");
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      if (result.role === "ADMIN")   navigate("/admin");
      if (result.role === "TEACHER") navigate("/teacher");
      if (result.role === "STUDENT") navigate("/student");
    } else {
      setError(result.message || "Invalid username or password.");
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>

      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full"
             style={{ background: "radial-gradient(circle, rgba(124,58,237,0.1), transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-32 h-[600px] w-[600px] rounded-full"
             style={{ background: "radial-gradient(circle, rgba(8,145,178,0.07), transparent 70%)" }} />
        <div className="absolute inset-0"
             style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>

      {/* ── Left panel — branding ─────────────────────────────── */}
      <div
        className="relative hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between overflow-hidden p-10"
        style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0"
             style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, transparent 60%, rgba(8,145,178,0.05) 100%)" }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
             style={{ background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent)" }} />

        {/* Top — logo + back button */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(8,145,178,0.3))",
                border: "1px solid rgba(124,58,237,0.4)",
                boxShadow: "0 0 16px rgba(124,58,237,0.25)",
                color: "#a78bfa",
              }}
            >
              CE
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
              Campus<span style={{ color: "#a78bfa" }}>Eye</span>
            </span>
          </div>

          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-1.5 text-xs font-medium transition-all duration-150"
            style={{ color: "var(--text-3)", border: "1px solid var(--border)", background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "var(--border-hover)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <ArrowLeft className="h-3 w-3" /> Back to home
          </Link>
        </div>

        {/* Middle — tagline */}
        <div className="relative">
          <p className="label mb-4" style={{ color: "var(--text-3)" }}>AI-Powered Academic Platform</p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl" style={{ color: "var(--text-1)" }}>
            Your campus,<br />
            <span style={{
              background: "linear-gradient(135deg, #a78bfa, #22d3ee)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>intelligently managed.</span>
          </h1>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
            Face recognition attendance, AI tutoring, and academic oversight —
            built for every role in your institution.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: Sparkles,  dot: "rgba(124,58,237,0.2)", accent: "#a78bfa", text: "AI Tutor with 9 specialist agents" },
              { icon: ScanLine,  dot: "rgba(8,145,178,0.2)",  accent: "#22d3ee", text: "Face-scan attendance in seconds"   },
              { icon: ShieldCheck,dot:"rgba(190,24,93,0.2)",  accent: "#f472b6", text: "Admin control over full structure"  },
            ].map(({ icon: Icon, dot, accent, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-2)" }}>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                     style={{ background: dot, border: `1px solid ${accent}30` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p className="relative text-xs" style={{ color: "var(--text-3)" }}>
          PFE Project · EST · 2026
        </p>
      </div>

      {/* ── Right panel — form ─────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12">

        {/* Mobile header with logo + back button */}
        <div className="mb-8 w-full max-w-sm lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold"
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
              >
                CE
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
                Campus<span style={{ color: "#a78bfa" }}>Eye</span>
              </span>
            </div>
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-1.5 text-xs font-medium transition-all duration-150"
              style={{ color: "var(--text-3)", border: "1px solid var(--border)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text-1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "transparent"; }}
            >
              <ArrowLeft className="h-3 w-3" /> Home
            </Link>
          </div>
        </div>

        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
              Sign in
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-2)" }}>
              Enter your credentials to access your dashboard.
            </p>
          </div>

          {/* Form card */}
          <div
            className="rounded-[var(--radius-xl)] p-6"
            style={{
              background: "var(--surface)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)",
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="label" htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  className="input"
                  placeholder="e.g. a.charifialaoui"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="label" htmlFor="password">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    className="input pr-10"
                    placeholder="Your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "var(--text-3)" }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-[var(--radius)] p-3 text-sm"
                  style={{ background: "rgba(185,28,28,0.1)", border: "1px solid rgba(185,28,28,0.3)", color: "var(--red-fg)" }}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-[var(--radius)] py-2.5 text-sm font-bold transition-all duration-200 disabled:opacity-50"
                style={{
                  background: loading ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg, #7c3aed, #0891b2)",
                  color: "white",
                  border: "none",
                  boxShadow: loading ? "none" : "0 0 24px rgba(124,58,237,0.35), 0 2px 8px rgba(0,0,0,0.3)",
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = "0 0 40px rgba(124,58,237,0.5), 0 2px 12px rgba(0,0,0,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 24px rgba(124,58,237,0.35), 0 2px 8px rgba(0,0,0,0.3)"; e.currentTarget.style.transform = "none"; }}
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
          <div
            className="mt-4 rounded-[var(--radius-lg)] p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="label mb-3">Demo accounts</p>
            <div className="space-y-2 text-xs" style={{ color: "var(--text-2)" }}>
              {[
                { role: "Admin",   dot: "#f472b6", cred: "admin / admin" },
                { role: "Teacher", dot: "#22d3ee", cred: "username / Teacher@2026" },
                { role: "Student", dot: "#a78bfa", cred: "IATE-S4-001 / IATE-S4-001" },
              ].map(({ role, dot, cred }) => (
                <div key={role} className="flex items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 transition-colors duration-150"
                     style={{ borderRadius: "var(--radius-sm)" }}
                     onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                     onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot, boxShadow: `0 0 6px ${dot}` }} />
                    <span style={{ color: "var(--text-2)" }}>{role}</span>
                  </div>
                  <code className="text-[10px]" style={{ color: "var(--text-3)" }}>{cred}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Back to home — bottom link (always visible on mobile, hidden on desktop since it's in the left panel) */}
          <div className="mt-6 text-center lg:hidden">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs transition-colors duration-150"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
            >
              <ArrowLeft className="h-3 w-3" /> Back to home
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;