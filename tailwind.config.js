/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17202a',
        paper: '#f7f4ed',
        panel: '#fffdf8',
        line: '#ded7ca',
        accent: '#0f766e',
        coral: '#d95f43'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(23, 32, 42, 0.08)'
      }
    },
  },
  plugins: [],
};
