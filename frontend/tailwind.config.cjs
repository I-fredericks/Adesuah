/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe7ff',
          200: '#bcd3ff',
          300: '#8eb4fb',
          400: '#4d86f5',
          500: '#1d63ed',
          600: '#1552cc',
          700: '#0f43ab',
          800: '#312e81',
          900: '#1e1b4b',
        },
        navy: {
          600: '#26347a',
          700: '#1c2a6b',
          800: '#14205a',
          900: '#0c1640',
          950: '#080f2e',
        },
        sun: {
          300: '#ffd95e',
          400: '#fdc93a',
          500: '#f6b80f',
        },
        canvas: '#f5f7fb',
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.03)',
        pop: '0 10px 30px -10px rgb(15 23 42 / 0.25)',
      },
    },
  },
  plugins: [],
};
