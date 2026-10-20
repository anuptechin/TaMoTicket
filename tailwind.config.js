/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        canvas: v('canvas'),
        surface: v('surface'),
        surface2: v('surface-2'),
        ink: v('ink'),
        muted: v('muted'),
        subtle: v('subtle'),
        hairline: v('hairline'),
        primary: { DEFAULT: v('primary'), hover: v('primary-hover'), soft: v('primary-soft') },
        success: '#16A34A',
        warning: '#D97706',
        critical: '#DC2626',
        info: '#2563EB',
        note: v('note'),
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        xs: ['13px', '18px'],
        '2xs': ['13px', '16px'],
      },
      borderRadius: { lg: '10px', xl: '12px' },
      boxShadow: {
        pop: '0 12px 32px -8px rgb(11 18 32 / 0.18), 0 2px 6px rgb(11 18 32 / 0.06)',
      },
      keyframes: {
        pulseRing: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(217 119 6 / 0.45)' },
          '50%': { boxShadow: '0 0 0 5px rgb(217 119 6 / 0)' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(220 38 38 / 0.45)' },
          '50%': { boxShadow: '0 0 0 5px rgb(220 38 38 / 0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        bar: { '0%,100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
      },
      animation: {
        'pulse-ring': 'pulseRing 1.8s ease-in-out infinite',
        'pulse-red': 'pulseRed 1.6s ease-in-out infinite',
        shimmer: 'shimmer 1.4s infinite',
        bar: 'bar 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
