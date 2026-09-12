/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#090909",
        surface1: "#141414",
        surface2: "#1c1c1c",
        hairline: "#262626",
        hairlinesoft: "#1a1a1a",
        accent: "#0099ff",
        ink: "#ffffff",
        inkmuted: "#999999",
        gmagenta: "#d44df0",
        gviolet: "#6a4cf5",
        gorange: "#ff7a3d",
        gcoral: "#ff5577",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Inter Variable",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "Inter",
          "Inter Variable",
          "GT Walsheim Medium",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "20px",
        xxl: "30px",
      },
      maxWidth: {
        canvas: "1199px",
      },
    },
  },
  plugins: [],
};
