/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        coral: 'rgb(var(--color-coral) / <alpha-value>)',
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)'
      },
      boxShadow: {
        soft: '0 14px 36px rgba(36, 49, 61, 0.10)'
      }
    },
  },
  plugins: [],
};
