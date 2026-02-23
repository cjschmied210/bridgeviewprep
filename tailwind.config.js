/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        academic: {
          50: '#fafaf9', // stone-50 warm paper
          100: '#f5f5f4', // stone-100
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524', // stone-800 warm dark
          900: '#1c1917',
          950: '#0c0a09'
        },
        primary: {
          DEFAULT: '#2563eb', // blue-600 elegant
          hover: '#1d4ed8',   // blue-700
          light: '#eff6ff',   // blue-50
        },
        feedback: {
          success: '#16a34a', // green-600
          successLight: '#f0fdf4',
          error: '#dc2626',   // red-600
          errorLight: '#fef2f2',
          selection: '#dbeafe', // blue-100
          selectionBorder: '#60a5fa' // blue-400
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Merriweather"', 'Georgia', 'ui-serif', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
