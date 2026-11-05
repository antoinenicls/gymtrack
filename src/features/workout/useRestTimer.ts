/**
 * Chronometre de recuperation.
 *
 * Le temps restant se DERIVE d'un horodatage de fin absolu, il n'est jamais
 * decremente par un compteur. Raison : sur mobile, un setInterval est gele des
 * que l'ecran s'eteint ou que l'app passe en arriere-plan. Un compteur qui
 * decremente afficherait 40 secondes restantes apres 3 minutes de pause.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWorkoutStore } from './workoutStore';
import {
  armRestNotification,
  cancelRestBeep,
  cancelRestNotification,
  clearRestNotification,
  notifyRestOver,
  rearmRestNotification,
  scheduleRestBeep,
} from '@/services/feedback';
import { restRemainingMs } from '@/lib/restTimer';

export interface RestTimerView {
  active: boolean;
  paused: boolean;
  remainingSec: number;
  totalSec: number;
  /** Part ecoulee, de 0 a 1, pour l'anneau de progression. */
  progress: number;
}

export function useRestTimer(): RestTimerView {
  const restTimer = useWorkoutStore((s) => s.restTimer);
  const stopRest = useWorkoutStore((s) => s.stopRest);
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef<number | null>(null);

  /**
   * Inutile de battre la seconde sur un chrono en pause : rien n'y bouge.
   *
   * Mais l'horloge se recale AVANT tout, des que le chrono repart. Pendant la
   * pause elle ne bat plus, donc elle reste figee sur l'instant de l'arret ;
   * la reprise, elle, repousse l'echeance de toute la duree de la pause. Lus
   * ensemble, ces deux la donnaient un chrono qui remontait de cinq secondes
   * le temps d'un battement.
   *
   * Effet de MISE EN PAGE et non d'apres-rendu : le recalage doit avoir eu
   * lieu avant que l'ecran ne s'allume, sinon le mauvais chiffre est peint.
   */
  useLayoutEffect(() => {
    if (!restTimer || restTimer.pausedRemainingMs !== undefined) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [restTimer]);

  // Recalage immediat au retour au premier plan : sans ca, l'affichage reste
  // fige sur la derniere valeur connue avant la mise en veille.
  useEffect(() => {
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const paused = restTimer?.pausedRemainingMs !== undefined;
  const remainingMs = restRemainingMs(restTimer, now);
  const remainingSec = Math.ceil(remainingMs / 1000);

  /**
   * Le bip se programme des maintenant, pour l'heure exacte de la fin.
   *
   * Il ne se declenchait qu'au battement qui constatait l'echeance, donc au
   * rythme de ce composant. Or ce rythme ralentit des que l'app passe au
   * second plan et s'arrete net quand l'ecran s'eteint, c'est-a-dire dans la
   * situation meme ou l'on compte sur le son : telephone pose, yeux ailleurs.
   * L'horloge audio, elle, tient l'heure sans nous.
   *
   * Reprogramme a chaque changement d'echeance, et la dependance suffit a les
   * couvrir tous : lancement, +15, -15, pause, reprise, arret.
   */
  useEffect(() => {
    if (!restTimer || restTimer.pausedRemainingMs !== undefined) {
      cancelRestBeep();
      return;
    }
    void scheduleRestBeep(restTimer.endsAt - Date.now());
    return () => cancelRestBeep();
  }, [restTimer]);

  /**
   * La notification s'arme des le LANCEMENT du repos, et se rearme quand
   * l'ecran s'eteint.
   *
   * Elle ne s'armait qu'en quittant l'ecran, par un chemin qui attendait la
   * base et le worker : la page etait gelee avant d'avoir poste, et rien ne
   * sortait. Armee au lancement, l'echeance est deja chez le service worker
   * quand l'ecran s'eteint ; c'est lui qui verifie, a l'heure dite, que l'app
   * n'est pas a l'ecran. Le rearmement au depart est synchrone, il part a
   * coup sur.
   *
   * Au retour dans l'app, on ferme ce qui est affiche sur l'ecran verrouille :
   * la barre de repos est sous les yeux, la notification a ete lue.
   */
  useEffect(() => {
    if (!restTimer || restTimer.pausedRemainingMs !== undefined) {
      cancelRestNotification();
      return;
    }

    void armRestNotification(restTimer.endsAt);

    const sync = (): void => {
      if (document.visibilityState === 'hidden') rearmRestNotification();
      else clearRestNotification();
    };

    document.addEventListener('visibilitychange', sync);
    // `pagehide` en renfort : sur iOS, c'est l'evenement qui part a coup sur
    // quand l'app quitte l'ecran, la ou `visibilitychange` a pu etre avale.
    // Armer deux fois ne coute rien, le worker remplace ce qu'il tenait.
    window.addEventListener('pagehide', rearmRestNotification);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pagehide', rearmRestNotification);
      cancelRestNotification();
    };
  }, [restTimer]);

  useEffect(() => {
    if (!restTimer) {
      firedRef.current = null;
      return;
    }
    // Un chrono en pause ne sonne jamais, meme arrete a zero : c'est
    // l'athlete qui decide quand le repos reprend.
    if (restTimer.pausedRemainingMs !== undefined) return;
    if (remainingMs > 0) return;
    // Une seule notification par chrono, meme si le composant se re-rend.
    if (firedRef.current === restTimer.endsAt) return;

    firedRef.current = restTimer.endsAt;
    // Le retard se mesure ICI, a l'instant du constat : une page qui dormait
    // decouvre la fin au retour dans l'app, et ne doit plus la claironner.
    const lateMs = Date.now() - restTimer.endsAt;
    // Dans cet ordre : le signal d'abord, l'arret ensuite. Arreter le chrono
    // efface le bip programme, et le rattrapage ne saurait plus s'il a sonne.
    void (async () => {
      await notifyRestOver(lateMs);
      await stopRest();
    })();
  }, [restTimer, remainingMs, stopRest]);

  const totalSec = restTimer?.totalSec ?? 0;

  return {
    active: restTimer !== null,
    paused,
    remainingSec,
    totalSec,
    progress: totalSec > 0 ? Math.min(1, (totalSec - remainingSec) / totalSec) : 0,
  };
}
