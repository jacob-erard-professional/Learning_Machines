/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Intermountain Children's Health brand palette
        'brand-navy': {
          50:  '#eeeef6',
          100: '#d1d1e9',
          200: '#a5a5d2',
          300: '#7878bb',
          400: '#4b4b9f',
          500: '#1A1A4E',
          600: '#141440',
          700: '#0f0f32',
          800: '#0a0a24',
          900: '#050516',
        },
        'brand-purple': {
          50:  '#f0e9fd',
          100: '#ddd0fb',
          200: '#bba2f7',
          300: '#9773f3',
          400: '#7d4dee',
          500: '#6B2FD9',
          600: '#5724af',
          700: '#411a84',
          800: '#2c1259',
        },
        'brand-periwinkle': {
          50:  '#f4f5fe',
          100: '#eaebfc',
          200: '#d5d8f9',
          300: '#c0c5f7',
          400: '#A8B4F8',
          500: '#8e9cf5',
          600: '#7183f2',
        },
        'brand-pink': {
          100: '#fce4f2',
          300: '#f57ec5',
          500: '#E91E8C',
          600: '#c01572',
          700: '#970f5a',
        },
        'brand-yellow': {
          50:  '#fefce8',
          100: '#fef9c3',
          300: '#fde047',
          500: '#F5C518',
          600: '#d4a90e',
          700: '#a88808',
        },
        'brand-salmon': {
          50:  '#fef3ec',
          100: '#fde3d2',
          200: '#facdb2',
          300: '#f8b692',
          500: '#F4A07A',
          600: '#ef7e4f',
          700: '#e85c24',
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'pill': '50px',
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgba(26, 26, 78, 0.08), 0 1px 2px -1px rgba(26, 26, 78, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(107, 47, 217, 0.14), 0 2px 4px -2px rgba(107, 47, 217, 0.10)',
      },
    },
  },
  plugins: [],
}
