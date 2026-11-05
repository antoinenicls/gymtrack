/**
 * Semaine PREVUE : les routines d'un programme, lues comme une semaine faite.
 *
 * L'historique melange tout ce qui a ete fait sur la fenetre, ancien programme
 * compris : juste apres un changement, les normes jugent un hybride qui ne
 * ressemble a aucun des deux. Ici on juge le programme lui-meme, avant meme de
 * l'avoir suivi.
 *
 * Plutot que de dupliquer les calculs de normes, on transforme les routines en
 * seances fictives et on les passe aux memes fonctions : les deux modes de
 * l'ecran suivent ainsi exactement les memes regles de comptage (echauffement
 * ecarte, degressive comptee pour une).
 */

import type { PlanPick, Routine, RoutineSet, Workout, WorkoutSet } from '@/types/domain';
import { plannedSetCount } from './dropset';
import { addToSpread, emptySpread, type RepsSpread } from './norms';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Debut arbitraire de la semaine fictive.
 *
 * Seule compte la difference entre deux seances : chacune tombe sur son
 * propre jour, sinon la frequence par muscle, qui compte des jours distincts,
 * verrait une seule journee dans tout le programme.
 */
const ORIGIN = Date.UTC(2000, 0, 3);

/**
 * Repetitions pretees a une serie prevue sans cible.
 *
 * Une serie sans reps visees reste une serie du programme et doit peser dans
 * les volumes : les calculs ecartent toute serie a 0 rep. Ce chiffre ne sert
 * qu'a la faire compter ; la repartition des reps, elle, lit les routines et
 * laisse ces series de cote (voir `plannedReps`).
 */
const COUNTED_WITHOUT_TARGET = 1;

/** Les seances de la semaine type, une par passage prevu. */
export function plannedWeek(routines: Routine[], picks: PlanPick[]): Workout[] {
  const workouts: Workout[] = [];

  for (const { routine, times } of resolve(routines, picks)) {
    for (let n = 0; n < times; n++) {
      const startedAt = ORIGIN + workouts.length * DAY;
      workouts.push({
        id: `plan-${routine.id}-${n}`,
        name: routine.name,
        routineId: routine.id,
        startedAt,
        endedAt: startedAt,
        notes: '',
        durationSec: null,
        entries: routine.items.map((item) => ({
          id: item.id,
          exerciseId: item.exerciseId,
          sets: item.sets.map(toPerformed),
          notes: '',
          restSec: item.restSec,
          supersetGroup: item.supersetGroup,
          order: item.order,
        })),
      });
    }
  }

  return workouts;
}

export interface PlannedReps {
  spread: RepsSpread;
  /** Series de travail prevues sans reps visees, absentes de la repartition. */
  unknown: number;
}

/** Repartition des reps VISEES, chaque routine comptee autant qu'elle revient. */
export function plannedReps(routines: Routine[], picks: PlanPick[]): PlannedReps {
  const spread = emptySpread();
  let unknown = 0;

  for (const { routine, times } of resolve(routines, picks)) {
    for (const item of routine.items) {
      for (const set of item.sets) {
        if (set.type === 'echauffement') continue;
        for (let n = 0; n < times; n++) {
          if (hasTarget(set)) addToSpread(spread, set.targetReps as number);
          else unknown += 1;
        }
      }
    }
  }

  return { spread, unknown };
}

/** Nombre de seances de la semaine type. */
export function plannedSessions(routines: Routine[], picks: PlanPick[]): number {
  return resolve(routines, picks).reduce((sum, { times }) => sum + times, 0);
}

/** Series de travail d'une routine, une degressive comptant pour une. */
export function routineSetCount(routine: Routine): number {
  return routine.items.reduce((sum, item) => sum + plannedSetCount(item.sets), 0);
}

/* -------------------------------------------------------------------------- */

/**
 * Choix encore valables.
 *
 * Une routine supprimee depuis reste dans les reglages ; on l'ignore ici
 * plutot que de nettoyer les reglages en douce, ce qui suffit puisqu'elle ne
 * reviendra jamais.
 */
function resolve(routines: Routine[], picks: PlanPick[]): Array<{ routine: Routine; times: number }> {
  const byId = new Map(routines.map((routine) => [routine.id, routine]));
  return picks.flatMap((pick) => {
    const routine = byId.get(pick.routineId);
    return routine && pick.times > 0 ? [{ routine, times: pick.times }] : [];
  });
}

function hasTarget(set: RoutineSet): boolean {
  return set.targetReps !== null && set.targetReps > 0;
}

function toPerformed(set: RoutineSet): WorkoutSet {
  return {
    id: set.id,
    type: set.type,
    // Le tonnage n'est pas lu en mode programme ; une charge absente ne doit
    // simplement pas faire disparaitre la serie des comptes.
    weightKg: set.targetWeightKg ?? 0,
    reps: hasTarget(set) ? set.targetReps : COUNTED_WITHOUT_TARGET,
    rpe: set.targetRpe,
    done: true,
    toFailure: set.toFailure,
    dropStart: set.dropStart,
  };
}
