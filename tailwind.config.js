/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f4fce4",
          100: "#e6f7c0",
          200: "#ceef8f",
          300: "#b5e45e",
          400: "#9ACD32",
          500: "#7fb828",
          600: "#649a1e",
          700: "#4a7416",
          800: "#35550f",
          900: "#243a0a",
        },
        accent: {
          50: "#f0f7ff",
          100: "#dbeeff",
          200: "#bfe1fe",
          300: "#9ACDFC",
          400: "#6fb5fa",
          500: "#4a9ef5",
          600: "#2d80d8",
          700: "#1e63ab",
          800: "#154a80",
          900: "#0e3356",
        },
        charcoal: {
          400: "#9ACD5B",
          500: "#7eb344",
          600: "#63932e",
        },
        neutral: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#c0c0c0",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#3f3f46",
          700: "#2d2d32",
          800: "#1d1d1f",
          900: "#0a0a0a",
        },
      },
    },
  },
  plugins: [],
};

