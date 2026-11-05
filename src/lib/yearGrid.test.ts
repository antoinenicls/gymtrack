import { describe, expect, it } from 'vitest';
import { buildYearGrid } from './yearGrid';

/** Vendredi 16 octobre 2026, midi. */
const NOW = new Date(2026, 9, 16, 12, 0, 0);

describe('buildYearGrid', () => {
  it('cale les colonnes sur le lundi et laisse vides les jours hors de l’année', () => {
    // Le 1er janvier 2026 est un jeudi : lundi, mardi et mercredi sont en 2025.
    const grid = buildYearGrid([], 2026, NOW);
    const firstWeek = grid.weeks[0];

    expect(grid.weeks).toHaveLength(53);
    expect(firstWeek?.slice(0, 3)).toEqual([null, null, null]);
    expect(new Date(firstWeek?.[3]?.date ?? 0).getDate()).toBe(1);
    // Le 31 decembre 2026 est un jeudi : la fin de la derniere colonne deborde.
    expect(grid.weeks[52]?.slice(4)).toEqual([null, null, null]);
  });

  it('compte les jours distincts, pas les séances', () => {
    const sessions = [
      new Date(2026, 2, 3, 8).getTime(),
      new Date(2026, 2, 3, 18).getTime(), // meme jour, deuxieme seance
      new Date(2026, 2, 5, 23, 30).getTime(),
      new Date(2025, 11, 31, 10).getTime(), // annee precedente
    ];

    const grid = buildYearGrid(sessions, 2026, NOW);
    const days = grid.weeks.flat();

    expect(grid.activeDays).toBe(2);
    expect(days.find((d) => d && new Date(d.date).getMonth() === 2 && new Date(d.date).getDate() === 3)?.count).toBe(2);
  });

  it('repère aujourd’hui et les jours à venir', () => {
    const days = buildYearGrid([], 2026, NOW).weeks.flat().filter((d) => d !== null);

    expect(days).toHaveLength(365);
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
    expect(new Date(days.find((d) => d.isToday)?.date ?? 0).getDate()).toBe(16);
    expect(days.filter((d) => !d.isFuture)).toHaveLength(289); // 1er janvier -> 16 octobre
  });

  it('place chaque mois dans la colonne de son premier jour', () => {
    const { months } = buildYearGrid([], 2026, NOW);

    expect(months.map((m) => m.month)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(months[0]?.column).toBe(0);
    // Dimanche 1er fevrier 2026 : derniere case de la 5e colonne.
    expect(months[1]?.column).toBe(4);
  });
});
