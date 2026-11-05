import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { primeAudio } from './services/feedback';
import './styles/index.css';

/**
 * Hauteur reelle du viewport.
 *
 * 100vh compte la barre d'URL retractile de Safari mobile et deborde donc de
 * l'ecran, ce qui pousse la tab bar sous le pli. On mesure la vraie hauteur et
 * on la republie en variable CSS.
 */
function syncViewportHeight(): void {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight}px`);
}
syncViewportHeight();
window.addEventListener('resize', syncViewportHeight);
window.addEventListener('orientationchange', syncViewportHeight);

primeAudio();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
