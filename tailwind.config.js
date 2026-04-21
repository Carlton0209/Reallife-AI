/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ----- Product UI (Swiss / Ando) — used by App.jsx -----
        ink: '#0A0A0A',
        paper: '#FBFAF7',
        hairline: '#E8E4DB',
        secondary: '#76746D',
        tertiary: '#C4C0B5',
        accent: '#E63B20',
        concrete: {
          DEFAULT: '#ECE8DC',
          light: '#F5F2EA',
          dark: '#DAD5C8',
        },
        // ----- Homepage (Topaz-inspired) — used by Home.jsx -----
        cream: '#FAF8F3',
        soft: {
          DEFAULT: '#5C5B58',
          muted: '#6B6864',
          faint: '#9C9A95',
        },
      },
      fontFamily: {
        sans: ['"Inter Tight"', '-apple-system', 'BlinkMacSystemFont', '"Helvetica Neue"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}
