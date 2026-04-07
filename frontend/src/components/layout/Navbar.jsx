import { ArrowUpRight, Menu, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Navbar = ({ variant = "dashboard" }) => {
  const { user } = useAuth();

  if (variant === "landing") {
    return (
      <header className="sticky top-0 z-50 px-4 pt-4 md:px-6 md:pt-5">
        <div className="mx-auto max-w-[1520px]">
          <div className="flex items-center justify-between rounded-[28px] border border-white/10 bg-black/55 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:px-5">
            <a href="#hero" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-white shadow-inner shadow-white/5">
                SE
              </div>

              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-[0.01em] text-white">
                  Smart Education
                </p>
                <p className="text-xs text-white/45">
                  AI-Powered Academic Platform
                </p>
              </div>
            </a>

            <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2 py-2 md:flex">
              {[
                { label: "Home", href: "#hero" },
                { label: "Platform", href: "#features" },
                { label: "Roles", href: "#roles" },
                { label: "Preview", href: "#preview" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-full px-4 py-2 text-sm text-white/62 transition duration-300 hover:bg-white/[0.06] hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <a
                href="/login"
                className="hidden rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/72 transition duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white md:inline-flex"
              >
                Login
              </a>

              <a
                href="#preview"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition duration-300 hover:bg-white/90 md:px-5"
              >
                Request Demo
                <ArrowUpRight className="h-4 w-4" />
              </a>

              <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/75 transition duration-300 hover:bg-white/[0.06] md:hidden">
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a] px-6 py-4 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Welcome{user ? `, ${user.first_name || user.username}` : ""}
          </h3>
          <p className="text-sm uppercase tracking-[0.18em] text-white/42">
            {user?.role || "Dashboard"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition duration-300 hover:bg-white/[0.08]">
            <Bell className="h-4 w-4" />
          </button>

          <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 md:block">
            Academic workspace
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;