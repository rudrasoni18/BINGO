/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#00f5ff',
          green: '#39ff14',
          yellow: '#ffff00',
          pink: '#ff00ff',
          orange: '#ff6600',
        },
      },
      animation: {
        'pulse-fast': 'pulse 0.7s cubic-bezier(0.4,0,0.6,1) infinite',
        'shake': 'shake 0.5s ease-in-out',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
        'bounce-in': 'bounceIn 0.6s ease-out',
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-8px)' },
          '80%': { transform: 'translateX(8px)' },
        },
        glow: {
          from: { textShadow: '0 0 8px #00f5ff, 0 0 20px #00f5ff' },
          to:   { textShadow: '0 0 20px #00f5ff, 0 0 40px #00f5ff, 0 0 60px #0ff' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '80%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 8px #00f5ff, 0 0 20px #00f5ff33',
        'neon-green': '0 0 8px #39ff14, 0 0 20px #39ff1433',
        'neon-pink': '0 0 8px #ff00ff, 0 0 20px #ff00ff33',
        'neon-yellow': '0 0 8px #ffff00, 0 0 20px #ffff0033',
      },
    },
  },
  plugins: [],
}
