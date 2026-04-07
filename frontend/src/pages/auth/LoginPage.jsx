import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ColorBends from "@/components/ColorBends";
import { Lock, User, ArrowRight, Sparkles } from "lucide-react";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(username, password);

    setLoading(false);

    if (result.success) {
      if (result.role === "ADMIN") navigate("/admin");
      if (result.role === "TEACHER") navigate("/teacher");
      if (result.role === "STUDENT") navigate("/student");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <ColorBends />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1] bg-black/70" />

      <div className="pointer-events-none absolute inset-x-0 bottom-[-10%] z-[2] h-[55vh] rounded-[100%] bg-violet-500/25 blur-[120px]" />
      <div className="pointer-events-none absolute inset-x-[8%] bottom-[18%] z-[2] h-[2px] bg-gradient-to-r from-transparent via-violet-300/80 to-transparent blur-sm" />
      <div className="pointer-events-none absolute inset-x-[14%] bottom-[17%] z-[2] h-[22vh] rounded-[100%] bg-violet-400/10 blur-[70px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10 md:px-10">
        <div className="relative w-full max-w-[520px]">
          <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-violet-500/20 via-cyan-400/10 to-transparent blur-3xl" />

          <div className="relative rounded-[34px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl md:p-8">
            <div className="absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%)]" />

            <div className="relative z-10">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/15 bg-gradient-to-br from-white/95 via-cyan-200 to-violet-300 text-black shadow-[0_12px_40px_rgba(255,255,255,0.18)]">
                <Sparkles className="h-8 w-8" />
              </div>

              <div className="text-center">
                <Link
                  to="/"
                  className="text-xs uppercase tracking-[0.28em] text-white/38"
                >
                  Smart Education
                </Link>

                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                  Welcome back
                </h1>

                <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/58 md:text-base">
                  Sign in to access your academic workspace, AI tools, and personalized platform experience.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 transition duration-300 focus-within:border-white/20 focus-within:bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-white/35" />
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-transparent text-white placeholder:text-white/30 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 transition duration-300 focus-within:border-white/20 focus-within:bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-white/35" />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent text-white placeholder:text-white/30 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1 text-sm">
                  <label className="flex items-center gap-2 text-white/52">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/20 bg-transparent"
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    className="text-white/52 transition hover:text-white"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-white via-violet-100 to-violet-200 px-6 py-4 text-sm font-semibold text-black transition duration-300 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Signing in..." : "Login"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <div className="mt-7 text-center text-sm text-white/45">
                Don&apos;t have access?{" "}
                <button className="font-medium text-white transition hover:text-violet-300">
                  Contact your institution
                </button>
              </div>

              <div className="mt-7 rounded-[24px] border border-white/10 bg-black/30 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                  Secure access
                </p>
                <p className="mt-2 text-sm leading-7 text-white/55">
                  Your credentials are only used to authenticate access to your role-based academic dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;