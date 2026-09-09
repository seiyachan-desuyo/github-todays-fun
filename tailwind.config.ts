import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#19152B",
        paper: "#F8F7FF",
        accent: "#7C4DFF",
        "accent-soft": "#EEE8FF",
        brand: {
          start: "#9D74FF",
          end: "#703EFF",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "Geist", "sans-serif"],
        serif: ["var(--font-serif)", "Songti SC", "STSong", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
