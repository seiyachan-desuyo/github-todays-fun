import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#181816",
        paper: "#FAFAF8",
        accent: "#8A513F",
        "accent-soft": "#F0E8E3",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "Geist", "sans-serif"],
        serif: ["var(--font-serif)", "Songti SC", "STSong", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
