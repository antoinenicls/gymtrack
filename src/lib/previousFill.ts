/**
 * Reprise de la prestation precedente, d'un seul appui.
 *
 * La colonne « Precedent » affichait ce qui avait ete fait la derniere fois
 * sans qu'on puisse rien en faire : il fallait lire le chiffre, puis le
 * retaper deux fois. Or neuf series sur dix repartent exactement de la, et
 * une saisie qu'on peut recopier a l'identique n'a aucune raison d'etre
 * manuelle, surtout entre deux series avec les mains moites.
 *
 * CE QUI SE RECOPIE : la charge et les repetitions, rien d'autre.
 *
 *  - Pas le RPE. C'est le cout ressenti de la serie de CE jour-la ; le
 *    preremplir ferait dire a la seance une penibilite qu'on n'a pas encore
 *    eprouvee, et fausserait le moteur de surcharge qui s'appuie dessus.
 *  - Pas le type de serie, ni l'echec, ni la marque de degressive : ils
 *    appartiennent a la ligne du jour, telle qu'elle a ete prevue.
 *  - Pas la validation : reprendre un chiffre n'est pas avoir souleve.
 */

import type { WorkoutSet } from '@/types/domain';

export type PreviousFill = Partial<Pick<WorkoutSet, 'weightKg' | 'reps'>>;

/**
 * Ce qu'il y a a reprendre d'une serie passee, ou `null` s'il n'y a rien.
 *
 * Seuls les champs REELLEMENT renseignes la derniere fois sont repris. Un
 * exercice au poids du corps n'a pas de charge : recopier son `null` effacerait
 * les kilos que l'athlete vient de saisir, et le geste cense faire gagner du
 * temps en aurait fait perdre. On ne remplit jamais avec du vide.
 */
export function previousFill(previous: WorkoutSet | null | undefined): PreviousFill | null {
  if (!previous) return null;

  const patch: PreviousFill = {};
  if (previous.weightKg !== null) patch.weightKg = previous.weightKg;
  if (previous.reps !== null) patch.reps = previous.reps;

  return Object.keys(patch).length > 0 ? patch : null;
}
