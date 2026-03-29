import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        globe: {
          bg: "#030712",
          panel: "#0f172a",
          card: "#1e293b",
          border: "#1e293b",
        },
        accent: {
          teal: "#14b8a6",
          amber: "#f59e0b",
          red: "#ef4444",
          gray: "#64748b",
        },
        wwn: {
          bg: "#10141a",
          "surface-lowest": "#0a0e14",
          "surface-low": "#181c22",
          "surface-high": "#262a31",
          primary: "#00e5ff",
          "primary-soft": "#c3f5ff",
          "on-surface": "#dfe2eb",
          "text-variant": "#bac9cc",
        },
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "system-ui", "sans-serif"],
        serif: ["Newsreader", "Georgia", "serif"],
        body: ["Manrope", "Inter", "sans-serif"],
        data: ["Space Grotesk", "monospace"],
      },
      transitionDuration: {
        "400": "400ms",
      },
    },
  },
  plugins: [],
};

export default config;
