import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#000000",
        surface: {
          DEFAULT: "#080A0D",
          raised: "#0E1117",
          glass: "rgba(14, 17, 23, 0.65)",
          card: "rgba(16, 20, 28, 0.8)",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.07)",
          strong: "rgba(255, 255, 255, 0.14)",
          glow: "rgba(59, 130, 246, 0.4)",
        },
        bull: {
          DEFAULT: "#00FFA3",
          dim: "#003D26",
          muted: "#10B981",
          glow: "rgba(0, 255, 163, 0.4)",
        },
        bear: {
          DEFAULT: "#FF4466",
          dim: "#4A0018",
          muted: "#EF4444",
          glow: "rgba(255, 68, 102, 0.4)",
        },
        data: {
          DEFAULT: "#4D9FFF",
          dim: "#0D2A5C",
          muted: "#3B82F6",
          glow: "rgba(77, 159, 255, 0.4)",
        },
        gold: {
          DEFAULT: "#FFD700",
          dim: "#3D3000",
          glow: "rgba(255, 215, 0, 0.4)",
        },
        violet: {
          DEFAULT: "#A855F7",
          dim: "#2D0A5E",
          glow: "rgba(168, 85, 247, 0.4)",
        },
        cyan: {
          DEFAULT: "#00D4FF",
          dim: "#003340",
          glow: "rgba(0, 212, 255, 0.4)",
        },
        plasma: {
          DEFAULT: "#FF6B35",
          dim: "#3D1800",
          glow: "rgba(255, 107, 53, 0.4)",
        },
        ink: {
          DEFAULT: "#E8EBF0",
          muted: "#7A8299",
          faint: "#3D4255",
        },
      },
      fontFamily: {
        sans: ["Inter", "var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "glow-bull":  "0 0 60px -10px rgba(0,255,163,0.5), 0 0 120px -20px rgba(0,255,163,0.2)",
        "glow-bear":  "0 0 60px -10px rgba(255,68,102,0.5), 0 0 120px -20px rgba(255,68,102,0.2)",
        "glow-data":  "0 0 60px -10px rgba(77,159,255,0.5), 0 0 120px -20px rgba(77,159,255,0.2)",
        "glow-gold":  "0 0 40px -8px rgba(255,215,0,0.5)",
        "glow-violet":"0 0 40px -8px rgba(168,85,247,0.5)",
        "neon-bull":  "0 0 8px rgba(0,255,163,0.8), 0 0 20px rgba(0,255,163,0.4), 0 0 40px rgba(0,255,163,0.15)",
        "neon-bear":  "0 0 8px rgba(255,68,102,0.8), 0 0 20px rgba(255,68,102,0.4), 0 0 40px rgba(255,68,102,0.15)",
        "neon-data":  "0 0 8px rgba(77,159,255,0.8), 0 0 20px rgba(77,159,255,0.4), 0 0 40px rgba(77,159,255,0.15)",
        "holo":       "0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)",
        "deep":       "0 25px 80px rgba(0,0,0,0.9)",
        "glass":      "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backdropBlur: {
        xs: "2px",
        "2xl": "48px",
      },
      keyframes: {
        // existing
        scanline: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%":      { opacity: "1" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        // new
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%":      { transform: "translateY(-8px) rotate(1deg)" },
          "66%":      { transform: "translateY(4px) rotate(-1deg)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "neon-pulse": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%":      { opacity: "0.7", filter: "brightness(1.4)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        "aurora": {
          "0%, 100%": { transform: "rotate(0deg) scale(1)", opacity: "0.4" },
          "25%":      { transform: "rotate(90deg) scale(1.1)", opacity: "0.6" },
          "50%":      { transform: "rotate(180deg) scale(0.95)", opacity: "0.5" },
          "75%":      { transform: "rotate(270deg) scale(1.05)", opacity: "0.7" },
        },
        "ticker-slide": {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "laser-scan": {
          "0%":   { left: "-100%", opacity: "0" },
          "10%":  { opacity: "1" },
          "90%":  { opacity: "1" },
          "100%": { left: "100%", opacity: "0" },
        },
        "glitch": {
          "0%, 100%":  { transform: "translate(0)" },
          "20%":       { transform: "translate(-2px, 2px)" },
          "40%":       { transform: "translate(2px, -2px)" },
          "60%":       { transform: "translate(-2px, -2px)" },
          "80%":       { transform: "translate(2px, 2px)" },
        },
        "draw-line": {
          "0%":   { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        "count-up": {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-right": {
          "0%":   { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "explosion": {
          "0%":   { transform: "scale(0)", opacity: "1" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        "orbit": {
          "0%":   { transform: "rotate(0deg) translateX(40px) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(40px) rotate(-360deg)" },
        },
      },
      animation: {
        scanline:        "scanline 2.2s ease-in-out infinite",
        "pulse-glow":    "pulse-glow 2.4s ease-in-out infinite",
        "fade-up":       "fade-up 0.4s ease-out forwards",
        blink:           "blink 1s step-start infinite",
        float:           "float 6s ease-in-out infinite",
        shimmer:         "shimmer 3s linear infinite",
        "neon-pulse":    "neon-pulse 2s ease-in-out infinite",
        "gradient-shift":"gradient-shift 4s ease infinite",
        aurora:          "aurora 20s ease infinite",
        "ticker-slide":  "ticker-slide 30s linear infinite",
        "laser-scan":    "laser-scan 1.8s ease-in-out infinite",
        glitch:          "glitch 0.4s ease-in-out",
        "draw-line":     "draw-line 1.5s ease-out forwards",
        "count-up":      "count-up 0.5s ease-out forwards",
        "slide-right":   "slide-right 0.4s ease-out forwards",
        explosion:       "explosion 0.8s ease-out forwards",
        orbit:           "orbit 8s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
