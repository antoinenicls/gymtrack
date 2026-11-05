import { describe, expect, it } from 'vitest';
import { bucketByWeek, daysTrainedThisWeek, goalStreak, startOfWeek } from './weekly';

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
