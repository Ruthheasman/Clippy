/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './overlay/index.html',
    './src/**/*.{ts,tsx}',
    './overlay/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        clippy: {
          bg: 'var(--clippy-bg)',
          surface: 'var(--clippy-surface)',
          border: 'var(--clippy-border)',
          text: 'var(--clippy-text)',
          muted: 'var(--clippy-muted)',
          accent: 'var(--clippy-accent)',
          'accent-glow': 'var(--clippy-accent-glow)',
          user: 'var(--clippy-user)',
        },
      },
      fontFamily: {
        display: ['Satoshi', 'system-ui', 'sans-serif'],
        body: ['General Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px var(--clippy-accent-glow)' },
          '50%': { boxShadow: '0 0 20px var(--clippy-accent-glow)' },
        },
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
