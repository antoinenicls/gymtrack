/**
 * Ce qu'un programme dit de lui-meme, lu directement dans ses routines.
 *
 * Les normes passent par des seances fictives (voir plannedWeek) pour suivre
 * exactement les regles de l'historique. Ce qui suit, en revanche, n'existe
 * QUE dans une routine : le repos prescrit, l'effort vise, l'ordre des
 * series. Une seance faite n'enregistre ni le repos reellement pris ni une
 * intention, donc ces analyses n'ont pas de pendant historique.
 *
 * Les reperes ci-dessous ne viennent pas du memo de coach qui fonde norms.ts :
 * ce sont des ordres de grandeur usuels, et l'ecran les presente comme tels.
 */

import type { MuscleGroup, Routine, RoutineItem, RoutineSet } from '@/types/domain';
import { endsDropGroup, plannedSetCount, setGroups } from './dropset';
import type { NormRange } from './norms';
import type { PickedRoutine } from './plannedWeek';
import { isToFailure } from './setTypes';
import { supersetRuns } from './superset';

type GroupOf = (exerciseId: string) => MuscleGroup | undefined;

/* -------------------------------------------------------------------------- */
/* Duree estimee                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Hypotheses de l'estimation.
 *
 * Volontairement simples et affichees comme telles : l'estimation sert a
 * repondre « est-ce que ca tient dans mon creneau », pas a chronometrer.
 */
export const DURATION_ASSUMPTIONS = {
  /** Tempo moyen d'une repetition, descente et montee. */
  secPerRep: 3,
  /** Installation, prise de barre, respiration avant la premiere rep. */
  setupSec: 20,
  /** Reps pretees a une serie prevue sans cible. */
  repsWithoutTarget: 10,
  /** Changer les disques apres un echauffement : on enchaine, sans chrono. */
  afterWarmupSec: 45,
  /** Alleger la barre entre deux paliers d'une degressive. */
  dropStripSec: 15,
} as const;

/**
 * Duree d'une routine, en secondes, si l'on respecte les repos prevus.
 *
 * Suit ce que fait l'app en seance : le chrono part apres chaque serie de
 * travail, avec le repos de l'exercice, sauf apres un echauffement et entre
 * les paliers d'une degressive, ou l'on enchaine. Les supersets suivent la
 * meme regle, puisque l'app ne les traite pas autrement. Seul le repos qui
 * suivrait la toute derniere serie n'est pas compte : la seance est finie.
 */
export function routineDuration(routine: Routine): number {
  const items = [...routine.items].sort((a, b) => a.order - b.order);
  const a = DURATION_ASSUMPTIONS;
  let total = 0;
  let lastPause = 0;

  for (const item of items) {
    item.sets.forEach((set, index) => {
      const reps = set.targetReps && set.targetReps > 0 ? set.targetReps : a.repsWithoutTarget;
      total += a.setupSec + reps * a.secPerRep;

      if (set.type === 'echauffement') lastPause = a.afterWarmupSec;
      else if (!endsDropGroup(item.sets, index)) lastPause = a.dropStripSec;
      else lastPause = Math.max(0, item.restSec);
      total += lastPause;
    });
  }

  return Math.max(0, total - lastPause);
}

export interface RoutineInsight {
  routine: Routine;
  times: number;
  /** Series de travail, une degressive comptant pour une. */
  sets: number;
  durationSec: number;
  /** Series par muscle dans cette routine, du plus charge au moins charge. */
  muscles: Array<{ group: MuscleGroup; sets: number }>;
}

/** Une fiche par routine de la semaine type, dans l'ordre choisi. */
export function routineInsights(picked: PickedRoutine[], groupOf: GroupOf): RoutineInsight[] {
  return picked.map(({ routine, times }) => {
    const perGroup = new Map<MuscleGroup, number>();
    let sets = 0;

    for (const item of routine.items) {
      const count = plannedSetCount(item.sets);
      sets += count;
      const group = groupOf(item.exerciseId);
      if (!group || count === 0) continue;
      perGroup.set(group, (perGroup.get(group) ?? 0) + count);
    }

    return {
      routine,
      times,
      sets,
      durationSec: routineDuration(routine),
      muscles: [...perGroup.entries()]
        .map(([group, n]) => ({ group, sets: n }))
        .sort((x, y) => y.sets - x.sets),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Repos prevu                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Repos minimal conseille entre deux series d'un meme exercice.
 *
 * Une serie lourde demande plus de recuperation pour que la suivante garde sa
 * qualite. Le seuil « lourd » se lit aux reps visees : rien dans le modele ne
 * distingue un polyarticulaire d'une isolation, et le deviner produirait de
 * faux verdicts. Pas de plafond : un repos long ne nuit qu'a la duree, et la
 * carte de duree le montre deja.
 */
export const REST_NORMS = {
  /** En dessous ou egal, la serie est lourde. */
  heavyMaxReps: 6,
  heavyMinSec: 120,
  otherMinSec: 60,
} as const;

export interface RestRow {
  routineName: string;
  exerciseId: string;
  restSec: number;
  heavy: boolean;
  minSec: number;
}

export interface RestReview {
  /** Exercices juges, chaque routine comptee une fois. */
  judged: RestRow[];
  /** Ceux dont le repos est sous le minimum. */
  short: RestRow[];
  /** Exercices en superset, laisses de cote. */
  inSuperset: number;
}

/**
 * Repos prescrits, exercice par exercice.
 *
 * Deux cas sont ecartes. Un exercice a une seule serie de travail : le repos
 * qui le suit n'est qu'un changement d'exercice. Un superset : on y enchaine
 * volontairement, et le temps passe sur l'autre exercice compte comme repos,
 * ce que la seule valeur prescrite ne dit pas.
 */
export function restReview(picked: PickedRoutine[]): RestReview {
  const judged: RestRow[] = [];
  let inSuperset = 0;

  for (const { routine } of picked) {
    const items = [...routine.items].sort((a, b) => a.order - b.order);
    for (const run of supersetRuns(items)) {
      for (const item of run) {
        if (plannedSetCount(item.sets) < 2) continue;
        if (run.length > 1) {
          inSuperset += 1;
          continue;
        }
        const heavy = isHeavy(item);
        judged.push({
          routineName: routine.name,
          exerciseId: item.exerciseId,
          restSec: item.restSec,
          heavy,
          minSec: heavy ? REST_NORMS.heavyMinSec : REST_NORMS.otherMinSec,
        });
      }
    }
  }

  return { judged, short: judged.filter((row) => row.restSec < row.minSec), inSuperset };
}

function isHeavy(item: RoutineItem): boolean {
  return item.sets.some(
    (set) =>
      set.type !== 'echauffement' &&
      set.targetReps !== null &&
      set.targetReps > 0 &&
      set.targetReps <= REST_NORMS.heavyMaxReps,
  );
}

/* -------------------------------------------------------------------------- */
/* Intensite prevue                                                            */
/* -------------------------------------------------------------------------- */

export interface PlannedEffort {
  /** Series de travail de la semaine, une degressive comptant pour une. */
  total: number;
  /** Menees a l'echec, ou visees a RPE 10. */
  failure: number;
  /** RPE 9 a 9,5 : une repetition en reserve, ou moins. */
  near: number;
  /** RPE 7 a 8,5. */
  moderate: number;
  /** Sous RPE 7. */
  light: number;
  /** Ni echec ni effort vise. */
  unspecified: number;
  /** Degressives (une descente comptant pour une). */
  drops: number;
  /** Series myo-reps. */
  myo: number;
}

/**
 * Effort vise sur les series de travail de la semaine.
 *
 * Une degressive est jugee sur son palier le plus dur : c'est lui qui dit
 * jusqu'ou la descente va. Une serie marquee a l'echec y est rangee quel que
 * soit le RPE qu'elle porte par ailleurs.
 */
export function plannedEffort(picked: PickedRoutine[]): PlannedEffort {
  const effort: PlannedEffort = {
    total: 0,
    failure: 0,
    near: 0,
    moderate: 0,
    light: 0,
    unspecified: 0,
    drops: 0,
    myo: 0,
  };

  for (const { routine, times } of picked) {
    for (const item of routine.items) {
      for (const group of setGroups(item.sets)) {
        const working = group.filter((set) => set.type !== 'echauffement');
        if (working.length === 0) continue;

        effort.total += times;
        effort[bucket(working)] += times;
        if (working.some((set) => set.type === 'drop')) effort.drops += times;
        if (working.some((set) => set.type === 'myo')) effort.myo += times;
      }
    }
  }

  return effort;
}

function bucket(sets: RoutineSet[]): 'failure' | 'near' | 'moderate' | 'light' | 'unspecified' {
  if (sets.some(isToFailure)) return 'failure';
  const rpes = sets.map((set) => set.targetRpe).filter((rpe): rpe is number => rpe !== null);
  if (rpes.length === 0) return 'unspecified';
  const rpe = Math.max(...rpes);
  if (rpe >= 10) return 'failure';
  if (rpe >= 9) return 'near';
  if (rpe >= 7) return 'moderate';
  return 'light';
}

/* -------------------------------------------------------------------------- */
/* Equilibres                                                                  */
/* -------------------------------------------------------------------------- */

export interface BalanceDef {
  id: string;
  label: string;
  left: { label: string; groups: MuscleGroup[] };
  right: { label: string; groups: MuscleGroup[] };
  /**
   * Zone du rapport gauche / droite. Absente : le rapport est mesure sans
   * verdict, faute de repere qui tienne pour tout le monde.
   */
  range?: NormRange;
  /** Ce que veut dire un rapport sous la zone, puis au-dessus. */
  belowAdvice?: string;
  aboveAdvice?: string;
}

/**
 * Paires comparees.
 *
 * Chaque exercice compte en entier pour son groupe principal, comme partout
 * dans l'app : les epaules sont donc rangees cote poussee, ce qui est vrai
 * des developpes et des elevations, mais pas de l'oiseau ou du face pull.
 */
export const BALANCES: BalanceDef[] = [
  {
    id: 'tirage-poussee',
    label: 'Tirage / poussée',
    left: { label: 'Tirage', groups: ['dos', 'biceps'] },
    right: { label: 'Poussée', groups: ['pectoraux', 'epaules', 'triceps'] },
    // Au moins autant de tirage que de poussee, c'est le conseil le plus
    // repandu pour la sante des epaules.
    range: { from: 0.9, to: 1.5 },
    belowAdvice:
      'La poussée domine. Les épaules se portent en général mieux avec au moins autant de tirage.',
    aboveAdvice: 'Le tirage domine nettement : la poussée est en retrait.',
  },
  {
    id: 'arriere-avant-jambe',
    label: 'Arrière / avant de la jambe',
    left: { label: 'Ischios, fessiers', groups: ['ischios', 'fessiers'] },
    right: { label: 'Quadriceps', groups: ['quadriceps'] },
    range: { from: 0.6, to: 1.5 },
    belowAdvice: 'Les quadriceps dominent : l’arrière de la jambe est en retrait.',
    aboveAdvice: 'L’arrière de la jambe domine nettement : les quadriceps sont en retrait.',
  },
  {
    id: 'haut-bas',
    label: 'Haut / bas du corps',
    left: { label: 'Haut', groups: ['pectoraux', 'dos', 'epaules', 'biceps', 'triceps', 'avant-bras'] },
    right: { label: 'Bas', groups: ['quadriceps', 'ischios', 'fessiers', 'mollets'] },
  },
];

export interface BalanceRow {
  def: BalanceDef;
  left: number;
  right: number;
  /** Gauche / droite. Null si le cote droit est vide. */
  ratio: number | null;
}

/** Les paires, a partir des series hebdomadaires par muscle. */
export function muscleBalances(
  setsPerWeek: Array<{ group: MuscleGroup; setsPerWeek: number }>,
): BalanceRow[] {
  const sum = (groups: MuscleGroup[]): number =>
    round1(
      setsPerWeek
        .filter((row) => groups.includes(row.group))
        .reduce((total, row) => total + row.setsPerWeek, 0),
    );

  return BALANCES.map((def) => {
    const left = sum(def.left.groups);
    const right = sum(def.right.groups);
    return { def, left, right, ratio: right > 0 ? Math.round((left / right) * 100) / 100 : null };
  }).filter((row) => row.left + row.right > 0);
}

/* -------------------------------------------------------------------------- */
/* Exercices par muscle                                                        */
/* -------------------------------------------------------------------------- */

/** Mouvements distincts de la semaine type pour chaque muscle, dans l'ordre d'apparition. */
export function exercisesByMuscle(
  picked: PickedRoutine[],
  groupOf: GroupOf,
): Map<MuscleGroup, string[]> {
  const result = new Map<MuscleGroup, string[]>();
  for (const { routine } of picked) {
    for (const item of [...routine.items].sort((a, b) => a.order - b.order)) {
      const group = groupOf(item.exerciseId);
      if (!group || plannedSetCount(item.sets) === 0) continue;
      const list = result.get(group) ?? [];
      if (!list.includes(item.exerciseId)) list.push(item.exerciseId);
      result.set(group, list);
    }
  }
  return result;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
