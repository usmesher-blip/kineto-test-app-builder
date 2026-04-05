/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  // AI-generated styles arrive as runtime strings — safelist all utilities so none get purged
  safelist: [{ pattern: /.*/ }],
  theme: {
    extend: {},
  },
  plugins: [],
}
