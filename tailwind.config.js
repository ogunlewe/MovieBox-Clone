/** @type {import('tailwindcss').Config} */
export default {
  // ...existing config...
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        'shimmer': 'shimmer 2s infinite'
      }
    }
  },
  // ...existing config...
}
