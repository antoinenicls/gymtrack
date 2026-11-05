import { describe, expect, it } from 'vitest';
import {
  averageDensity,
  averageDuration,
  dailyStreak,
  dormantExercises,
  exerciseSeries,
  metricValue,
  trainedExercises,
  muscleLoad,
  recentRecords,
  trainingGrid,
  trendPercent,
  weeklyStats,
} from './analytics';
import { makeEntry, makeSet, makeWorkout } from './testFactories';
import type { Exercise, MuscleGroup, PersonalRecord } from '@/types/domain';

/** Mardi 21 juillet 2026, midi. La semaine courante demarre le lundi 20. */
const NOW = new Date('2026-07-21T12:00:00');

const daysBefore = (n: number): number => NOW.getTime() - n * 24 * 60 * 60 * 1000;

function makeExercise(partial: Partial<Exercise> = {}): Exercise {
  return {
    id: 'ex-1',
    name: 'Développé couché',
    muscleGroup: 'pectoraux',
    equipment: 'barre',
    defaultRestSec: 120,
    isCustom: false,
    createdAt: 0,
    ...partial,
  };
}

describe('weeklyStats', () => {
  it('range les seances dans la semaine calendaire qui les contient', () => {
    const weeks = weeklyStats(
      [
        // Lundi 20 juillet : semaine en cours.
        makeWorkout({ startedAt: new Date('2026-07-20T09:00:00').getTime() }),
        // Dimanche 19 juillet : semaine PRECEDENTE, malgre les 2 jours d'ecart.
        makeWorkout({ startedAt: new Date('2026-07-19T09:00:00').getTime() }),
      ],
      2,
      NOW,
    );

    expect(weeks).toHaveLength(2);
    expect(weeks[1]?.isCurrent).toBe(true);
    expect(weeks[1]?.sessions).toBe(1);
    expect(weeks[0]?.sessions).toBe(1);
  });

  it('ignore l’echauffement dans les series, les reps et le volume', () => {
    const [week] = weeklyStats(
      [
        makeWorkout({
          startedAt: NOW.getTime(),
          entries: [
            makeEntry({
              sets: [
                makeSet({ type: 'echauffement', weightKg: 60, reps: 10 }),
                makeSet({ weightKg: 100, reps: 5 }),
              ],
            }),
          ],
        }),
      ],
      1,
      NOW,
    );

    expect(week?.sets).toBe(1);
    expect(week?.reps).toBe(5);
    expect(week?.volume).toBe(500);
  });

  it('ne rend un RPE moyen que s’il a ete renseigne', () => {
    const sansRpe = weeklyStats(
      [
        makeWorkout({
          startedAt: NOW.getTime(),
          entries: [makeEntry({ sets: [makeSet({ rpe: null })] })],
        }),
      ],
      1,
      NOW,
    );
    expect(sansRpe[0]?.avgRpe).toBeNull();

    const avecRpe = weeklyStats(
      [
        makeWorkout({
          startedAt: NOW.getTime(),
          entries: [makeEntry({ sets: [makeSet({ rpe: 7 }), makeSet({ rpe: 9 })] })],
        }),
      ],
      1,
      NOW,
    );
    expect(avecRpe[0]?.avgRpe).toBe(8);
  });

  it('rend une semaine vide plutot que rien quand aucune seance n’a eu lieu', () => {
    const weeks = weeklyStats([], 4, NOW);
    expect(weeks).toHaveLength(4);
    expect(weeks.every((w) => w.sessions === 0 && w.volume === 0)).toBe(true);
  });
});

describe('trendPercent', () => {
  it('compare les moyennes des deux moities', () => {
    expect(trendPercent([10, 10, 20, 20])).toBe(100);
    expect(trendPercent([20, 20, 10, 10])).toBe(-50);
  });

  it('amortit une semaine isolee au lieu de la subir', () => {
    // Derniere valeur nulle : une comparaison premier/dernier dirait -100 %.
    const tendance = trendPercent([10, 10, 10, 10, 20, 0]);
    expect(tendance).not.toBeNull();
    expect(tendance).toBeGreaterThan(-100);
  });

  it('renonce quand la comparaison n’aurait pas de sens', () => {
    expect(trendPercent([1, 2, 3])).toBeNull();
    expect(trendPercent([0, 0, 5, 5])).toBeNull();
  });
});

describe('exerciseSeries', () => {
  const workouts = [
    makeWorkout({
      startedAt: daysBefore(2),
      entries: [makeEntry({ exerciseId: 'ex-1', sets: [makeSet({ weightKg: 100, reps: 5 })] })],
    }),
    makeWorkout({
      startedAt: daysBefore(9),
      entries: [makeEntry({ exerciseId: 'ex-1', sets: [makeSet({ weightKg: 90, reps: 5 })] })],
    }),
  ];

  it('rend un point par seance, du plus ancien au plus recent', () => {
    const series = exerciseSeries(workouts, 'ex-1');
    expect(series.map((s) => s.charge)).toEqual([90, 100]);
  });

  it('ecarte les seances sans serie effective plutot que d’y poser un zero', () => {
    const series = exerciseSeries(
      [
        ...workouts,
        makeWorkout({
          startedAt: daysBefore(1),
          entries: [
            makeEntry({ exerciseId: 'ex-1', sets: [makeSet({ type: 'echauffement' })] }),
          ],
        }),
      ],
      'ex-1',
    );
    expect(series).toHaveLength(2);
  });

  it('lit la metrique demandee', () => {
    const stat = exerciseSeries(workouts, 'ex-1')[1];
    expect(stat).toBeDefined();
    expect(metricValue(stat!, 'charge')).toBe(100);
    expect(metricValue(stat!, 'volume')).toBe(500);
    expect(metricValue(stat!, 'reps')).toBe(5);
  });
});

describe('trainedExercises', () => {
  it('classe par nombre de seances', () => {
    const rows = trainedExercises([
      makeWorkout({ entries: [makeEntry({ exerciseId: 'a' })] }),
      makeWorkout({ entries: [makeEntry({ exerciseId: 'b' })] }),
      makeWorkout({ entries: [makeEntry({ exerciseId: 'b' })] }),
    ]);
    expect(rows[0]?.id).toBe('b');
    expect(rows[0]?.sessions).toBe(2);
  });

  it('retient la seance la plus recente de chaque exercice', () => {
    const rows = trainedExercises([
      makeWorkout({ startedAt: 1000, entries: [makeEntry({ exerciseId: 'a' })] }),
      makeWorkout({ startedAt: 5000, entries: [makeEntry({ exerciseId: 'a' })] }),
      makeWorkout({ startedAt: 3000, entries: [makeEntry({ exerciseId: 'a' })] }),
    ]);
    expect(rows[0]?.lastAt).toBe(5000);
  });

  it('ignore un exercice sans aucune serie effective', () => {
    const rows = trainedExercises([
      makeWorkout({
        entries: [makeEntry({ exerciseId: 'a', sets: [makeSet({ done: false })] })],
      }),
    ]);
    expect(rows).toEqual([]);
  });
});

describe('muscleLoad', () => {
  const groupOf = (id: string): MuscleGroup | undefined =>
    id === 'ex-1' ? 'pectoraux' : id === 'ex-2' ? 'dos' : undefined;

  it('ramene les series au rythme hebdomadaire', () => {
    const load = muscleLoad(
      [
        makeWorkout({
          entries: [
            makeEntry({ exerciseId: 'ex-1', sets: [makeSet(), makeSet(), makeSet(), makeSet()] }),
          ],
        }),
      ],
      groupOf,
      4,
    );

    expect(load[0]?.group).toBe('pectoraux');
    expect(load[0]?.sets).toBe(4);
    expect(load[0]?.setsPerWeek).toBe(1);
  });

  it('ignore un exercice dont le groupe est inconnu', () => {
    const load = muscleLoad(
      [makeWorkout({ entries: [makeEntry({ exerciseId: 'inconnu' })] })],
      groupOf,
      4,
    );
    expect(load).toHaveLength(0);
  });
});

describe('trainingGrid', () => {
  it('rend 7 jours par semaine et marque les jours a venir', () => {
    const grid = trainingGrid([makeWorkout({ startedAt: NOW.getTime() })], 2, NOW);

    expect(grid).toHaveLength(2);
    expect(grid[1]?.days).toHaveLength(7);
    // Mardi : le mercredi et au-dela sont a venir.
    expect(grid[1]?.days[1]?.isFuture).toBe(false);
    expect(grid[1]?.days[2]?.isFuture).toBe(true);
    expect(grid[1]?.days[1]?.count).toBe(1);
  });

  it('compte deux seances le meme jour', () => {
    const grid = trainingGrid(
      [
        makeWorkout({ startedAt: new Date('2026-07-21T08:00:00').getTime() }),
        makeWorkout({ startedAt: new Date('2026-07-21T19:00:00').getTime() }),
      ],
      1,
      NOW,
    );
    expect(grid[0]?.days[1]?.count).toBe(2);
  });
});

describe('dailyStreak', () => {
  it('compte les jours consecutifs en remontant', () => {
    const streak = dailyStreak(
      [
        makeWorkout({ startedAt: daysBefore(0) }),
        makeWorkout({ startedAt: daysBefore(1) }),
        makeWorkout({ startedAt: daysBefore(2) }),
      ],
      NOW,
    );
    expect(streak).toBe(3);
  });

  it('ne casse pas la serie parce que la seance du jour n’a pas encore eu lieu', () => {
    const streak = dailyStreak(
      [makeWorkout({ startedAt: daysBefore(1) }), makeWorkout({ startedAt: daysBefore(2) })],
      NOW,
    );
    expect(streak).toBe(2);
  });

  it('rend zero quand le dernier entrainement est trop ancien', () => {
    expect(dailyStreak([makeWorkout({ startedAt: daysBefore(3) })], NOW)).toBe(0);
  });
});

describe('dormantExercises', () => {
  const exercises = new Map<string, Exercise>([
    ['ex-1', makeExercise({ id: 'ex-1' })],
    ['ex-2', makeExercise({ id: 'ex-2', name: 'Rowing' })],
  ]);

  it('ne retient que les exercices deja pratiques et laisses de cote', () => {
    const dormants = dormantExercises(
      [
        makeWorkout({ startedAt: daysBefore(40), entries: [makeEntry({ exerciseId: 'ex-1' })] }),
        makeWorkout({ startedAt: daysBefore(2), entries: [makeEntry({ exerciseId: 'ex-2' })] }),
      ],
      exercises,
      21,
      NOW.getTime(),
    );

    expect(dormants).toHaveLength(1);
    expect(dormants[0]?.exercise.id).toBe('ex-1');
    expect(dormants[0]?.days).toBe(40);
  });

  it('retient la seance la PLUS RECENTE de l’exercice', () => {
    const dormants = dormantExercises(
      [
        makeWorkout({ startedAt: daysBefore(40), entries: [makeEntry({ exerciseId: 'ex-1' })] }),
        makeWorkout({ startedAt: daysBefore(3), entries: [makeEntry({ exerciseId: 'ex-1' })] }),
      ],
      exercises,
      21,
      NOW.getTime(),
    );
    expect(dormants).toHaveLength(0);
  });
});

describe('recentRecords', () => {
  it('trie tous les records par date, du plus recent au plus ancien', () => {
    const records: PersonalRecord[] = [
      {
        exerciseId: 'ex-1',
        bestE1rm: { value: 120, weightKg: 100, reps: 5, achievedAt: daysBefore(1), workoutId: 'w1' },
        bestWeight: { value: 100, weightKg: 100, reps: 5, achievedAt: daysBefore(9), workoutId: 'w2' },
        bestSessionVolume: null,
      },
    ];

    const rows = recentRecords(records, new Map([['ex-1', makeExercise()]]), 10);
    expect(rows.map((r) => r.kind)).toEqual(['e1rm', 'charge']);
  });

  it('ignore un record dont l’exercice a ete supprime', () => {
    const records: PersonalRecord[] = [
      {
        exerciseId: 'disparu',
        bestE1rm: { value: 1, weightKg: 1, reps: 1, achievedAt: 0, workoutId: 'w' },
        bestWeight: null,
        bestSessionVolume: null,
      },
    ];
    expect(recentRecords(records, new Map(), 10)).toHaveLength(0);
  });
});

describe('densite et duree', () => {
  it('n’utilise que les seances reellement chronometrees', () => {
    const workouts = [
      makeWorkout({
        durationSec: 3600,
        entries: [makeEntry({ sets: [makeSet({ weightKg: 100, reps: 6 })] })],
      }),
      makeWorkout({ durationSec: null }),
    ];

    expect(averageDuration(workouts)).toBe(3600);
    expect(averageDensity(workouts)).toBe(10);
  });

  it('rend null plutot que zero quand rien n’a ete chronometre', () => {
    expect(averageDuration([makeWorkout({ durationSec: null })])).toBeNull();
    expect(averageDensity([makeWorkout({ durationSec: null })])).toBeNull();
  });
});
