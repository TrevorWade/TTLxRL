/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // TikTok Brand Colors
      colors: {
        tiktok: {
          black: '#000000',
          red: '#FE2C55',
          cyan: '#25F4EE',
          pink: '#FF0050',
          white: '#FFFFFF',
          gray: '#333333',
        }
      },
      // TikTok Typography
      fontFamily: {
        tiktok: ['TikTok Sans Pro', 'Poppins', 'sans-serif'],
      },
      // Custom animations for TikTok feel
      animation: {
        'fadeInUp': 'fadeInUp 0.6s ease-out forwards',
        'fadeIn': 'fadeIn 0.3s ease-out forwards',
        'scaleHeart': 'scaleHeart 0.6s ease-out',
        'heartBeat': 'heartBeat 1.5s ease-in-out infinite',
        'floatUp': 'floatUp 2s ease-out forwards',
        'heartBurst': 'heartBurst 0.8s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleHeart: {
          '0%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.25)' },
          '30%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        heartBeat: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        floatUp: {
          '0%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1) rotate(0deg)' 
          },
          '100%': { 
            opacity: '0', 
            transform: 'translateY(-100px) scale(0.5) rotate(15deg)' 
          },
        },
        heartBurst: {
          '0%': { 
            transform: 'scale(1)', 
            opacity: '1' 
          },
          '50%': { 
            transform: 'scale(1.4)', 
            opacity: '0.8' 
          },
          '100%': { 
            transform: 'scale(1)', 
            opacity: '1' 
          },
        }
      }
    },
  },
  plugins: [],
};


