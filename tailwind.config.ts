import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 深色科技风主色板
        "ah-bg": {
          DEFAULT: "#f5f6fb",
          secondary: "#ffffff",
          tertiary: "#f8fafc",
          elevated: "#ffffff",
        },
        "ah-surface": {
          DEFAULT: "rgba(15,23,42,0.035)",
          hover: "rgba(15,23,42,0.055)",
          active: "rgba(124,58,237,0.08)",
        },
        "ah-border": {
          DEFAULT: "rgba(15,23,42,0.09)",
          subtle: "rgba(15,23,42,0.06)",
          accent: "rgba(124,58,237,0.2)",
        },
        "ah-accent": {
          purple: "#8b5cf6",
          "purple-light": "#a78bfa",
          "purple-dark": "#7c3aed",
          blue: "#3b82f6",
          "blue-light": "#60a5fa",
          cyan: "#06b6d4",
          emerald: "#10b981",
          rose: "#f43f5e",
          amber: "#f59e0b",
        },
        "ah-text": {
          primary: "#172033",
          secondary: "#475569",
          muted: "#64748b",
          disabled: "#94a3b8",
        },
      },
      backgroundColor: {
        glass: "rgba(255,255,255,0.03)",
      },
      borderColor: {
        glass: "rgba(255,255,255,0.06)",
      },
      backdropBlur: {
        glass: "20px",
        "glass-heavy": "40px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.4)",
        "glass-sm": "0 2px 8px rgba(0,0,0,0.3)",
        "glass-lg": "0 16px 48px rgba(0,0,0,0.5)",
        "glow-purple": "0 0 20px rgba(139,92,246,0.15)",
        "glow-blue": "0 0 20px rgba(59,130,246,0.15)",
        "glow-cyan": "0 0 20px rgba(6,182,212,0.15)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "status-breathe": "status-breathe 2s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "scan-line": "scan-line 4s linear infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "status-breathe": {
          "0%, 100%": { boxShadow: "0 0 4px rgba(139,92,246,0.2)" },
          "50%": { boxShadow: "0 0 12px rgba(139,92,246,0.5)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
