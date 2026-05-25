import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import AIChatWidget from "../AIChatWidget";

const DashboardLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [entered, setEntered]       = useState(false);
  const location = useLocation();

  useEffect(() => {
    setEntered(false);
    const t = setTimeout(() => setEntered(true), 20);
    return () => clearTimeout(t);
  }, [location.pathname]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* Subtle noise/grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,58,237,0.06), transparent),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(8,145,178,0.04), transparent),
            linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
          `,
          backgroundSize: "auto, auto, 32px 32px, 32px 32px",
        }}
      />

      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setMobileOpen(true)} />

        <main
          className={`relative flex-1 overflow-y-auto p-5 md:p-6 lg:p-8 transition-opacity duration-300 ${
            entered ? "opacity-100" : "opacity-0"
          }`}
          style={{ maxWidth: "100%" }}
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