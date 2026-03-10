/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        radiant: {
          dark: '#111111',
          panel: '#1e1e1e',
          tool: '#2d2d2d',
          toolHover: '#3d3d3d',
          active: '#0078d4',
          text: '#e0e0e0',
          textMuted: '#9e9e9e',
          border: '#333333'
        }
      }
    },
  },
  plugins: [],
}
