import { describe, expect, it } from 'vitest';
import {
  entryVolume,
  entryWorkingSetCount,
  formatApproxDuration,
  formatDuration,
  formatVolume,
  performedSets,
  workingSets,
  workoutAverageRpe,
  workoutRepCount,
  workoutVolume,
  workoutWorkingSetCount,
} from './metrics';
import { makeEntry, makeSet, makeWorkout } from './testFactories';

describe('performedSets', () => {
  it('garde un echauffement valide sans repetitions', () => {
    // « 0 » sur un echauffement veut dire « fait, sans compter », pas « rien
    // fait » : la serie a bien eu lieu et doit survivre a la fin de seance.
    const entry = makeEntry({
      sets: [
        makeSet({ type: 'echauffement', weightKg: 40, reps: 0 }),
        makeSet({ type: 'echauffement', weightKg: 60, reps: null }),
      ],
    });
    expect(performedSets(entry)).toHaveLength(2);
    // Sans jamais compter dans le travail pour autant.
    expect(workingSets(entry)).toHaveLength(0);
    expect(entryVolume(entry)).toBe(0);
  });

  it('ecarte une serie de travail sans repetitions, et tout ce qui n’est pas valide', () => {
    const entry = makeEntry({
      sets: [
        makeSet({ type: 'normale', weightKg: 100, reps: 0 }),
        makeSet({ type: 'drop', weightKg: 80, reps: null }),
        makeSet({ type: 'echauffement', done: false }),
        makeSet({ type: 'normale', weightKg: 100, reps: 8 }),
      ],
    });
    expect(performedSets(entry).map((s) => s.reps)).toEqual([8]);
  });

  it('garde une serie de travail au poids du corps', () => {
    // Poids nul ou absent n'est pas un probleme : les tractions existent.
    const entry = makeEntry({ sets: [makeSet({ weightKg: null, reps: 12 })] });
    expect(performedSets(entry)).toHaveLength(1);
  });
});

describe('workingSets', () => {
  it('exclut l echauffement du volume de travail', () => {
    const entry = makeEntry({
      sets: [
        makeSet({ type: 'echauffement', weightKg: 60, reps: 5 }),
        makeSet({ type: 'normale', weightKg: 100, reps: 8 }),
      ],
    });
    expect(workingSets(entry)).toHaveLength(1);
    expect(entryVolume(entry)).toBe(800);
  });

  it('exclut les series non validees', () => {
    const entry = makeEntry({
      sets: [makeSet({ done: false }), makeSet({ done: true, weightKg: 50, reps: 10 })],
    });
    expect(entryVolume(entry)).toBe(500);
  });

  it('ignore les series a poids ou reps manquants', () => {
    const entry = makeEntry({
      sets: [makeSet({ weightKg: null }), makeSet({ reps: null }), makeSet({ reps: 0 })],
    });
    expect(workingSets(entry)).toHaveLength(0);
    expect(entryVolume(entry)).toBe(0);
  });

  it('compte le drop set et l echec comme du travail effectif', () => {
    const entry = makeEntry({
      sets: [
        makeSet({ type: 'drop', weightKg: 80, reps: 5 }),
        makeSet({ type: 'echec', weightKg: 60, reps: 10 }),
        makeSet({ type: 'myo', weightKg: 40, reps: 5 }),
      ],
    });
    expect(workingSets(entry)).toHaveLength(3);
    expect(entryVolume(entry)).toBe(400 + 600 + 200);
  });
});

describe('agregats de seance', () => {
  it('somme le volume sur tous les exercices', () => {
    const workout = makeWorkout({
      entries: [
        makeEntry({ sets: [makeSet({ weightKg: 100, reps: 8 })] }),
        makeEntry({ sets: [makeSet({ weightKg: 50, reps: 12 })] }),
      ],
    });
    expect(workoutVolume(workout)).toBe(800 + 600);
    expect(workoutWorkingSetCount(workout)).toBe(2);
    expect(workoutRepCount(workout)).toBe(20);
  });

  it('moyenne le RPE sur les seules series renseignees', () => {
    const workout = makeWorkout({
      entries: [
        makeEntry({
          sets: [makeSet({ rpe: 8 }), makeSet({ rpe: 9 }), makeSet({ rpe: null })],
        }),
      ],
    });
    expect(workoutAverageRpe(workout)).toBe(8.5);
  });

  it('renvoie null si le RPE n a jamais ete renseigne', () => {
    const workout = makeWorkout({ entries: [makeEntry({ sets: [makeSet({ rpe: null })] })] });
    expect(workoutAverageRpe(workout)).toBeNull();
  });

  it('ne compte pas le RPE d une serie d echauffement', () => {
    const workout = makeWorkout({
      entries: [
        makeEntry({
          sets: [makeSet({ type: 'echauffement', rpe: 2 }), makeSet({ rpe: 9 })],
        }),
      ],
    });
    expect(workoutAverageRpe(workout)).toBe(9);
  });
});

describe('degressives dans les comptes', () => {
  const drop = (weightKg: number, reps: number) =>
    makeSet({ type: 'drop', weightKg, reps, done: true });

  it('compte une degressive pour UNE serie, quel que soit le nombre de paliers', () => {
    const entry = makeEntry({
      sets: [
        makeSet({ weightKg: 60, reps: 8, done: true }),
        drop(50, 5),
        drop(40, 4),
        drop(30, 6),
      ],
    });
    // Quatre lignes soulevees, deux efforts : une normale et une degressive.
    expect(workingSets(entry)).toHaveLength(4);
    expect(entryWorkingSetCount(entry)).toBe(2);
  });

  it('garde tout le tonnage des paliers', () => {
    // Le comptage change, pas le travail : chaque palier a bien ete souleve.
    const entry = makeEntry({ sets: [drop(50, 5), drop(40, 5)] });
    expect(entryVolume(entry)).toBe(50 * 5 + 40 * 5);
  });

  it('separe deux degressives qu’une normale interrompt', () => {
    const entry = makeEntry({
      sets: [drop(50, 5), drop(40, 4), makeSet({ weightKg: 60, reps: 8, done: true }), drop(45, 5)],
    });
    expect(entryWorkingSetCount(entry)).toBe(3);
  });

  it('ne soude pas deux groupes separes par une serie non validee', () => {
    // La serie du milieu n'est pas validee : elle sort du compte, mais les
    // deux degressives qu'elle separait restent deux efforts distincts.
    const entry = makeEntry({
      sets: [drop(50, 5), makeSet({ weightKg: 60, reps: 8, done: false }), drop(40, 4)],
    });
    expect(entryWorkingSetCount(entry)).toBe(2);
  });

  it('ne coupe pas une degressive dont un palier est reste vide', () => {
    // Le palier du milieu n'a pas ete valide, mais il appartient bien a la
    // meme descente : l'ensemble reste UN effort.
    const entry = makeEntry({
      sets: [drop(50, 5), makeSet({ type: 'drop', done: false }), drop(30, 4)],
    });
    expect(entryWorkingSetCount(entry)).toBe(1);
  });
});

describe('formatage', () => {
  it('bascule en heures au-dela de 60 minutes', () => {
    expect(formatDuration(3900)).toBe('1h05');
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(-10)).toBe('0:00');
  });

  it('bascule en tonnes avec la virgule francaise', () => {
    expect(formatVolume(7200)).toBe('7,2 t');
    expect(formatVolume(850)).toBe('850 kg');
  });

  it('annonce une duree estimee en heures passe 60 minutes', () => {
    // Sous l'heure, l'unite reste a cote du chiffre.
    expect(formatApproxDuration(45 * 60)).toEqual({ value: '~45', unit: 'min' });
    expect(formatApproxDuration(59 * 60)).toEqual({ value: '~59', unit: 'min' });

    // Le cas qui motivait le changement : « 78 min » ne se lit pas.
    expect(formatApproxDuration(78 * 60)).toEqual({ value: '~1h18' });
    // Minutes toujours sur deux chiffres, comme formatDuration.
    expect(formatApproxDuration(65 * 60)).toEqual({ value: '~1h05' });
    // Heure pile : pas de « 2h00 », qui se lit comme un horaire.
    expect(formatApproxDuration(120 * 60)).toEqual({ value: '~2h' });

    // 60 minutes exactement bascule, et rien ne part en negatif.
    expect(formatApproxDuration(60 * 60)).toEqual({ value: '~1h' });
    expect(formatApproxDuration(-90)).toEqual({ value: '~0', unit: 'min' });
  });
});
