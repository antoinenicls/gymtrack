/**
 * Moteur de surcharge progressive assistee.
 *
 * L'idee : a la fin d'un exercice, regarder si l'athlete a tenu ses series
 * cibles ET a quel cout (RPE). Si c'est passe avec de la marge, on propose de
 * monter la semaine suivante. Sinon on dit de rester, ou de reculer.
 *
 * Le principe directeur est celui de la landing : on ne change qu'une variable
 * a la fois, et on dit toujours QUEL chiffre a declenche la suggestion. Une
 * suggestion sans son motif n'apprend rien a l'athlete et le rend dependant.
 */

import type { WorkoutEntry } from '@/types/domain';
import { workingSets } from './metrics';
import { smallestIncrementKg } from './plates';

export type SuggestionKind = 'charge' | 'reps' | 'maintien' | 'recul' | 'donnees-insuffisantes';

export interface ProgressionSuggestion {
  kind: SuggestionKind;
  /** Phrase courte affichee a l'athlete. */
  message: string;
  /** Le chiffre qui a declenche la decision, toujours explicite. */
  reason: string;
  /** Charge proposee pour la prochaine fois, si applicable. */
  nextWeightKg?: number;
  nextReps?: number;
}

interface ProgressionInput {
  entry: WorkoutEntry;
  /** Nombre de series visees, depuis la routine. Null si seance libre. */
  targetSets: number | null;
  /** Reps visees. Null si seance libre. */
  targetReps: number | null;
  availablePlatesKg?: number[];
  usesBar?: boolean;
}

/** Au-dela, la serie a coute trop cher pour qu'on charge davantage. */
const RPE_COMFORTABLE = 8;
const RPE_TOO_HARD = 9.5;

export function suggestProgression(input: ProgressionInput): ProgressionSuggestion {
  const { entry, targetSets, targetReps, availablePlatesKg, usesBar = true } = input;
  const sets = workingSets(entry);

  if (sets.length === 0) {
    return {
      kind: 'donnees-insuffisantes',
      message: 'Pas encore de série validée sur cet exercice.',
      reason: 'Aucune série effective enregistrée.',
    };
  }

  const rpes = sets.map((s) => s.rpe).filter((r): r is number => r !== null);
  const topWeight = Math.max(...sets.map((s) => s.weightKg ?? 0));
  const minReps = Math.min(...sets.map((s) => s.reps ?? 0));
  const maxRpe = rpes.length > 0 ? Math.max(...rpes) : null;
  const avgRpe = rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;

  // Increment reellement chargeable : inutile de proposer +2.5 kg sur une
  // machine dont le plus petit cran fait 5 kg.
  const increment = usesBar ? smallestIncrementKg(availablePlatesKg) : 2.5;

  const hitAllSets = targetSets === null || sets.length >= targetSets;
  const hitAllReps = targetReps === null || minReps >= targetReps;

  // Sans RPE, on ne peut pas juger le cout de l'effort. On reste factuel
  // plutot que d'inventer une confiance qu'on n'a pas.
  if (maxRpe === null) {
    if (hitAllSets && hitAllReps && targetReps !== null) {
      return {
        kind: 'charge',
        message: `Objectif tenu. Tu peux tenter ${format(topWeight + increment)} kg la prochaine fois.`,
        reason: `${sets.length} séries à ${minReps} reps minimum, cible atteinte. RPE non renseigné, monte prudemment.`,
        nextWeightKg: topWeight + increment,
      };
    }
    return {
      kind: 'maintien',
      message: 'Garde la même charge la prochaine fois.',
      reason: 'RPE non renseigné : sans note d’effort, impossible de dire si tu avais de la marge.',
      nextWeightKg: topWeight,
    };
  }

  // Serie payee trop cher : on recule, meme si les reps sont passees.
  if (maxRpe >= RPE_TOO_HARD) {
    const backoff = Math.max(0, topWeight - increment);
    return {
      kind: 'recul',
      message: `Redescends à ${format(backoff)} kg la prochaine fois.`,
      reason: `RPE ${format(maxRpe)} sur ta série la plus dure : tu es à l’échec ou tout proche, la charge est en avance sur toi.`,
      nextWeightKg: backoff,
    };
  }

  // Le cas nominal du brief : toutes les cibles tenues, RPE <= 8.
  if (hitAllSets && hitAllReps && avgRpe !== null && avgRpe <= RPE_COMFORTABLE) {
    const nextWeight = topWeight + increment;
    return {
      kind: 'charge',
      message: `Objectif validé. Surcharge suggérée : +${format(increment)} kg ou +1 rep.`,
      reason: `${sets.length} séries tenues à RPE ${format(avgRpe)} de moyenne, sous le seuil de ${RPE_COMFORTABLE}. Il te restait de la marge.`,
      nextWeightKg: nextWeight,
      nextReps: targetReps !== null ? targetReps + 1 : minReps + 1,
    };
  }

  // Cibles tenues mais ca a coute cher : on consolide avant de charger.
  if (hitAllSets && hitAllReps) {
    return {
      kind: 'maintien',
      message: 'Refais la même chose la prochaine fois avant de monter.',
      reason: `Cible atteinte mais à RPE ${format(avgRpe ?? 0)}. Consolide cette charge, la marge viendra toute seule.`,
      nextWeightKg: topWeight,
    };
  }

  // Cibles manquees : gagner les reps avant de toucher a la charge.
  if (targetReps !== null && minReps < targetReps) {
    return {
      kind: 'reps',
      message: `Vise ${targetReps} reps sur toutes tes séries avant d’augmenter.`,
      reason: `Ta série la plus faible est tombée à ${minReps} reps pour une cible de ${targetReps}.`,
      nextWeightKg: topWeight,
      nextReps: targetReps,
    };
  }

  return {
    kind: 'maintien',
    message: 'Garde la même charge la prochaine fois.',
    reason:
      targetSets !== null && sets.length < targetSets
        ? `${sets.length} séries validées sur ${targetSets} prévues.`
        : 'Séries complètes, rien qui justifie de changer une variable.',
    nextWeightKg: topWeight,
  };
}

function format(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
}
