/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyan: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        neutral: {
          950: '#09090b',
          900: '#121215',
          850: '#17171c',
          800: '#262626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        title: ['Mojangles', '"Press Start 2P"', 'cursive'],
        pixel: ['MinecraftSeven', 'Mojangles', 'monospace'],
        vt323: ['VT323', 'monospace'],
        silkscreen: ['Silkscreen', 'cursive'],
      },
    },
  },
  plugins: [],
}
