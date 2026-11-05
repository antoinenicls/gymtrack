import { describe, expect, it } from 'vitest';
import { buildRoutineFromWorkout, canBuildRoutine, diffRoutineFromWorkout } from './routineSync';
import { makeEntry, makeSet, makeWorkout } from './testFactories';
import type { Routine } from '@/types/domain';

const NAMES: Record<string, string> = { 'ex-1': 'Développé couché', 'ex-2': 'Rowing barre' };
const nameOf = (id: string): string | undefined => NAMES[id];

function routine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: 'r1',
    name: 'Push A',
    folderId: null,
    createdAt: 0,
    updatedAt: 0,
    lastPerformedAt: null,
    items: [
      {
        id: 'i1',
        exerciseId: 'ex-1',
        sets: [
          { id: 'i1s0', type: 'normale', targetWeightKg: 100, targetReps: 8, targetRpe: 8 },
          { id: 'i1s1', type: 'normale', targetWeightKg: 100, targetReps: 8, targetRpe: 8 },
        ],
        restSec: 180,
        supersetGroup: null,
        notes: '',
        order: 0,
      },
    ],
    ...overrides,
  };
}

describe('diffRoutineFromWorkout', () => {
  it('ne propose rien quand la séance colle à la routine', () => {
    const workout = makeWorkout({
      entries: [
        makeEntry({
          exerciseId: 'ex-1',
          restSec: 180,
          sets: [
            makeSet({ weightKg: 100, reps: 8 }),
            makeSet({ weightKg: 100, reps: 8 }),
          ],
        }),
      ],
    });

    expect(diffRoutineFromWorkout(routine(), workout, nameOf).changed).toBe(false);
  });

  it('détecte une série ajoutée', () => {
    const workout = makeWorkout({
      entries: [
        makeEntry({
          exerciseId: 'ex-1',
          restSec: 180,
          sets: [
            makeSet({ weightKg: 100, reps: 8 }),
            makeSet({ weightKg: 100, reps: 8 }),
            makeSet({ weightKg: 100, reps: 8 }),
          ],
        }),
      ],
    });

    const diff = diffRoutineFromWorkout(routine(), workout, nameOf);
    expect(diff.changed).toBe(true);
    expect(diff.changes.some((c) => c.includes('2 à 3'))).toBe(true);
    expect(diff.updated.items[0]?.sets).toHaveLength(3);
  });

  it('reporte les charges réellement soulevées comme nouvelles cibles', () => {
    const workout = makeWorkout({
      entries: [
        makeEntry({
          exerciseId: 'ex-1',
          restSec: 180,
          sets: [
            makeSet({ weightKg: 102.5, reps: 8 }),
            makeSet({ weightKg: 102.5, reps: 7 }),
          ],
        }),
      ],
    });

    const diff = diffRoutineFromWorkout(routine(), workout, nameOf);
    expect(diff.changed).toBe(true);
    expect(diff.updated.items[0]?.sets[0]?.targetWeightKg).toBe(102.5);
    expect(diff.updated.items[0]?.sets[1]?.targetReps).toBe(7);
  });

  it('conserve le RPE prescrit au lieu du RPE constaté', () => {
    // Le RPE realise dit ce que l'effort a COUTE, pas ce qu'on vise. Le
    // reporter comme cible transformerait une mauvaise journee en consigne.
    const workout = makeWorkout({
      entries: [
        makeEntry({
          exerciseId: 'ex-1',
          restSec: 180,
          sets: [makeSet({ weightKg: 100, reps: 8, rpe: 10 }), makeSet({ weightKg: 100, reps: 8, rpe: 10 })],
        }),
      ],
    });

    const diff = diffRoutineFromWorkout(routine(), workout, nameOf);
    expect(diff.updated.items[0]?.sets[0]?.targetRpe).toBe(8);
  });

  it('signale un exercice ajouté en cours de séance', () => {
    const workout = makeWorkout({
      entries: [
        makeEntry({ exerciseId: 'ex-1', sets: [makeSet(), makeSet()] }),
        makeEntry({ exerciseId: 'ex-2', sets: [makeSet()] }),
      ],
    });

    const diff = diffRoutineFromWorkout(routine(), workout, nameOf);
    expect(diff.changes.some((c) => c.includes('Rowing barre') && c.includes('ajouté'))).toBe(true);
    expect(diff.updated.items).toHaveLength(2);
  });

  it('signale un exercice sauté', () => {
    const workout = makeWorkout({
      entries: [makeEntry({ exerciseId: 'ex-2', sets: [makeSet()] })],
    });

    const diff = diffRoutineFromWorkout(routine(), workout, nameOf);
    expect(diff.changes.some((c) => c.includes('Développé couché') && c.includes('retiré'))).toBe(
      true,
    );
  });

  it('reporte l’échauffement realise, sans le compter comme une serie', () => {
    // Les echauffements etaient ecartes du report : la routine les perdait a
    // chaque fin de seance, et il fallait les ressaisir la semaine suivante.
    const workout = makeWorkout({
      entries: [
        makeEntry({
          exerciseId: 'ex-1',
          restSec: 180,
          sets: [
            makeSet({ type: 'echauffement', weightKg: 60, reps: 5 }),
            makeSet({ weightKg: 100, reps: 8 }),
            makeSet({ weightKg: 100, reps: 8 }),
          ],
        }),
      ],
    });

    const diff = diffRoutineFromWorkout(routine(), workout, nameOf);
    expect(diff.updated.items[0]?.sets).toHaveLength(3);
    expect(diff.updated.items[0]?.sets[0]?.type).toBe('echauffement');
    // Le compte annonce ne parle QUE des series de travail : elles sont
    // toujours deux, la phrase ne doit pas dire « passerait de 2 a 3 séries ».
    expect(diff.changes.some((c) => c.includes('séries'))).toBe(false);
    expect(diff.changes.some((c) => c.includes('échauffement'))).toBe(true);
  });

  it('garde un échauffement sans repetitions, qui a bien ete realise', () => {
    // « 0 rep » sur un echauffement veut dire « fait, sans compter » : on
    // chauffe le muscle jusqu'a se sentir pret, pas jusqu'a un nombre.
    const workout = makeWorkout({
      entries: [
        makeEntry({
          exerciseId: 'ex-1',
          restSec: 180,
          sets: [
            makeSet({ type: 'echauffement', weightKg: 40, reps: 0 }),
            makeSet({ weightKg: 100, reps: 8 }),
            makeSet({ weightKg: 100, reps: 8 }),
          ],
        }),
      ],
    });

    const diff = diffRoutineFromWorkout(routine(), workout, nameOf);
    expect(diff.updated.items[0]?.sets[0]).toMatchObject({
      type: 'echauffement',
      targetWeightKg: 40,
      targetReps: 0,
    });
  });

  it('ecarte une serie de travail sans repetitions', () => {
    // Un 0 hors echauffement ne veut rien dire : ni volume, ni cible.
    const workout = makeWorkout({
      entries: [
        makeEntry({
          exerciseId: 'ex-1',
          restSec: 180,
          sets: [
            makeSet({ weightKg: 100, reps: 8 }),
            makeSet({ weightKg: 100, reps: 8 }),
            makeSet({ weightKg: 100, reps: 0 }),
          ],
        }),
      ],
    });

    const diff = diffRoutineFromWorkout(routine(), workout, nameOf);
    expect(diff.updated.items[0]?.sets).toHaveLength(2);
    expect(diff.changed).toBe(false);
  });

  it('ne mute pas la routine reçue', () => {
    const original = routine();
    const workout = makeWorkout({
      entries: [makeEntry({ exerciseId: 'ex-1', sets: [makeSet({ weightKg: 200, reps: 3 })] })],
    });

    diffRoutineFromWorkout(original, workout, nameOf);
    expect(original.items[0]?.sets).toHaveLength(2);
    expect(original.items[0]?.sets[0]?.targetWeightKg).toBe(100);
  });
});

/* -------------------------------------------------------------------------- */
/* Seance improvisee vers seance enregistree                                   */
/* -------------------------------------------------------------------------- */

describe('buildRoutineFromWorkout', () => {
  let n = 0;
  const makeId = (): string => `id-${(n += 1)}`;
  const AT = Date.parse('2026-07-19T18:30:00Z');

  const improvisee = () =>
    makeWorkout({
      name: 'Séance du soir',
      routineId: null,
      startedAt: AT,
      entries: [
        makeEntry({
          id: 'e1',
          exerciseId: 'ex-1',
          restSec: 180,
          notes: 'Coudes serrés',
          sets: [
            makeSet({ type: 'echauffement', weightKg: 40, reps: 10 }),
            makeSet({ weightKg: 100, reps: 8, rpe: 8 }),
            makeSet({ weightKg: 100, reps: 7, rpe: 9 }),
          ],
        }),
        makeEntry({ id: 'e2', exerciseId: 'ex-2', restSec: 120, sets: [makeSet({ weightKg: 60, reps: 10 })] }),
      ],
    });

  it('reprend les exercices dans l’ordre pratique, avec leurs charges', () => {
    n = 0;
    const built = buildRoutineFromWorkout(improvisee(), 'Push improvisé', makeId, AT);

    expect(built.name).toBe('Push improvisé');
    expect(built.items.map((i) => i.exerciseId)).toEqual(['ex-1', 'ex-2']);
    expect(built.items[0]?.sets.map((s) => s.targetWeightKg)).toEqual([40, 100, 100]);
    expect(built.items[0]?.sets.map((s) => s.targetReps)).toEqual([10, 8, 7]);
    expect(built.items[0]?.restSec).toBe(180);
    expect(built.items[0]?.notes).toBe('Coudes serrés');
  });

  it('garde les series d’echauffement realisees', () => {
    // Meme regle que le report vers une routine existante : ce qui a ete fait
    // est ce qu'on retrouve la fois suivante, montee en charge comprise.
    n = 0;
    const built = buildRoutineFromWorkout(improvisee(), 'X', makeId, AT);
    expect(built.items[0]?.sets).toHaveLength(3);
    expect(built.items[0]?.sets[0]?.type).toBe('echauffement');
  });

  it('ne transforme pas le RPE constate en consigne', () => {
    n = 0;
    const built = buildRoutineFromWorkout(improvisee(), 'X', makeId, AT);
    expect(built.items[0]?.sets.every((s) => s.targetRpe === null)).toBe(true);
  });

  it('atterrit a la racine et se souvient d’avoir ete faite', () => {
    n = 0;
    const built = buildRoutineFromWorkout(improvisee(), 'X', makeId, AT);
    expect(built.folderId).toBeNull();
    expect(built.lastPerformedAt).toBe(AT);
  });

  it('retombe sur le nom de la seance si le champ est vide', () => {
    n = 0;
    expect(buildRoutineFromWorkout(improvisee(), '   ', makeId, AT).name).toBe('Séance du soir');
  });

  it('ecarte un exercice ajoute mais jamais realise', () => {
    n = 0;
    const workout = improvisee();
    workout.entries.push(makeEntry({ id: 'e3', exerciseId: 'ex-3', sets: [] }));
    const built = buildRoutineFromWorkout(workout, 'X', makeId, AT);
    expect(built.items.map((i) => i.exerciseId)).not.toContain('ex-3');
  });

  it('donne des identifiants neufs, sans reprendre ceux de la seance', () => {
    // Une routine partageant l'id d'une entree de seance ferait se marcher
    // dessus deux objets de nature differente.
    n = 0;
    const built = buildRoutineFromWorkout(improvisee(), 'X', makeId, AT);
    expect(built.items.map((i) => i.id)).not.toContain('e1');
    expect(new Set(built.items.map((i) => i.id)).size).toBe(built.items.length);
  });
});

describe('canBuildRoutine', () => {
  it('refuse une seance ou rien n’a ete valide', () => {
    expect(canBuildRoutine(makeWorkout({ entries: [] }))).toBe(false);
    expect(
      canBuildRoutine(makeWorkout({ entries: [makeEntry({ id: 'e1', sets: [] })] })),
    ).toBe(false);
  });

  it('accepte des qu’une serie de travail existe', () => {
    expect(
      canBuildRoutine(
        makeWorkout({ entries: [makeEntry({ id: 'e1', sets: [makeSet({ weightKg: 60, reps: 5 })] })] }),
      ),
    ).toBe(true);
  });
});
