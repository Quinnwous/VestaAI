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
        // Brand primary: forest green vervangt overal het blauwe palet
        blue: {
          "50":  "#EAF5EE",
          "100": "#D0EBD8",
          "200": "#A8D5BC",
          "300": "#7DC4A0",
          "400": "#4CAF80",
          "500": "#2A8A5C",
          "600": "#1A6B45",
          "700": "#145536",
          "800": "#0F4028",
          "900": "#0A2A1A",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
