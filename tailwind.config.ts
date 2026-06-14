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
          50: "#FAF7F2",
          100: "#F0EAE0",
          200: "#E8DFD3",
          300: "#D9CCBC",
          400: "#C8A882",
          500: "#B08B62",
          600: "#8C6A48",
          700: "#6B4E32",
          800: "#4A3420",
          900: "#2C2016",
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
        card: "0 2px 16px rgba(44,32,22,0.06)",
        "card-hover": "0 8px 32px rgba(44,32,22,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
