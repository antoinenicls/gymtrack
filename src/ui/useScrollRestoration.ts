/**
 * Restauration de la position de defilement entre les ecrans.
 *
 * Pourquoi un hook maison plutot que <ScrollRestoration> de React Router ou le
 * `history.scrollRestoration` du navigateur : ces deux mecanismes agissent sur
 * le scroll de la FENETRE. Ici c'est le <main> du shell qui defile, la fenetre
 * ne bouge jamais. Aucun des deux ne voit donc quoi que ce soit.
 *
 * Comportement vise, qui est celui d'une application native :
 *   - retour arriere  -> on retrouve l'ecran exactement ou on l'avait laisse
 *   - toute autre navigation -> on arrive en haut
 *
 * La difficulte reelle est le timing. Le contenu de l'ecran est remonte a
 * chaque changement de route, et les listes se remplissent apres une lecture
 * asynchrone d'IndexedDB : au moment ou l'on voudrait replacer le defilement,
 * la page ne fait souvent que quelques pixels de haut et `scrollTop` est
 * silencieusement ramene a zero. On reapplique donc la position tant que la
 * hauteur change, jusqu'a y arriver ou jusqu'a expiration.
 */

import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Positions memorisees par entree d'historique.
 *
 * La cle est `location.key`, propre a chaque entree : deux visites successives
 * du meme chemin ont donc deux positions distinctes, comme dans un navigateur.
 */
const positions = new Map<string, number>();

/** Au-dela, on oublie les entrees les plus anciennes. Une session longue ne
 *  doit pas faire grossir cette table indefiniment. */
const MAX_ENTRIES = 50;

/** Delai au-dela duquel on renonce a restaurer : le contenu ne viendra plus. */
const RESTORE_TIMEOUT_MS = 1200;

function remember(key: string, top: number): void {
  positions.set(key, top);
  if (positions.size > MAX_ENTRIES) {
    const oldest = positions.keys().next().value;
    if (oldest !== undefined) positions.delete(oldest);
  }
}

/**
 * Prend l'ELEMENT et non un objet ref, volontairement.
 *
 * Le shell affiche un ecran de chargement avant de monter le <main> : au
 * premier passage des effets, un `ref.current` vaut encore null. Et comme
 * l'identite d'un objet ref ne change jamais, React ne rejoue pas l'effet
 * quand l'element finit par apparaitre, car l'ecouteur de defilement n'etait alors
 * jamais pose et aucune position n'etait enregistree. En dependant du noeud
 * lui-meme, les effets se rejouent des qu'il existe.
 */
export function useScrollRestoration(el: HTMLElement | null): void {
  const { key } = useLocation();
  const navigationType = useNavigationType();

  // Memorisation en continu. On enregistre a chaque defilement plutot qu'au
  // demontage : au moment du demontage, le contenu a deja ete remplace et
  // `scrollTop` vaut souvent 0, ce qui reviendrait a effacer la position juste
  // avant d'en avoir besoin.
  useEffect(() => {
    if (el === null) return;

    let frame = 0;
    const onScroll = (): void => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        remember(key, el.scrollTop);
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [key, el]);

  // Restauration. En layout effect pour agir avant que le navigateur ne peigne
  // la frame : sans cela on verrait le haut de la liste avant le saut.
  useLayoutEffect(() => {
    if (el === null) return;

    const target = navigationType === 'POP' ? (positions.get(key) ?? 0) : 0;
    if (target === 0) {
      el.scrollTop = 0;
      return;
    }

    let done = false;
    const finish = (): void => {
      done = true;
      observer.disconnect();
      window.clearTimeout(timer);
      el.removeEventListener('wheel', abandon);
      el.removeEventListener('touchstart', abandon);
    };

    // Si l'athlete defile lui-meme pendant qu'on essaie encore, on le laisse
    // faire : reprendre la main a ce moment-la serait plus penible que de rater
    // la restauration.
    const abandon = (): void => finish();

    const apply = (): void => {
      if (done) return;
      el.scrollTop = target;
      if (Math.abs(el.scrollTop - target) < 1) finish();
    };

    // Le contenu grandit au fil du chargement : chaque changement de taille est
    // une nouvelle occasion d'atteindre la position visee.
    const observer = new ResizeObserver(apply);
    const timer = window.setTimeout(finish, RESTORE_TIMEOUT_MS);

    el.addEventListener('wheel', abandon, { passive: true });
    el.addEventListener('touchstart', abandon, { passive: true });

    observer.observe(el);
    if (el.firstElementChild !== null) observer.observe(el.firstElementChild);
    apply();

    return finish;
  }, [key, navigationType, el]);
}

/** Vide les positions memorisees. Utilise par les tests. */
export function resetScrollPositions(): void {
  positions.clear();
}
