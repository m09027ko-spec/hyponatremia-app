/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        safe: '#16a34a',
        caution: '#eab308',
        danger: '#dc2626',
      },
      minHeight: {
        tap: '44px',
      },
      minWidth: {
        tap: '44px',
      },
      keyframes: {
        flash: {
          '0%, 100%': { backgroundColor: 'rgba(220, 38, 38, 0.15)' },
          '50%': { backgroundColor: 'rgba(220, 38, 38, 0.35)' },
        },
      },
      animation: {
        flash: 'flash 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
