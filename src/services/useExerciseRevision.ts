/**
 * Numero de revision de la bibliotheque d'exercices.
 *
 * A mettre en dependance d'un effet qui a charge des fiches : il change des
 * qu'un exercice est ecrit, supprime ou seme, et l'effet relit. Sans lui, un
 * ecran garde eternellement la copie qu'il avait au montage, IndexedDB ne
 * prevenant personne de ses ecritures.
 *
 * `useSyncExternalStore` plutot qu'un `useState` cable a la main : c'est React
 * qui gere alors l'abonnement, le desabonnement et la coherence du rendu.
 */

import { useSyncExternalStore } from 'react';
import { getExerciseRevision, subscribeExercises } from './repositories';

export function useExerciseRevision(): number {
  return useSyncExternalStore(subscribeExercises, getExerciseRevision, getExerciseRevision);
}
