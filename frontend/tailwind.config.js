// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: '#0A1628', card: '#132240', deep: '#0D1E38' },
        crime: {
          women:    '#C0392B',
          children: '#E67E22',
          theft:    '#F39C12',
          murder:   '#7B241C',
          assault:  '#F1C40F',
          cyber:    '#0E7C8B',
          drugs:    '#8E44AD',
          riots:    '#A04000',
          other:    '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
