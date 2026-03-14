/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ecogreen: "#1f9d63",
        ecoblue: "#1d6fa3",
        ecoink: "#153042",
        ecobg: "#eaf6f3"
      },
      boxShadow: {
        soft: "0 8px 24px rgba(10, 42, 59, 0.1)",
      },
      borderRadius: {
        panel: "24px",
      },
    },
  },
  plugins: [],
};
