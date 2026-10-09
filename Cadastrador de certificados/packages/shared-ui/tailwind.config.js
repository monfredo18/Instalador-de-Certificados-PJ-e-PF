/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        status: {
          valid: '#22c55e',
          warning: '#f59e0b',
          expired: '#ef4444',
        },
        primary: '#3b82f6',
        sidebar: {
          light: '#f9fafb',
          dark: '#111827',
        }
      },
      borderRadius: {
        'xl': '1rem',
      }
    },
  },
  plugins: [],
};
