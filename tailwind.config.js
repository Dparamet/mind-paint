/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#24313d',
        paper: '#f7f3ea',
        panel: '#fffaf0',
        line: '#ded5c7',
        accent: '#0f766e',
        coral: '#c84234'
      },
      boxShadow: {
        soft: '0 14px 36px rgba(36, 49, 61, 0.10)'
      }
    },
  },
  plugins: [],
};
