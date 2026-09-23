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
          500: "#7A7168",
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
          500: "#4A6B52",
        },
        sage: {
          50: "#E8F0EA",
          100: "#D1E0D5",
          200: "#A8C4AF",
          300: "#7FA889",
          400: "#4A6B52",
          500: "#3D5A47",
          600: "#2F4838",
          700: "#1F3025",
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
