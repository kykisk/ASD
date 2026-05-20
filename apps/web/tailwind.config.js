const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(
      __dirname,
      '{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html}'
    ),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        // Primary — Sage green (calming, natural, trust)
        primary: {
          50:  '#f2f7f4',
          100: '#e0ede5',
          200: '#c3dbcc',
          300: '#9bc3ab',
          400: '#6fa886',
          500: '#5B8A72',
          600: '#3D6B54',
          700: '#345a47',
          800: '#2c4a3b',
          900: '#253d32',
          950: '#12211b',
        },
        // Secondary — Warm amber (gentle, supportive)
        secondary: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Accent — Soft coral (warmth, engagement)
        accent: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Neutral — Warm slate
        neutral: {
          50:  '#FDFBF7',
          100: '#F5F2EE',
          200: '#E8E4DF',
          300: '#D4CFC9',
          400: '#94A3B4',
          500: '#6B7B8D',
          600: '#475569',
          700: '#334155',
          800: '#2C3E50',
          900: '#1a2332',
          950: '#0f1419',
        },
        // Semantic
        success: '#10b981',
        warning: '#f59e0b',
        error:   '#ef4444',
        info:    '#3b82f6',
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        DEFAULT: '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      fontSize: {
        // Korean-optimized sizes (slightly larger for readability)
        xs:   ['0.75rem', { lineHeight: '1.25rem' }],
        sm:   ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.625rem' }],
        lg:   ['1.125rem', { lineHeight: '1.75rem' }],
        xl:   ['1.25rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.375rem' }],
      },
      boxShadow: {
        'sage-sm': '0 2px 8px rgba(91, 138, 114, 0.06)',
        'sage': '0 4px 16px rgba(91, 138, 114, 0.08)',
        'sage-lg': '0 8px 32px rgba(91, 138, 114, 0.12)',
      },
      animation: {
        'pulse-gentle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-slide-in': 'fadeSlideIn 0.3s ease-out',
        'spin-slow': 'spin 1.2s linear infinite',
      },
      keyframes: {
        fadeSlideIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
