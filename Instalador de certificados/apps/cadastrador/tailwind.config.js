/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/shared-ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        'status-valid': '#22c55e',
        'status-warning': '#f59e0b',
        'status-expired': '#ef4444',
        'sidebar-light': '#1e293b',
        'sidebar-dark': '#0f172a',
      },
    },
  },
  plugins: [],
};
