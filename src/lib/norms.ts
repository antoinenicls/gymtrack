/**
 * Confrontation de l'entrainement reel aux normes de programmation.
 *
 * Les fourchettes viennent d'un memo de coach fourni par l'utilisateur. Elles
 * sont des ORDRES DE GRANDEUR et le vocabulaire de l'ecran doit le rester :
 * « sous la zone » et non « faux ». Un mollet a 4 series par semaine n'est un
 * probleme que si les mollets comptent pour celui qui s'entraine.
 *
 * Le NOMBRE DE REPS n'est volontairement pas juge : la fourchette du memo
 * depend de qui s'entraine (4-10 ou 10-15). On affiche la repartition en
 * signalant 4-10 comme zone visee, sans compter de faute.
 *
 * Le REPOS du memo n'est pas traite du tout, et ne peut pas l'etre : rien
 * n'enregistre le repos reellement pris. L'ecart entre deux `completedAt`
 * vaudrait repos PLUS execution de la seconde serie, donc toute comparaison
 * declarerait conforme un athlete qui ne l'est pas.
 */

import type { MuscleGroup, Workout } from '@/types/domain';
import { entryWorkingSetCount, workingSets } from './metrics';

export interface NormRange {
  from: number;
  to: number;
}

export const NORMS = {
  /** Series effectives par groupe musculaire et par semaine. */
  setsPerMuscleWeek: { from: 6, to: 12 } as NormRange,
  /** Series effectives sur un meme muscle dans une seule seance. */
  setsPerMuscleSession: { from: 2, to: 6 } as NormRange,
  /** Series effectives d'une seance, tous muscles confondus. */
  setsPerSession: { from: 8, to: 18 } as NormRange,
  /** Passages hebdomadaires sur un meme muscle. */
  muscleFrequency: { from: 2, to: 3 } as NormRange,
  /** Zone de reps visee, affichee sans verdict. */
  reps: { from: 4, to: 10 } as NormRange,
} as const;

export type NormState = 'dessous' | 'dans' | 'dessus';

export function stateOf(value: number, range: NormRange): NormState {
  if (value < range.from) return 'dessous';
  if (value > range.to) return 'dessus';
  return 'dans';
}

/* -------------------------------------------------------------------------- */
/* Volume                                                                      */
/* -------------------------------------------------------------------------- */

/** Series effectives de chaque seance, dans l'ordre chronologique. */
export function sessionSetCounts(workouts: Workout[]): number[] {
  return workouts
    .map((workout) => workout.entries.reduce((sum, e) => sum + entryWorkingSetCount(e), 0))
    .filter((count) => count > 0);
}

export interface MuscleNormRow {
  group: MuscleGroup;
  /** Series par semaine sur la fenetre analysee. */
  setsPerWeek: number;
  /** Passages par semaine : des JOURS distincts, pas des seances. */
  sessionsPerWeek: number;
  /** Series moyennes sur ce muscle quand il est travaille. */
  setsPerSession: number;
}

/**
 * Une ligne par muscle travaille, portant les trois normes qui le concernent.
 *
 * La frequence compte des JOURS distincts et non des seances : s'entrainer
 * matin et soir le meme jour n'est pas revenir deux fois dans la semaine, et
 * la norme parle bien de repartition dans la semaine.
 */
export function muscleNorms(
  workouts: Workout[],
  groupOf: (exerciseId: string) => MuscleGroup | undefined,
  weekCount: number,
): MuscleNormRow[] {
  const totals = new Map<MuscleGroup, { sets: number; days: Set<string>; sessions: number }>();

  for (const workout of workouts) {
    const day = new Date(workout.startedAt).toISOString().slice(0, 10);
    /** Series du muscle dans CETTE seance, pour la norme par seance. */
    const perGroup = new Map<MuscleGroup, number>();

    for (const entry of workout.entries) {
      const group = groupOf(entry.exerciseId);
      if (!group) continue;
      const sets = entryWorkingSetCount(entry);
      if (sets === 0) continue;
      perGroup.set(group, (perGroup.get(group) ?? 0) + sets);
    }

    for (const [group, sets] of perGroup) {
      const current = totals.get(group) ?? { sets: 0, days: new Set<string>(), sessions: 0 };
      current.sets += sets;
      current.days.add(day);
      current.sessions += 1;
      totals.set(group, current);
    }
  }

  const weeks = Math.max(1, weekCount);
  return [...totals.entries()]
    .map(([group, { sets, days, sessions }]) => ({
      group,
      setsPerWeek: round1(sets / weeks),
      sessionsPerWeek: round1(days.size / weeks),
      setsPerSession: round1(sets / Math.max(1, sessions)),
    }))
    .sort((a, b) => b.setsPerWeek - a.setsPerWeek);
}

/* -------------------------------------------------------------------------- */
/* Repetitions                                                                 */
/* -------------------------------------------------------------------------- */

export interface RepsSpread {
  below: number;
  inZone: number;
  above: number;
  total: number;
}

/** Repartition des series effectives autour de la zone visee. */
export function repsSpread(workouts: Workout[]): RepsSpread {
  const spread = emptySpread();

  for (const workout of workouts) {
    for (const entry of workout.entries) {
      for (const set of workingSets(entry)) addToSpread(spread, set.reps ?? 0);
    }
  }

  return spread;
}

export function emptySpread(): RepsSpread {
  return { below: 0, inZone: 0, above: 0, total: 0 };
}

/** Range une serie dans sa tranche. Partage avec la semaine prevue. */
export function addToSpread(spread: RepsSpread, reps: number): void {
  spread.total += 1;
  if (reps < NORMS.reps.from) spread.below += 1;
  else if (reps > NORMS.reps.to) spread.above += 1;
  else spread.inZone += 1;
}

/* -------------------------------------------------------------------------- */
/* Format                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Format conseille pour un rythme hebdomadaire donne.
 *
 * On ne DEDUIT pas le format pratique : rien dans le modele ne distingue un
 * full body d'un upper/lower, et le deviner a partir des muscles touches
 * produirait des faux verdicts des qu'une seance sort de la routine. On se
 * contente donc de rappeler ce que le rythme constate appelle.
 */
export function formatAdvice(sessionsPerWeek: number): string {
  const rounded = Math.round(sessionsPerWeek);
  if (rounded <= 1) return 'Trop peu de séances pour qu’un format ait du sens.';
  if (rounded <= 3) return 'À ce rythme, le full body couvre chaque muscle assez souvent.';
  if (rounded === 4) return 'À ce rythme, le upper / lower tombe juste.';
  if (rounded === 5) return 'À ce rythme, un push pull legs complété d’un upper / lower convient.';
  return 'Au-delà de cinq séances, le rythme pèse plus sur la récupération qu’il ne rapporte.';
}

/* -------------------------------------------------------------------------- */

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

