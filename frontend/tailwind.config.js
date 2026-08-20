/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pale-sage': '#E8F0D8',
        'surface-ivory': '#FBF8EA',
        'card-sage': '#F1F4DF',
        'primary-olive': {
          DEFAULT: '#789C45',
          hover: '#688939',
          dark: '#57742E',
          light: '#EAF2DC'
        },
        'forest-green': {
          DEFAULT: '#23452D',
          hover: '#193321',
          light: '#375E40'
        },
        'text-charcoal': '#242A24',
        'muted-sage': '#687064',
        'border-light': '#DDE4C9',
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Manrope', 'sans-serif']
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(35, 69, 45, 0.05)',
        'soft-lg': '0 14px 40px rgba(35, 69, 45, 0.08)',
        'card': '0 4px 20px rgba(35, 69, 45, 0.04)',
      },
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
