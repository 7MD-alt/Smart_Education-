import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ArrowRight, AlertCircle } from "lucide-react";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

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
    <div
      className="flex min-h-screen"
      style={{ background: "var(--bg)" }}
    >
      {/* ── Left panel — branding ─────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between p-10"
        style={{ borderRight: "1px solid var(--border)" }}
      >
        {/* Top — logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-violet-400"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            CE
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
            CampusEye
          </span>
        </div>

        {/* Middle — tagline */}
        <div>
          <p className="label mb-4">AI-Powered Academic Platform</p>
          <h1
            className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl"
            style={{ color: "var(--text-1)" }}
          >
            Your campus,<br />
            <span style={{ color: "var(--text-2)" }}>intelligently managed.</span>
          </h1>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
            Face recognition attendance, AI tutoring, and academic oversight —
            built for every role in your institution.
          </p>

          {/* Feature bullets */}
          <div className="mt-8 space-y-3">
            {[
              { dot: "bg-violet-400", text: "AI Tutor with 9 specialist agents" },
              { dot: "bg-cyan-400",   text: "Face-scan attendance in seconds" },
              { dot: "bg-pink-400",   text: "Admin control over the full structure" },
            ].map(({ dot, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-2)" }}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — footer note */}
        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          PFE Project · EST · 2026
        </p>
      </div>

      {/* ── Right panel — form ────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">

        {/* Back link (mobile / top) */}
        <div className="mb-8 self-start lg:hidden">
          <Link
            to="/"
            className="text-sm transition-colors"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
          >
            ← Back to home
          </Link>
        </div>

        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-violet-400"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              CE
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>CampusEye</span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
            Sign in
          </h2>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-2)" }}>
            Enter your credentials to access your dashboard.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
              <input
                id="password"
                type="password"
                className="input"
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-[var(--radius)] p-3 text-sm"
                style={{
                  background: "rgba(185,28,28,0.1)",
                  border: "1px solid rgba(185,28,28,0.25)",
                  color: "var(--red-fg)",
                }}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm font-semibold mt-2"
              style={{ borderRadius: "var(--radius)" }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>

          {/* Role hint */}
          <div
            className="mt-6 rounded-[var(--radius)] p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="label mb-3">Demo accounts</p>
            <div className="space-y-2 text-xs" style={{ color: "var(--text-2)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                  <span>Admin</span>
                </div>
                <code className="text-[11px]" style={{ color: "var(--text-3)" }}>admin / admin</code>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>Teacher</span>
                </div>
                <code className="text-[11px]" style={{ color: "var(--text-3)" }}>username / Teacher@2026</code>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  <span>Student</span>
                </div>
                <code className="text-[11px]" style={{ color: "var(--text-3)" }}>IATE-S4-001 / IATE-S4-001</code>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;