import type { RestTimerState } from '@/types/domain';

/**
 * Le chrono en cours a-t-il ete lance par CETTE serie ?
 *
 * Sert a decider si decocher une case doit arreter le repos. La regle : on
 * n'arrete que ce qu'on a soi-meme lance. Decocher une serie validee dix
 * minutes plus tot ne doit pas couper le repos de celle qu'on vient de finir.
 *
 * Le cas `setId` absent n'est pas theorique : une seance deja en cours au
 * moment de la mise a jour porte un chrono enregistre sans cette information.
 * On retombe alors sur l'exercice, qui est la meilleure approximation
 * disponible, car c'etait le seul rattachement qui existait avant.
 */
/**
 * Duree restante affichable, en millisecondes.
 *
 * En pause, le reste est FIGE : lu sur l'etat, pas calcule depuis l'echeance,
 * qui reculerait dans le passe pendant l'arret.
 *
 * Le plafond a la duree totale n'est pas une precaution de confort, il repare
 * un sursaut visible : un chrono relance apres cinq secondes de pause affichait
 * cinq secondes de TROP le temps d'un battement, avant de retomber a sa vraie
 * valeur. L'horloge d'affichage etait restee figee sur l'instant de la mise en
 * pause, et la nouvelle echeance, elle, avait bien avance.
 *
 * Un repos ne peut pas rester plus longtemps qu'il ne dure : au-dela du total,
 * c'est forcement que l'horloge lue est en retard, et le seul chiffre juste est
 * alors le total. Le plafond protege aussi le reveil de veille, ou le meme
 * retard existe le temps que l'ecran se recale.
 */
export function restRemainingMs(timer: RestTimerState | null, now: number): number {
  if (!timer) return 0;
  const remaining = timer.pausedRemainingMs ?? timer.endsAt - now;
  const total = timer.totalSec * 1000;
  return Math.max(0, total > 0 ? Math.min(remaining, total) : remaining);
}

export function restBelongsTo(
  timer: RestTimerState | null,
  entryId: string,
  setId: string,
): boolean {
  if (!timer) return false;
  if (timer.setId !== undefined) return timer.setId === setId;
  return timer.entryId === entryId;
}
