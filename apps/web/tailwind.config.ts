import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#050505',
        foreground: '#f3f4f6',
        card: 'rgba(20, 20, 20, 0.6)',
        'card-border': 'rgba(255, 255, 255, 0.1)',
        neon: {
          cyan: '#00f0ff',
          purple: '#b14fff',
          green: '#00ffcc',
        },
        verana: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          500: '#4f6ef7',
          600: '#3b5bdb',
          700: '#2f4ac5',
          900: '#1a2a8c',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-dark': 'radial-gradient(at 40% 20%, rgba(177, 79, 255, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(0, 240, 255, 0.15) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(0, 255, 204, 0.1) 0px, transparent 50%)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-up': 'slide-up 0.5s ease-out forwards',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
