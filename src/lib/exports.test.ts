import { describe, expect, it } from 'vitest';
import { buildHistoryCsv, summarizeWorkout } from './exports';
import { makeEntry, makeSet, makeWorkout } from './testFactories';
import type { Exercise } from '@/types/domain';

const bench: Exercise = {
  id: 'ex-1',
  name: 'Développé couché',
  muscleGroup: 'pectoraux',
  equipment: 'barre',
  defaultRestSec: 180,
  isCustom: false,
  createdAt: 0,
};

const exercises = new Map<string, Exercise>([['ex-1', bench]]);

describe('buildHistoryCsv', () => {
  it('ouvre par un BOM et separe au point-virgule pour Excel francais', () => {
    const csv = buildHistoryCsv([makeWorkout()], exercises);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.split('\r\n')[0]).toContain('date;seance');
  });

  it('ecrit une ligne par serie, echauffement compris', () => {
    const workout = makeWorkout({
      entries: [
        makeEntry({
          sets: [makeSet({ type: 'echauffement' }), makeSet(), makeSet()],
        }),
      ],
    });
    const lines = buildHistoryCsv([workout], exercises).trim().split('\r\n');
    expect(lines).toHaveLength(4); // en-tete + 3 series
  });

  it('ne compte pas l echauffement dans la colonne volume', () => {
    const workout = makeWorkout({
      entries: [makeEntry({ sets: [makeSet({ type: 'echauffement', weightKg: 60, reps: 5 })] })],
    });
    const row = buildHistoryCsv([workout], exercises).trim().split('\r\n')[1] ?? '';
    expect(row.split(';')[11]).toBe('0');
  });

  it('echappe les separateurs presents dans les noms', () => {
    const workout = makeWorkout({ name: 'Push; "lourd"' });
    const csv = buildHistoryCsv([workout], exercises);
    expect(csv).toContain('"Push; ""lourd"""');
  });

  it('survit a un exercice supprime de la bibliotheque', () => {
    const workout = makeWorkout({ entries: [makeEntry({ exerciseId: 'disparu' })] });
    expect(buildHistoryCsv([workout], exercises)).toContain('Exercice supprimé');
  });
});

describe('summarizeWorkout', () => {
  it('resume chaque exercice avec sa meilleure serie', () => {
    const workout = makeWorkout({
      entries: [
        makeEntry({
          sets: [
            makeSet({ weightKg: 90, reps: 10 }),
            makeSet({ weightKg: 100, reps: 6, prKinds: ['e1rm'] }),
          ],
        }),
      ],
    });
    const [line] = summarizeWorkout(workout, exercises);

    expect(line?.exerciseName).toBe('Développé couché');
    expect(line?.sets).toBe(2);
    expect(line?.volumeKg).toBe(900 + 600);
    expect(line?.topSet).toBe('100 kg x 6');
    expect(line?.hasPr).toBe(true);
  });

  it('ecarte les exercices ou rien n a ete valide', () => {
    const workout = makeWorkout({ entries: [makeEntry({ sets: [makeSet({ done: false })] })] });
    expect(summarizeWorkout(workout, exercises)).toEqual([]);
  });
});
