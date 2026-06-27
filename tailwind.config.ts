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
          DEFAULT: "#00c8ff",
          dark: "#00a3d4",
          light: "#66dfff",
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
      },

      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08)",
        "card-hover": "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.08)",
        "accent-sm": "0 0 12px rgba(0,200,255,0.20)",
        accent: "0 0 24px rgba(0,200,255,0.35)",
        "accent-lg": "0 0 48px rgba(0,200,255,0.45)",
        "inset-sm": "inset 0 1px 3px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
