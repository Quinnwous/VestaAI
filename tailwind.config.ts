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
      // Zelfde truc als bij fontFamily: de vormtaal van het kantoor (zacht-rond of
      // strak-hoekig, zie lib/branding.ts § VORM_OPTIES) stuurt élke rounded-class in
      // de ingelogde omgeving. Buiten die omgeving zijn de variabelen niet gezet en
      // gelden de Tailwind-standaarden hieronder.
      borderRadius: {
        md: 'var(--merk-radius-sm, 0.375rem)',
        lg: 'var(--merk-radius-md, 0.5rem)',
        xl: 'var(--merk-radius-lg, 0.75rem)',
        '2xl': 'var(--merk-radius-card, 1rem)',
        '3xl': 'var(--merk-radius-card-xl, 1.5rem)',
        full: 'var(--merk-radius-pill, 9999px)',
      },
      fontFamily: {
        // Merk-bewust met terugval op VestaAI's eigen fonts: een kantoor met eigen
        // lettertype (lib/branding.ts § brandingCssVars) zet --merk-font-body/-heading,
        // landing/auth/admin (geen --merk* gezet) vallen terug op Jakarta/Newsreader.
        sans: ["var(--merk-font-body, var(--font-jakarta))", "system-ui", "sans-serif"],
        serif: ["var(--merk-font-heading, var(--font-newsreader))", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
