/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"SF Mono"', 'Consolas', 'monospace'],
      },
      colors: {
        graphite: { DEFAULT: '#1C2128', 2: '#262C36', 3: '#323945' },
        paper: '#F5F6F3',
        surface: '#FFFFFF',
        ink: '#23272F',
        muted: '#6B7280',
        border: '#E3E4DF',
        teal: { DEFAULT: '#0E7C7B', dark: '#0A5F5E' },
        amber: { DEFAULT: '#C97A0C', bg: '#FCF1DE' },
        red: { DEFAULT: '#B3261E', bg: '#FBEAE9' },
        green: { DEFAULT: '#2F7D5A', bg: '#E9F3ED' }
      },
      boxShadow: {
        modal: '0 20px 50px rgba(20, 24, 30, 0.25)'
      }
    },
  },
  plugins: [],
}
