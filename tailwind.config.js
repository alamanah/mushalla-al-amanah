/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0fdf6",
          100: "#dcfce9",
          200: "#bbf7d3",
          300: "#86efb3",
          400: "#4ade8c",
          500: "#22c56d",
          600: "#149a57",
          700: "#0f7a47",
          800: "#0f5f3b",
          900: "#0d4e32",
          950: "#052b1b",
        },
        gold: {
          400: "#e8c874",
          500: "#d4af37",
          600: "#b3901f",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["\"Amiri\"", "ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
