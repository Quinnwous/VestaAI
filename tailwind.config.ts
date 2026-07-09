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
        // Brand primary: forest green vervangt overal het blauwe palet.
        // (Legacy remap — out-of-scope pages leunen hierop; niet verwijderen.)
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
        // Dashboard-redesign tokens (semantisch, één bron). Zie ook components/ui/tokens.ts.
        forest: {
          "50":  "#F1F7F3",
          "100": "#EAF5EE",
          "200": "#D5E8DD",
          "300": "#C7E6D5",
          "400": "#2A8A5C",
          "500": "#1A6B45",
          "600": "#145536",
          "700": "#114230",
          "800": "#0E3B27",
          "900": "#0E1A13",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        serif: ["var(--font-newsreader)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
