import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#FFAE00",
          dark: "#CC8B00",
          light: "#FFC64D",
        },
        background: "#ffffff",
        foreground: "#111111",
        muted: {
          DEFAULT: "#737373",
          light: "#a3a3a3",
        },
        surface: {
          DEFAULT: "#f9f9f9",
          raised: "#f0f0f0",
        },
        border: {
          DEFAULT: "#e5e5e5",
          strong: "#d0d0d0",
        },
      },

      // Imported from the sister site vytlacto3d, whose whole theme.extend is
      // exactly this one entry. There it names the @font-face family directly;
      // here the same face is loaded through next/font/local (app/layout.tsx)
      // and exposed as --font-century-gothic, so point at the variable instead
      // of re-declaring the family — otherwise the two loaders fight.
      fontFamily: {
        century: ["var(--font-century-gothic)", "Arial", "sans-serif"],
      },

      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
        // rest of scale matches Tailwind defaults; added only what's missing
      },

      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
        "34": "8.5rem",
        "42": "10.5rem",
      },

      borderRadius: {
        "4": "1rem",
        "5": "1.25rem",
        "6": "1.5rem",

        // vytlacto3d's radius ladder. It has no scale of its own — these are
        // the literal rounded-[Npx] values its components repeat, named here
        // so this site stops hardcoding them too.
        field: "26px",  // one parameter card
        panel: "32px",  // the panel a group of cards sits in
        well:  "20px",  // inset area inside a card
      },

      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08)",
        "card-hover": "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.08)",
        "accent-sm": "0 0 12px rgba(255,174,0,0.20)",
        accent: "0 0 24px rgba(255,174,0,0.35)",
        "accent-lg": "0 0 48px rgba(255,174,0,0.45)",
        "inset-sm": "inset 0 1px 3px rgba(0,0,0,0.08)",

        // vytlacto3d's shadow vocabulary, copied value-for-value from its
        // components. Wide, very soft and low-opacity — that diffuse lift is
        // most of why the sister site reads as "light" rather than boxed.
        "v3d-panel":  "0 18px 60px rgba(0,0,0,0.06)",
        "v3d-soft":   "0 12px 40px rgba(0,0,0,0.06)",
        "v3d-nav":    "0 8px 30px rgba(0,0,0,0.04)",
        "v3d-footer": "0 -12px 40px rgba(0,0,0,0.04)",
        "v3d-price":  "0 18px 50px rgba(0,0,0,0.08)",
        "v3d-accent": "0 24px 60px rgba(255,174,0,0.15)",
        "v3d-modal":  "0 20px 60px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
