/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ead: {
          blue: '#0052CC', // Trust Blue
          red: '#D32F2F',  // Regulatory Red
          sealed: '#0052CC',
          pending: '#FFA000',
          dark: '#121212',
          light: '#F5F7FA',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
