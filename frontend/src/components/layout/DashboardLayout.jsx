import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import AIChatWidget from "../AIChatWidget";

const DashboardLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [entered, setEntered]       = useState(false);
  const location = useLocation();

  /* Page enter animation */
  useEffect(() => {
    setEntered(false);
    const t = setTimeout(() => setEntered(true), 20);
    return () => clearTimeout(t);
  }, [location.pathname]);

  /* Close mobile drawer on navigation */
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setMobileOpen(true)} />

        <main
          className={`flex-1 overflow-y-auto p-5 md:p-6 lg:p-8 transition-opacity duration-200 ${
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