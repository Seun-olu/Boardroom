import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        base: "#0A0A0B",
        surface: "#141416",
        elevated: "#1C1C1F",
        subtle: "#2A2A2E",
        muted: "#71717A",
        accent: "#6366F1",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(99, 102, 241, 0.4), 0 8px 32px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
