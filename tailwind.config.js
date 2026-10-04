/** @type {import('tailwindcss').Config} */
// Same tokens as ../frontend/tailwind.config.js so the admin matches the storefront's design system.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: { DEFAULT: '1.25rem', md: '2rem', xl: '2.5rem' }, screens: { '2xl': '1440px' } },
    extend: {
      colors: {
        brand: { 50: '#FFF1F2', 100: '#FFE1E3', 200: '#FFC3C7', 500: '#E11D2E', 600: '#D01A2A', 700: '#B01524', 900: '#5A0A12' },
        ink: { DEFAULT: '#0B0C10', 2: '#3A3F47', 3: '#6E737C', 4: '#A2A6AD' },
        line: { DEFAULT: '#E7E4DE', 2: '#F0EDE7' },
        cream: { DEFAULT: '#F6F3EE', 2: '#FBF9F5', 3: '#EFEBE3' },
        tint: { mint: '#DDF3E4', sky: '#DCEBFA', lilac: '#E8E2F8', peach: '#FDE6DA', lemon: '#F8F0C6', sand: '#F1E9DC' },
        success: '#127A4A',
        info: '#1D5FB4',
        warn: '#8A5A00',
        violet: '#5B3FA6',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { xl: '14px', '2xl': '20px', '3xl': '28px', '4xl': '36px' },
      boxShadow: {
        glass: '0 1px 0 rgba(255,255,255,.6) inset, 0 10px 40px -12px rgba(11,12,16,.18)',
        card: '0 18px 40px -20px rgba(11,12,16,.22)',
        float: '0 30px 80px -24px rgba(11,12,16,.28)',
        toast: '0 24px 60px -20px rgba(11,12,16,.35)',
        ring: '0 0 0 1px rgba(11,12,16,.06)',
      },
      letterSpacing: { tightest: '-0.03em', tighter: '-0.02em' },
      keyframes: {
        rise: { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        page: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pop: { from: { opacity: 0, transform: 'translateY(8px) scale(.98)' }, to: { opacity: 1, transform: 'translateY(0) scale(1)' } },
        slideIn: { from: { transform: 'translateX(40px)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
      },
      animation: {
        rise: 'rise .6s cubic-bezier(.2,.7,.2,1) both',
        page: 'page .35s cubic-bezier(.2,.7,.2,1) both',
        pop: 'pop .18s cubic-bezier(.2,.7,.2,1) both',
        slideIn: 'slideIn .25s cubic-bezier(.2,.7,.2,1) both',
      },
    },
  },
  plugins: [],
};
