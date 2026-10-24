/** @type {import('tailwindcss').Config} */

// Same tokens as QikDrive (Frontend/tailwind.config.js there). Colours come
// from CSS variables in src/index.css, so every screen follows the light or
// dark theme without per-class dark: variants.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        raised: v("raised"),
        line: v("line"),
        fg: v("fg"),
        muted: v("muted"),
        primary: v("primary"),
        "on-primary": v("on-primary"),
        brand: v("brand"),
        danger: v("danger"),
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        logo: ["Cinzel", "Georgia", "serif"],
        display: ["Cinzel", "Georgia", "serif"],
      },
      boxShadow: {
        float: "0 8px 30px rgb(0 0 0 / 0.12)",
      },
      keyframes: {
        "sheet-up": {
          from: { transform: "translateY(24px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        pop: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "60%": { transform: "scale(1.04)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "sheet-up": "sheet-up 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)",
        pop: "pop 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
