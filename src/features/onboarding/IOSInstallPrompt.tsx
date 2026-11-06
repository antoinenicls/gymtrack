/**
 * Invitation a installer l'app sur l'ecran d'accueil, sur iPhone et iPad.
 *
 * Reprise de MacroTrack. Safari iOS n'offre aucune invite d'installation
 * automatique, contrairement a Chrome sur Android : sans cette feuille,
 * l'athlete ne decouvre jamais que l'app s'installe. Or ouverte dans Safari,
 * elle perd le plein ecran, et la barre d'adresse vient manger la place du
 * chrono de repos.
 *
 * Ecartee, l'invitation ne revient pas avant deux semaines : une feuille qui
 * reapparait a chaque ouverture deviendrait un obstacle entre l'athlete et sa
 * seance.
 */

import { useEffect, useState } from 'react';
import { PlusSquare, Share } from 'lucide-react';
import { settingsRepo } from '@/services/repositories';
import { Button, Sheet } from '@/ui/primitives';

const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;

/** Laisse passer le premier affichage avant de recouvrir l'ecran. */
const DELAY_MS = 1500;

/**
 * Safari sur iPhone ou iPad.
 *
 * Chrome et Firefox sur iOS sont ecartes : le menu Partager n'y est pas au
 * meme endroit, et les instructions seraient fausses. Un iPad recent se
 * declare « Macintosh » ; c'est l'ecran tactile qui le distingue d'un Mac.
 */
function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const ios =
    /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  return ios && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

/** Deja ouverte depuis l'ecran d'accueil. */
function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Propre a Safari iOS.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function IOSInstallPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isIOSSafari() || isStandalone()) return;

    let timer: number | undefined;
    let cancelled = false;
    void settingsRepo.get().then((settings) => {
      const dismissed = settings.iosPromptDismissedAt;
      if (cancelled || (dismissed && Date.now() - dismissed < TWO_WEEKS)) return;
      timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = (): void => {
    setOpen(false);
    void settingsRepo.patch({ iosPromptDismissedAt: Date.now() });
  };

  return (
    <Sheet open={open} onClose={dismiss} title="Installer l’app">
      <div className="space-y-4 pb-2">
        <p className="text-[14px] leading-relaxed text-ink-2">
          Pour une expérience optimale, ajoute GymTrack à ton écran d’accueil. Elle s’ouvrira en
          plein écran, comme une app native.
        </p>
        <ol className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="shrink-0 rounded-lg bg-accent-soft p-2 text-accent">
              <Share size={18} />
            </span>
            <div>
              <p className="text-[15px] font-semibold">1. Appuie sur « Partager »</p>
              <p className="text-[13px] text-ink-2">
                L’icône carré et flèche, dans la barre de Safari.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="shrink-0 rounded-lg bg-accent-soft p-2 text-accent">
              <PlusSquare size={18} />
            </span>
            <div>
              <p className="text-[15px] font-semibold">2. « Sur l’écran d’accueil »</p>
              <p className="text-[13px] text-ink-2">Fais défiler le menu vers le bas si besoin.</p>
            </div>
          </li>
        </ol>
        <Button full variant="secondary" onClick={dismiss}>
          Plus tard
        </Button>
      </div>
    </Sheet>
  );
}
