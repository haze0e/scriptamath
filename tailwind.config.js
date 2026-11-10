/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0c0e14',
          panel: '#131722',
          border: '#1f2536',
          hover: '#262d42',
          text: '#f1f5f9',
          muted: '#94a3b8',
          accent: '#3b82f6',
          accentHover: '#2563eb'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'monospace']
      }
    },
  },
  plugins: [],
}
