/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        profit: '#ef4444',      // 한국 관례: 상승=빨강
        loss: '#3b82f6',        // 하락=파랑
        surface: '#1a2332',
        card: '#1e2d3e',
        border: '#2a3f55',
      },
    },
  },
  plugins: [],
};
