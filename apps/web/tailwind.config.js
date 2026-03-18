/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E01E37', // Example Pulso Cultural color from doc
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        sora: ['Sora', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
