/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Funnel Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['"Funnel Display"', '"Funnel Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // the landing page's palette: charcoal ground, raised charcoal panels, warm off-white ink, sage action
        ground: '#1c1c1c',
        surface: { DEFAULT: '#242423', 2: '#2b2b29' },
        ink: { DEFAULT: '#f1f1ef', 2: '#c9c9c4', 3: '#9a9b96' },
        line: { DEFAULT: '#363633', soft: '#2e2e2c' },
        primary: { DEFAULT: '#8fa68e', hover: '#a2b7a1', soft: '#2a3229', ink: '#1c1c1c' },
        sage: { DEFAULT: '#8fa68e', 200: '#d6e0d5' },
        shell: { DEFAULT: '#181818', 2: '#222221', 3: '#2b2b29', line: '#2e2e2c', ink: '#f1f1ef', muted: '#9a9b96' },
        series: { observed: '#f1f1ef', sub1: '#7aa7dc', sub2: '#5fb8ab', weather: '#7aa7dc' },
      },
      boxShadow: {
        card: '0 1px 0 rgba(255, 255, 255, 0.03) inset',
        pop: '0 16px 40px -12px rgba(0, 0, 0, 0.6), 0 2px 6px -2px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
