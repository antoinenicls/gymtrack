/**
 * Etat d'ecran conserve d'une visite a l'autre.
 *
 * Le shell remonte le contenu a chaque changement de route (la cle sur le
 * chemin, dans App.tsx, sert a rejouer l'animation d'entree). Tout `useState`
 * d'un ecran repart donc de zero au retour arriere : on restaure la position de
 * defilement, mais sur une liste qui n'est plus filtree comme avant, ce qui
 * remet la position au mauvais endroit.
 *
 * Ce hook range la valeur par ENTREE D'HISTORIQUE, comme la restauration de
 * defilement. Consequence utile et voulue : revenir en arriere retrouve la
 * recherche, tandis qu'arriver sur l'ecran par l'onglet ouvre une entree neuve,
 * sans valeur memorisee, donc un ecran vierge. Aucune condition sur le type de
 * navigation n'est necessaire, la cle suffit a distinguer les deux cas.
 *
 * A ne pas utiliser pour des donnees metier : ce n'est qu'un confort de
 * navigation, la memoire est videe au rechargement de l'app.
 */

import { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';

const store = new Map<string, unknown>();

/** Meme plafond que les positions de defilement, meme raison. */
const MAX_ENTRIES = 50;

export function useHistoryState<T>(id: string, initial: T): [T, (value: T) => void] {
  const { key } = useLocation();
  const slot = `${key}:${id}`;

  const [value, setValue] = useState<T>(() =>
    store.has(slot) ? (store.get(slot) as T) : initial,
  );

  const set = useCallback(
    (next: T) => {
      store.set(slot, next);
      if (store.size > MAX_ENTRIES) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      setValue(next);
    },
    [slot],
  );

  return [value, set];
}

/** Vide la memoire d'ecran. Utilise par les tests. */
export function resetHistoryState(): void {
  store.clear();
}
