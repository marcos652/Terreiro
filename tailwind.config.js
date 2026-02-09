/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/modules/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#fdf9f3',
          100: '#f7efe3',
          200: '#efe0c9',
        },
        ink: {
          50: '#f4f6f8',
          100: '#e3e8ef',
          300: '#9aa4b2',
          400: '#6c7685',
          500: '#4b5563',
          700: '#1f2937',
          900: '#111827',
        },
        coral: {
          50: '#fff1ed',
          400: '#fb7185',
          500: '#f43f5e',
        },
        teal: {
          500: '#0f766e',
          600: '#0d9488',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui'],
        display: ['"Playfair Display"', 'ui-serif', 'Georgia'],
      },
    },
  },
  plugins: [],
};
