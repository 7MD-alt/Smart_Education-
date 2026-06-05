/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist Variable"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        "orb-drift-1": {
          "0%,100%": { transform: "translate(0px,0px) scale(1)" },
          "33%":      { transform: "translate(60px,-40px) scale(1.08)" },
          "66%":      { transform: "translate(-30px,50px) scale(0.95)" },
        },
        "orb-drift-2": {
          "0%,100%": { transform: "translate(0px,0px) scale(1)" },
          "40%":      { transform: "translate(-70px,30px) scale(1.05)" },
          "70%":      { transform: "translate(40px,-60px) scale(0.92)" },
        },
        "orb-drift-3": {
          "0%,100%": { transform: "translate(0px,0px) scale(1)" },
          "25%":      { transform: "translate(50px,50px) scale(1.1)" },
          "75%":      { transform: "translate(-60px,-30px) scale(0.96)" },
        },
        "grain": {
          "0%,100%": { transform: "translate(0,0)" },
          "10%":  { transform: "translate(-2%,-3%)" },
          "20%":  { transform: "translate(2%,2%)" },
          "30%":  { transform: "translate(-1%,3%)" },
          "40%":  { transform: "translate(3%,-1%)" },
          "50%":  { transform: "translate(-2%,1%)" },
          "60%":  { transform: "translate(1%,-2%)" },
          "70%":  { transform: "translate(-3%,2%)" },
          "80%":  { transform: "translate(2%,3%)" },
          "90%":  { transform: "translate(-1%,-1%)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          to:   { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer-fast": {
          "0%":   { backgroundPosition: "-400% 0" },
          "100%": { backgroundPosition: "400% 0" },
        },
      },
      animation: {
        "orb-1":    "orb-drift-1 24s ease-in-out infinite",
        "orb-2":    "orb-drift-2 30s ease-in-out infinite",
        "orb-3":    "orb-drift-3 20s ease-in-out infinite",
        "grain":    "grain 0.35s steps(1) infinite",
        "pop-in":   "pop-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
        "slide-up": "slide-up 0.3s cubic-bezier(0.16,1,0.3,1) both",
        "shimmer-fast": "shimmer-fast 2.2s linear infinite",
      },
    },
  },
  plugins: [],
}
