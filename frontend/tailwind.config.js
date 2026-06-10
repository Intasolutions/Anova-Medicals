/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': 'var(--color-brand-primary)',
        'brand-primary-hover': 'var(--color-brand-primary-hover)',
        'brand-primary-light': 'var(--color-brand-primary-light)',
        'brand-secondary': 'var(--color-brand-secondary)',
        'brand-secondary-hover': 'var(--color-brand-secondary-hover)',
        'brand-secondary-light': 'var(--color-brand-secondary-light)',
        'brand-accent': 'var(--color-brand-accent)',
        'brand-accent-hover': 'var(--color-brand-accent-hover)',
        'brand-dark': 'var(--color-brand-dark)',
      }
    },
  },
  plugins: [],
}
