import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: {
          50: "#F5F1EA",
          100: "#EDE8DF",
          200: "#E5DED3",
          300: "#D4C9B9",
          400: "#B8AFA3",
          500: "#9A9189",
          600: "#C97B5C",
          700: "#1F1F1F",
          800: "#1A1A1A",
          900: "#141414",
        },
        blush: {
          50: "#F5F1EA",
          100: "#EDE8DF",
          200: "#E5DED3",
          300: "#D4C9B9",
          400: "#C97B5C",
          500: "#8A9A83",
        },

        charcoal: {
          800: "#2D2D2D",
          900: "#1F1F1F",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-jost)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "0 2px 16px rgba(31,31,31,0.06)",
        "card-hover": "0 8px 32px rgba(31,31,31,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
