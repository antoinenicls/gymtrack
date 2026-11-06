import { describe, expect, it } from 'vitest';
import {
  bucketByWeek,
  daysTrainedThisWeek,
  goalStreak,
  startOfWeek,
  weekStreak,
} from './weekly';

/** Mercredi 15 juillet 2026, midi. */
const NOW = new Date(2026, 6, 15, 12, 0, 0);

describe('startOfWeek', () => {
  it('remonte au lundi, pas au dimanche', () => {
    const monday = startOfWeek(NOW);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(13);
    expect(monday.getHours()).toBe(0);
  });

  it('garde le dimanche dans la semaine qui s’achève', () => {
    // Le piege classique : avec getDay() brut, ce dimanche basculerait dans
    // la semaine suivante et fausserait l'atteinte de l'objectif.
    const sunday = new Date(2026, 6, 19, 20, 0, 0);
    expect(startOfWeek(sunday).getDate()).toBe(13);
  });
});

describe('bucketByWeek', () => {
  it('range les séances dans la bonne semaine', () => {
    const sessions = [
      new Date(2026, 6, 13, 9).getTime(), // lundi, semaine en cours
      new Date(2026, 6, 15, 9).getTime(), // mercredi, semaine en cours
      new Date(2026, 6, 8, 9).getTime(), // semaine précédente
    ];

    const weeks = bucketByWeek(sessions, 4, NOW);

    expect(weeks).toHaveLength(4);
    expect(weeks[3]?.count).toBe(2);
    expect(weeks[3]?.isCurrent).toBe(true);
    expect(weeks[2]?.count).toBe(1);
    expect(weeks[0]?.count).toBe(0);
  });

  it('ignore ce qui déborde de la fenêtre', () => {
    const old = new Date(2025, 0, 1).getTime();
    const weeks = bucketByWeek([old], 4, NOW);
    expect(weeks.every((w) => w.count === 0)).toBe(true);
  });
});

describe('goalStreak', () => {
  const build = (counts: number[]) =>
    counts.map((count, i) => ({
      start: i,
      end: i,
      count,
      label: `S${i}`,
      isCurrent: i === counts.length - 1,
    }));

  it('compte les semaines consécutives atteintes', () => {
    expect(goalStreak(build([3, 3, 3, 3]), 3)).toBe(4);
  });

  it('s’arrête à la première semaine manquée', () => {
    expect(goalStreak(build([3, 1, 3, 3]), 3)).toBe(2);
  });

  it('ne casse pas la série sur une semaine en cours inachevée', () => {
    // Un mardi matin, la semaine courante est forcement incomplete : annoncer
    // une serie rompue serait absurde.
    expect(goalStreak(build([3, 3, 3, 0]), 3)).toBe(3);
  });

  it('compte la semaine en cours si elle est déjà atteinte', () => {
    expect(goalStreak(build([3, 3, 3, 4]), 3)).toBe(4);
  });

  it('renvoie zéro sans objectif défini', () => {
    expect(goalStreak(build([5, 5]), 0)).toBe(0);
  });
});

describe('daysTrainedThisWeek', () => {
  it('marque les jours entraînés, lundi en premier', () => {
    const days = daysTrainedThisWeek(
      [new Date(2026, 6, 13, 8).getTime(), new Date(2026, 6, 15, 19).getTime()],
      NOW,
    );
    expect(days).toEqual([true, false, true, false, false, false, false]);
  });

  it('ignore les séances hors de la semaine', () => {
    expect(daysTrainedThisWeek([new Date(2026, 6, 1).getTime()], NOW)).toEqual(
      Array.from({ length: 7 }, () => false),
    );
  });
});

describe('weekStreak', () => {
  /** Une seance le lundi `weeksAgo` semaines avant la semaine de NOW. */
  const monday = (weeksAgo: number, hour = 9): number =>
    new Date(2026, 6, 13 - weeksAgo * 7, hour).getTime();

  it('remonte tout l’historique, au-delà des huit semaines du graphique', () => {
    const sessions = Array.from({ length: 12 }, (_, i) => [monday(i), monday(i, 18)]).flat();
    const streak = weekStreak(sessions, 2, NOW);
    expect(streak.current).toBe(12);
    expect(streak.best).toBe(12);
    expect(streak.thisWeekDone).toBe(true);
  });

  it('garde la flamme en vie une semaine en cours pas encore tenue', () => {
    const streak = weekStreak([monday(1), monday(2), monday(3)], 1, new Date(2026, 6, 13, 7));
    expect(streak.current).toBe(3);
    expect(streak.thisWeekDone).toBe(false);
    expect(streak.remaining).toBe(1);
  });

  it('s’éteint quand une semaine passée a été manquée', () => {
    const streak = weekStreak([monday(2), monday(3), monday(4)], 1, NOW);
    expect(streak.current).toBe(0);
    expect(streak.best).toBe(3);
  });

  it('sans objectif, une séance suffit à tenir la semaine', () => {
    const streak = weekStreak([monday(0), monday(1)], 0, NOW);
    expect(streak.target).toBe(1);
    expect(streak.current).toBe(2);
  });

  it('ne compte pas une semaine sous l’objectif', () => {
    const streak = weekStreak([monday(0), monday(1), monday(1, 18)], 2, NOW);
    expect(streak.current).toBe(1);
    expect(streak.thisWeekDone).toBe(false);
    expect(streak.remaining).toBe(1);
  });

  it('part de zéro sans aucune séance', () => {
    expect(weekStreak([], 3, NOW)).toEqual({
      current: 0,
      thisWeekDone: false,
      remaining: 3,
      best: 0,
      target: 3,
    });
  });
});
