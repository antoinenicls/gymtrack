/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tokens de la marque, communs aux apps et au site.
        ink: { DEFAULT: '#1D1D1F', 2: '#6E6E73', 3: '#B0B0B8' },
        line: { DEFAULT: 'rgba(0,0,0,.07)', 2: 'rgba(0,0,0,.08)' },
        alt: '#F5F5F7',
        accent: {
          DEFAULT: '#0A84FF',
          dark: '#0069D9',
          deep: '#0060DF',
          light: '#4DA3FF',
          soft: '#F0F7FF',
          border: '#CCE4FF',
        },
        // Propres a GymTrack : etat valide et record personnel.
        done: { DEFAULT: '#10B981', soft: '#ECFDF5', border: '#A7F3D0' },
        pr: { DEFAULT: '#F59E0B', soft: '#FFFBEB', border: '#FDE68A' },
        // Record du mois : progres reel, mais pas le record absolu.
        month: { DEFAULT: '#8B5CF6', soft: '#F5F3FF', border: '#DDD6FE' },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // Les chiffres bruts : tabulaires, pour que les colonnes ne dansent pas.
        num: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '20px', pill: '980px' },
      transitionTimingFunction: { ease: 'cubic-bezier(.16, 1, .3, 1)' },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
      },
      keyframes: {
        'pr-pop': {
          '0%': { transform: 'scale(.6)', opacity: '0' },
          '60%': { transform: 'scale(1.12)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(100%)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        /* Entree d'ecran : monte de quelques pixels en apparaissant, ce qui
           donne une direction au changement au lieu d'un simple clignotement. */
        'page-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        /* Entree de liste, jouee avec un decalage croissant par element. */
        'item-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(.94)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        /* Validation d'une serie : la coche rebondit une fois. */
        'check-pop': {
          '0%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.22)' },
          '100%': { transform: 'scale(1)' },
        },
        /* Trace d'une courbe. `pathLength={1}` normalise la longueur du
           chemin, donc un dasharray de 1 couvre exactement le trace, quelle
           que soit sa forme — aucune mesure JavaScript n'est necessaire. */
        draw: {
          from: { strokeDasharray: '1', strokeDashoffset: '1' },
          to: { strokeDasharray: '1', strokeDashoffset: '0' },
        },
        /* Le chrono passe en accent dans ses dernieres secondes. */
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.55' },
        },
      },
      animation: {
        'pr-pop': 'pr-pop .38s cubic-bezier(.16, 1, .3, 1)',
        'slide-up': 'slide-up .32s cubic-bezier(.16, 1, .3, 1)',
        'slide-down': 'slide-down .22s cubic-bezier(.4, 0, 1, 1) forwards',
        'fade-in': 'fade-in .2s ease-out',
        'fade-out': 'fade-out .2s ease-out forwards',
        'page-in': 'page-in .28s cubic-bezier(.16, 1, .3, 1)',
        'item-in': 'item-in .34s cubic-bezier(.16, 1, .3, 1) both',
        'scale-in': 'scale-in .22s cubic-bezier(.16, 1, .3, 1)',
        'check-pop': 'check-pop .3s cubic-bezier(.16, 1, .3, 1)',
        draw: 'draw .9s cubic-bezier(.16, 1, .3, 1) forwards',
        'pulse-soft': 'pulse-soft 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
