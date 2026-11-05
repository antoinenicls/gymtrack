import { describe, expect, it } from 'vitest';
import type { MuscleGroup } from '@/types/domain';
import { makeEntry, makeSet, makeWorkout } from './testFactories';
import {
  NORMS,
  formatAdvice,
  muscleNorms,
  repsSpread,
  sessionSetCounts,
  stateOf,
} from './norms';

const GROUPS: Record<string, MuscleGroup> = {
  'ex-pec': 'pectoraux',
  'ex-dos': 'dos',
  'ex-quad': 'quadriceps',
};
const groupOf = (id: string): MuscleGroup | undefined => GROUPS[id];

describe('stateOf', () => {
  it('situe une valeur par rapport a la zone, bornes comprises', () => {
    expect(stateOf(5, NORMS.setsPerMuscleWeek)).toBe('dessous');
    expect(stateOf(6, NORMS.setsPerMuscleWeek)).toBe('dans');
    expect(stateOf(12, NORMS.setsPerMuscleWeek)).toBe('dans');
    expect(stateOf(13, NORMS.setsPerMuscleWeek)).toBe('dessus');
  });
});

describe('sessionSetCounts', () => {
  it('ne compte que les series effectives', () => {
    const workout = makeWorkout({
      entries: [
        makeEntry({
          sets: [makeSet(), makeSet(), makeSet({ type: 'echauffement' }), makeSet({ done: false })],
        }),
      ],
    });
    expect(sessionSetCounts([workout])).toEqual([2]);
  });

  it('ecarte les seances sans aucune serie validee', () => {
    const vide = makeWorkout({ entries: [makeEntry({ sets: [makeSet({ done: false })] })] });
    expect(sessionSetCounts([vide])).toEqual([]);
  });
});

describe('muscleNorms', () => {
  it('additionne les series d’un meme muscle reparties sur plusieurs exercices', () => {
    const workout = makeWorkout({
      entries: [
        makeEntry({ exerciseId: 'ex-pec', sets: [makeSet(), makeSet()] }),
        makeEntry({ exerciseId: 'ex-pec', sets: [makeSet()] }),
      ],
    });

    const rows = muscleNorms([workout], groupOf, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.setsPerWeek).toBe(3);
    expect(rows[0]?.setsPerSession).toBe(3);
  });

  it('compte des JOURS distincts et non des seances', () => {
    // Matin et soir le meme jour : un seul passage dans la semaine.
    const matin = makeWorkout({
      startedAt: Date.parse('2026-07-20T08:00:00Z'),
      entries: [makeEntry({ exerciseId: 'ex-dos' })],
    });
    const soir = makeWorkout({
      startedAt: Date.parse('2026-07-20T19:00:00Z'),
      entries: [makeEntry({ exerciseId: 'ex-dos' })],
    });

    expect(muscleNorms([matin, soir], groupOf, 1)[0]?.sessionsPerWeek).toBe(1);
  });

  it('ramene la frequence a la semaine sur une fenetre plus longue', () => {
    const workouts = ['2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27'].map((day) =>
      makeWorkout({
        startedAt: Date.parse(`${day}T10:00:00Z`),
        entries: [makeEntry({ exerciseId: 'ex-quad' })],
      }),
    );

    expect(muscleNorms(workouts, groupOf, 4)[0]?.sessionsPerWeek).toBe(1);
  });

  it('ignore les exercices dont le groupe est inconnu', () => {
    const workout = makeWorkout({ entries: [makeEntry({ exerciseId: 'ex-supprime' })] });
    expect(muscleNorms([workout], groupOf, 1)).toEqual([]);
  });
});

describe('repsSpread', () => {
  it('range chaque serie effective autour de la zone visee', () => {
    const workout = makeWorkout({
      entries: [
        makeEntry({
          sets: [
            makeSet({ reps: 3 }),
            makeSet({ reps: 4 }),
            makeSet({ reps: 10 }),
            makeSet({ reps: 12 }),
            makeSet({ reps: 8, type: 'echauffement' }),
          ],
        }),
      ],
    });

    expect(repsSpread([workout])).toEqual({ below: 1, inZone: 2, above: 1, total: 4 });
  });
});

describe('formatAdvice', () => {
  it('associe un format au rythme constate', () => {
    expect(formatAdvice(3)).toMatch(/full body/);
    expect(formatAdvice(4)).toMatch(/upper/);
    expect(formatAdvice(5)).toMatch(/push pull legs/);
    expect(formatAdvice(6.4)).toMatch(/récupération/);
  });
});
