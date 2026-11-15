/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: { 950: '#070B14', 900: '#0B1120', 850: '#0F1626', 800: '#141D31', 700: '#1C2840', 600: '#2A3A5A', 500: '#3B4E74' },
        teal: { DEFAULT: '#2DD4BF' }, ok: '#34D399', warn: '#F59E0B', alert: '#F43F5E', ice: '#60A5FA',
        ink: { DEFAULT: '#E6EDF7', soft: '#A9B6CC', mute: '#7D8BA5' },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
