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
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "system-ui", "sans-serif"],
      },
      transitionDuration: {
        "400": "400ms",
      },
    },
  },
  plugins: [],
};

export default config;
