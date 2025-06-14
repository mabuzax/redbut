/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // RedBut primary color palette
        primary: {
          50: '#fff1f1',
          100: '#ffe1e1',
          200: '#ffc7c7',
          300: '#ffa0a0',
          400: '#ff6b6b',
          500: '#ff3b3b', // Main "RedBut" color
          600: '#e61c1c',
          700: '#c31414',
          800: '#a01414',
          900: '#841818',
          950: '#480707',
        },
        // Secondary colors
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Success, warning, error colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        // Background colors
        background: {
          light: '#ffffff',
          dark: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-roboto-mono)', 'monospace'],
      },
      borderRadius: {
        'button': '9999px', // For the round button
        'lg': '0.75rem',
        'xl': '1rem',
      },
      boxShadow: {
        'button': '0 10px 25px -5px rgba(255, 59, 59, 0.5), 0 8px 10px -6px rgba(255, 59, 59, 0.3)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'shine': 'shine 1.5s infinite linear',
        'fly-in': 'fly-in 0.8s ease-out forwards',
        'underline': 'underline 0.8s ease-out forwards',
      },
      keyframes: {
        'shine': {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        'fly-in': {
          '0%': { transform: 'scale(0) translateZ(-200px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateZ(0)', opacity: '1' },
        },
        'underline': {
          '0%': { width: '0%', left: '100%' },
          '100%': { width: '100%', left: '0%' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      screens: {
        'xs': '475px',
        ...require('tailwindcss/defaultTheme').screens,
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}
