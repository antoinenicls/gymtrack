import { describe, expect, it } from 'vitest';
import type { MuscleGroup, Routine, RoutineItem, RoutineSet } from '@/types/domain';
import { absentGroups } from './norms';
import {
  DURATION_ASSUMPTIONS as A,
  exercisesByMuscle,
  muscleBalances,
  plannedEffort,
  restReview,
  routineDuration,
  routineInsights,
} from './programInsights';

let counter = 0;
const nextId = () => `pi-${++counter}`;

function set(partial: Partial<RoutineSet> = {}): RoutineSet {
  return { id: nextId(), type: 'normale', targetWeightKg: 60, targetReps: 8, targetRpe: null, ...partial };
}

function item(exerciseId: string, sets: RoutineSet[], partial: Partial<RoutineItem> = {}): RoutineItem {
  return { id: nextId(), exerciseId, sets, restSec: 120, supersetGroup: null, notes: '', order: 0, ...partial };
}

function routine(id: string, items: RoutineItem[]): Routine {
  return { id, name: id, folderId: null, items, createdAt: 0, updatedAt: 0, lastPerformedAt: null };
}

const GROUPS: Record<string, MuscleGroup> = { pec: 'pectoraux', dos: 'dos', tri: 'triceps', quad: 'quadriceps' };
const groupOf = (id: string): MuscleGroup | undefined => GROUPS[id];

const setSec = (reps: number) => A.setupSec + reps * A.secPerRep;

describe('routineDuration', () => {
  it('compte execution et repos, sans le repos apres la derniere serie', () => {
    const r = routine('r', [item('pec', [set(), set(), set()])]);
    expect(routineDuration(r)).toBe(3 * setSec(8) + 2 * 120);
  });

  it('enchaine apres un echauffement et entre les paliers d une degressive', () => {
    const r = routine('r', [
      item('pec', [
        set({ type: 'echauffement', targetReps: 10 }),
        set(),
        set({ type: 'drop' }),
        set({ type: 'drop', targetReps: 6 }),
      ]),
    ]);
    expect(routineDuration(r)).toBe(
      setSec(10) + A.afterWarmupSec + setSec(8) + 120 + setSec(8) + A.dropStripSec + setSec(6),
    );
  });

  it('prete des reps a une serie sans cible', () => {
    const r = routine('r', [item('pec', [set({ targetReps: null })])]);
    expect(routineDuration(r)).toBe(setSec(A.repsWithoutTarget));
  });
});

describe('routineInsights', () => {
  it('detaille series et muscles de chaque routine', () => {
    const r = routine('push', [
      item('pec', [set({ type: 'echauffement' }), set(), set(), set()]),
      item('tri', [set(), set()], { order: 1 }),
      item('inconnu', [set()], { order: 2 }),
    ]);
    const [insight] = routineInsights([{ routine: r, times: 2 }], groupOf);
    expect(insight).toMatchObject({ times: 2, sets: 6 });
    expect(insight?.muscles).toEqual([
      { group: 'pectoraux', sets: 3 },
      { group: 'triceps', sets: 2 },
    ]);
  });
});

describe('restReview', () => {
  it('exige plus de repos sur une serie lourde', () => {
    const r = routine('r', [
      item('pec', [set({ targetReps: 5 }), set({ targetReps: 5 })], { restSec: 90 }),
      item('dos', [set({ targetReps: 12 }), set({ targetReps: 12 })], { restSec: 90, order: 1 }),
    ]);
    const review = restReview([{ routine: r, times: 1 }]);
    expect(review.judged).toHaveLength(2);
    expect(review.short).toEqual([
      expect.objectContaining({ exerciseId: 'pec', heavy: true, restSec: 90, minSec: 120 }),
    ]);
  });

  it('laisse de cote les supersets et les exercices a une seule serie', () => {
    const r = routine('r', [
      item('pec', [set(), set()], { restSec: 0, supersetGroup: 'a', order: 0 }),
      item('dos', [set(), set()], { restSec: 30, supersetGroup: 'a', order: 1 }),
      item('tri', [set()], { restSec: 0, order: 2 }),
    ]);
    const review = restReview([{ routine: r, times: 1 }]);
    expect(review).toEqual({ judged: [], short: [], inSuperset: 2 });
  });
});

describe('plannedEffort', () => {
  it('range chaque serie de travail selon l effort vise, routine repetee comprise', () => {
    const r = routine('r', [
      item('pec', [
        set({ type: 'echauffement', targetRpe: 5 }),
        set({ targetRpe: 8 }),
        set({ targetRpe: 9 }),
        set({ toFailure: true, targetRpe: 8 }),
        set({ type: 'drop', targetRpe: 9 }),
        set({ type: 'drop', targetRpe: 10 }),
        set({ type: 'myo' }),
      ]),
    ]);
    expect(plannedEffort([{ routine: r, times: 2 }])).toEqual({
      total: 10,
      failure: 4,
      near: 2,
      moderate: 2,
      light: 0,
      unspecified: 2,
      drops: 2,
      myo: 2,
    });
  });
});

describe('muscleBalances', () => {
  it('compare tirage et poussee, et ecarte une paire vide', () => {
    const rows = muscleBalances([
      { group: 'dos', setsPerWeek: 10 },
      { group: 'pectoraux', setsPerWeek: 8 },
      { group: 'triceps', setsPerWeek: 4 },
    ]);
    expect(rows.map((row) => row.def.id)).toEqual(['tirage-poussee', 'haut-bas']);
    expect(rows[0]).toMatchObject({ left: 10, right: 12, ratio: 0.83 });
    expect(rows[1]).toMatchObject({ left: 22, right: 0, ratio: null });
  });
});

describe('exercisesByMuscle', () => {
  it('liste les mouvements distincts de chaque muscle', () => {
    const a = routine('a', [item('pec', [set()]), item('tri', [set()], { order: 1 })]);
    const b = routine('b', [item('pec', [set()])]);
    const map = exercisesByMuscle(
      [
        { routine: a, times: 1 },
        { routine: b, times: 1 },
      ],
      groupOf,
    );
    expect(map.get('pectoraux')).toEqual(['pec']);
    expect(map.get('triceps')).toEqual(['tri']);
  });
});

describe('absentGroups', () => {
  it('nomme les muscles surveilles sans aucune serie, ni cardio ni avant-bras', () => {
    const absent = absentGroups(['pectoraux', 'dos', 'epaules', 'biceps', 'triceps', 'quadriceps']);
    expect(absent).toEqual(['ischios', 'fessiers', 'mollets', 'abdominaux']);
  });
});
