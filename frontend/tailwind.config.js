/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Intermountain Healthcare brand palette
        'ihc-blue': {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          500: '#0066cc',  // IHC primary blue
          600: '#0052a3',
          700: '#003d7a',
          800: '#002952',
          900: '#001429',
        },
        'ihc-teal': {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          300: '#5eead4',
          500: '#00897b',  // IHC teal accent
          600: '#00695c',
          700: '#004d40',
        },
        'ihc-amber': {
          100: '#fef3c7',
          300: '#fcd34d',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        'ihc-green': {
          500: '#2e7d32',
          600: '#1b5e20',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 102, 204, 0.08), 0 1px 2px -1px rgba(0, 102, 204, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 102, 204, 0.12), 0 2px 4px -2px rgba(0, 102, 204, 0.08)',
      },
    },
  },
  plugins: [],
}
