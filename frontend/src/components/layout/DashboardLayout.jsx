import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import AIChatWidget from "../AIChatWidget";

/* Grain noise texture via SVG */
const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='1'/%3E%3C/svg%3E")`;

const DashboardLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [entered,    setEntered]    = useState(false);
  const location = useLocation();

  useEffect(() => {
    setEntered(false);
    const t = setTimeout(() => setEntered(true), 16);
    return () => clearTimeout(t);
  }, [location.pathname]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  /* Spotlight — rAF-throttled so we never block the main thread */
  useEffect(() => {
    let rafId = null;
    const handler = (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        document.querySelectorAll(".spotlight").forEach((el) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width)  * 100}%`);
          el.style.setProperty("--my", `${((e.clientY - r.top)  / r.height) * 100}%`);
        });
        rafId = null;
      });
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handler);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* ═══════════════════════════════════════════════════
          ATMOSPHERIC BACKGROUND — vivid aurora gradients
      ═══════════════════════════════════════════════════ */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">

        {/* Orb 1 — dominant violet, top-left */}
        <div
          className="animate-orb-1 absolute rounded-full"
          style={{
            width: 1000, height: 1000,
            top: "-25%", left: "-20%",
            background: "radial-gradient(circle at 40% 40%, rgba(124,58,237,0.45) 0%, rgba(124,58,237,0.15) 45%, transparent 70%)",
            filter: "blur(60px)",
            willChange: "transform",
          }}
        />

        {/* Orb 2 — cyan, bottom-right */}
        <div
          className="animate-orb-2 absolute rounded-full"
          style={{
            width: 800, height: 800,
            bottom: "-20%", right: "-15%",
            background: "radial-gradient(circle at 60% 60%, rgba(8,145,178,0.38) 0%, rgba(8,145,178,0.12) 45%, transparent 70%)",
            filter: "blur(60px)",
            willChange: "transform",
          }}
        />

        {/* Orb 3 — pink accent, center */}
        <div
          className="animate-orb-3 absolute rounded-full"
          style={{
            width: 500, height: 500,
            top: "30%", right: "25%",
            background: "radial-gradient(circle, rgba(190,24,93,0.22) 0%, transparent 65%)",
            filter: "blur(70px)",
            willChange: "transform",
          }}
        />

        {/* Fine dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(139,92,246,0.18) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 85% 85% at 50% 50%, black 20%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 85% 85% at 50% 50%, black 20%, transparent 100%)",
          }}
        />

        {/* Grain overlay */}
        <div
          className="animate-grain absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: GRAIN,
            backgroundRepeat: "repeat",
            backgroundSize: "200px 200px",
          }}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(3,3,18,0.55) 100%)",
          }}
        />
      </div>

      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setMobileOpen(true)} />

        <main
          className="relative flex-1 overflow-y-auto p-5 md:p-6 lg:p-8"
          style={{
            transition: "opacity 320ms cubic-bezier(0.16,1,0.3,1), transform 320ms cubic-bezier(0.16,1,0.3,1)",
            opacity:   entered ? 1 : 0,
            transform: entered ? "translateY(0) scale(1)" : "translateY(14px) scale(0.997)",
            willChange: "opacity, transform",
          }}
        >
          <div className="mx-auto max-w-screen-xl">
            {children}
          </div>
        </main>
      </div>

      <AIChatWidget />
    </div>
  );
};

export default DashboardLayout;
