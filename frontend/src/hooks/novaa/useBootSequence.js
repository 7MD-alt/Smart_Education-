import { useState, useEffect } from "react";

const BOOT_LINES = [
  "NOVAA v2.0 — NEURAL OPERATIONAL VIRTUAL ACADEMIC ASSISTANT",
  "Connecting to CampusEye core...",
  "Tool layer: ONLINE | RAG: READY | Agents: 17 LOADED",
  "System ready. Welcome back.",
];

/**
 * Drives the startup text animation shown in the header before the HUD is "booted".
 * Returns the current boot line and a boolean for when the sequence completes.
 */
export function useBootSequence() {
  const [bootText, setBootText] = useState("");
  const [booted,   setBooted]   = useState(false);

  useEffect(() => {
    let i = 0;
    const tick = () => {
      if (i < BOOT_LINES.length) {
        setBootText(BOOT_LINES[i]);
        i++;
        setTimeout(tick, 420);
      } else {
        setTimeout(() => setBooted(true), 200);
      }
    };
    tick();
  }, []);

  return { bootText, booted };
}
