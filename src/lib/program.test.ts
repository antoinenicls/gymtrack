import { describe, expect, it } from 'vitest';
import {
  buildProgram,
  materializeRoutines,
  normalizeRef,
  parseProgram,
  planImport,
  type Program,
  type ProgramExercise,
} from './program';
import type { Routine } from '@/types/domain';

const bench: ProgramExercise = {
  ref: 'developpe-couche',
  name: 'Développé couché',
  muscleGroup: 'pectoraux',
  equipment: 'barre',
  defaultRestSec: 180,
};

const row: ProgramExercise = {
  ref: 'rowing-barre',
  name: 'Rowing barre',
  muscleGroup: 'dos',
  equipment: 'barre',
  defaultRestSec: 150,
};

function senderRoutine(overrides: Partial<Routine> = {}): Routine {
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
        exerciseId: 'sender-uuid-bench',
        sets: [
          { id: 'i1s0', type: 'echauffement', targetWeightKg: 60, targetReps: 5, targetRpe: null },
          { id: 'i1s1', type: 'normale', targetWeightKg: null, targetReps: 8, targetRpe: null },
          { id: 'i1s2', type: 'normale', targetWeightKg: null, targetReps: 8, targetRpe: null },
          { id: 'i1s3', type: 'echec', targetWeightKg: null, targetReps: 6, targetRpe: null },
        ],
        restSec: 180,
        supersetGroup: null,
        notes: 'Coudes à 45 degrés',
        order: 0,
      },
      {
        id: 'i2',
        exerciseId: 'sender-uuid-row',
        sets: [
          { id: 'i2s0', type: 'normale', targetWeightKg: null, targetReps: 10, targetRpe: null },
          { id: 'i2s1', type: 'normale', targetWeightKg: null, targetReps: 10, targetRpe: null },
        ],
        restSec: 150,
        supersetGroup: null,
        notes: '',
        order: 1,
      },
    ],
    ...overrides,
  };
}

const resolve = (id: string): ProgramExercise | undefined =>
  id === 'sender-uuid-bench' ? bench : id === 'sender-uuid-row' ? row : undefined;

describe('normalizeRef', () => {
  it('rapproche malgré les accents, la casse et la ponctuation', () => {
    expect(normalizeRef('Développé couché')).toBe(normalizeRef('developpe couche'));
    expect(normalizeRef('DÉVELOPPÉ  COUCHÉ ')).toBe('developpe-couche');
    expect(normalizeRef('Rowing T-bar')).toBe('rowing-t-bar');
  });
});

describe('buildProgram', () => {
  it('embarque la définition des exercices, jamais leurs identifiants', () => {
    const program = buildProgram({
      name: 'Bloc 1',
      note: 'On garde 2 reps en réserve.',
      routines: [senderRoutine()],
      resolveExercise: resolve,
    });

    expect(program.exercises).toHaveLength(2);
    const serialized = JSON.stringify(program);
    // Le point de tout le format : aucun UUID de l'appareil de l'expediteur ne fuit.
    expect(serialized).not.toContain('sender-uuid');
  });

  it('écarte un exercice supprimé de la bibliothèque de l’expéditeur', () => {
    const routine = senderRoutine();
    routine.items[0]!.exerciseId = 'exercice-disparu';

    const program = buildProgram({
      name: 'Bloc 1',
      note: '',
      routines: [routine],
      resolveExercise: resolve,
    });

    expect(program.routines[0]?.items).toHaveLength(1);
    expect(program.exercises).toHaveLength(1);
  });

  it('réindexe les supersets en entiers locaux', () => {
    const routine = senderRoutine();
    routine.items[0]!.supersetGroup = 'uuid-groupe-du-coach';
    routine.items[1]!.supersetGroup = 'uuid-groupe-du-coach';

    const program = buildProgram({
      name: 'Bloc 1',
      note: '',
      routines: [routine],
      resolveExercise: resolve,
    });

    expect(program.routines[0]?.items.map((i) => i.supersetGroup)).toEqual([0, 0]);
    expect(JSON.stringify(program)).not.toContain('uuid-groupe');
  });
});

describe('parseProgram', () => {
  const valid = buildProgram({
    name: 'Bloc 1',
    note: 'Un mot',
    routines: [senderRoutine()],
    resolveExercise: resolve,
  });

  it('accepte un programme bien formé', () => {
    const result = parseProgram(JSON.stringify(valid));
    expect(result.ok).toBe(true);
  });

  it('refuse un fichier illisible sans jeter d’exception', () => {
    const result = parseProgram('{ ceci n est pas du json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('lisible');
  });

  it('refuse un JSON valide qui n’est pas un programme', () => {
    const result = parseProgram('{"hello":"world"}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('GymTrack');
  });

  it('refuse un format venu d’une version plus récente', () => {
    const result = parseProgram(JSON.stringify({ ...valid, version: 99 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('récente');
  });

  it('refuse une référence orpheline plutôt que de créer des lignes vides', () => {
    const broken = JSON.parse(JSON.stringify(valid)) as Program;
    broken.exercises = [broken.exercises[0]!];
    const result = parseProgram(JSON.stringify(broken));
    expect(result.ok).toBe(false);
  });

  it('ne casse pas sur null', () => {
    expect(parseProgram('null').ok).toBe(false);
  });
});

describe('planImport', () => {
  const program = buildProgram({
    name: 'Bloc 1',
    note: '',
    routines: [senderRoutine()],
    resolveExercise: resolve,
  });

  it('rapproche par nom malgré des identifiants totalement différents', () => {
    const plan = planImport(program, [
      { id: 'dest-uuid-1', name: 'Développé couché' },
      { id: 'dest-uuid-2', name: 'Rowing barre' },
    ]);

    expect(plan.matched).toHaveLength(2);
    expect(plan.missing).toHaveLength(0);
    expect(plan.matched[0]?.exerciseId).toBe('dest-uuid-1');
  });

  it('rapproche même si le destinataire a saisi le nom sans accents', () => {
    const plan = planImport(program, [
      { id: 'x', name: 'developpe couche' },
      { id: 'y', name: 'Rowing barre' },
    ]);
    expect(plan.missing).toHaveLength(0);
  });

  it('signale les exercices à créer', () => {
    const plan = planImport(program, [{ id: 'x', name: 'Développé couché' }]);
    expect(plan.matched).toHaveLength(1);
    expect(plan.missing.map((e) => e.name)).toEqual(['Rowing barre']);
  });

  it('annonce tout à créer sur une bibliothèque vide', () => {
    const plan = planImport(program, []);
    expect(plan.missing).toHaveLength(2);
    expect(plan.routineCount).toBe(1);
  });
});

describe('materializeRoutines', () => {
  it('reconstruit les routines avec les identifiants de le destinataire', () => {
    const program = buildProgram({
      name: 'Bloc 1',
      note: '',
      routines: [senderRoutine()],
      resolveExercise: resolve,
    });

    let n = 0;
    const routines = materializeRoutines(
      program,
      new Map([
        ['developpe-couche', 'dest-1'],
        ['rowing-barre', 'dest-2'],
      ]),
      () => `new-${++n}`,
    );

    expect(routines).toHaveLength(1);
    expect(routines[0]?.items.map((i) => i.exerciseId)).toEqual(['dest-1', 'dest-2']);
    expect(routines[0]?.items[0]?.notes).toBe('Coudes à 45 degrés');
    expect(routines[0]?.items[0]?.sets).toHaveLength(4);
    // Le type prescrit doit survivre au transfert : un echauffement reste un
    // echauffement chez le destinataire, sinon il compterait dans son volume.
    expect(routines[0]?.items[0]?.sets[0]?.type).toBe('echauffement');
    expect(routines[0]?.items[0]?.sets[3]?.type).toBe('echec');
    expect(routines[0]?.lastPerformedAt).toBeNull();
  });

  it('reconstitue les supersets en identifiants locaux cohérents', () => {
    const routine = senderRoutine();
    routine.items[0]!.supersetGroup = 'g';
    routine.items[1]!.supersetGroup = 'g';

    const program = buildProgram({
      name: 'B',
      note: '',
      routines: [routine],
      resolveExercise: resolve,
    });

    let n = 0;
    const [built] = materializeRoutines(
      program,
      new Map([
        ['developpe-couche', 'e1'],
        ['rowing-barre', 'e2'],
      ]),
      () => `id-${++n}`,
    );

    const groups = built?.items.map((i) => i.supersetGroup) ?? [];
    expect(groups[0]).not.toBeNull();
    expect(groups[0]).toBe(groups[1]);
  });

  it('relit un fichier au format v1, qui ne portait qu’un compteur de séries', () => {
    // Un programme exporte avant la v2 doit rester importable : un destinataire peut
    // avoir garde un vieux fichier dans ses messages.
    const legacy = {
      format: 'gymtrack.program',
      version: 1,
      name: 'Ancien bloc',
      note: '',
      createdAt: Date.now(),
      exercises: [bench],
      routines: [
        {
          name: 'Push A',
          items: [
            {
              ref: 'developpe-couche',
              targetSets: 3,
              targetReps: 10,
              targetWeightKg: 80,
              restSec: 180,
              supersetGroup: null,
              notes: '',
            },
          ],
        },
      ],
    };

    const parsed = parseProgram(JSON.stringify(legacy));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    let n = 0;
    const [built] = materializeRoutines(
      parsed.program,
      new Map([['developpe-couche', 'e1']]),
      () => `id-${++n}`,
    );

    // Le compteur est deplie en series individuelles, toutes normales.
    expect(built?.items[0]?.sets).toHaveLength(3);
    expect(built?.items[0]?.sets.every((s) => s.type === 'normale')).toBe(true);
    expect(built?.items[0]?.sets[0]?.targetReps).toBe(10);
    expect(built?.items[0]?.sets[0]?.targetWeightKg).toBe(80);
  });

  it('saute une référence non résolue au lieu de produire une ligne cassée', () => {
    const program = buildProgram({
      name: 'B',
      note: '',
      routines: [senderRoutine()],
      resolveExercise: resolve,
    });

    let n = 0;
    const [built] = materializeRoutines(
      program,
      new Map([['developpe-couche', 'e1']]),
      () => `id-${++n}`,
    );

    expect(built?.items).toHaveLength(1);
  });
});

describe('marques de série au voyage', () => {
  /**
   * Les deux marques ne tiennent pas dans le `type`, et chaque conversion
   * reconstruit ses series champ par champ : elles se perdaient a chaque
   * passage. Un aller-retour complet est le seul moyen de le voir.
   */
  const routineAvecDescentes = (): Routine =>
    senderRoutine({
      items: [
        {
          id: 'i1',
          exerciseId: 'sender-uuid-bench',
          sets: [
            { id: 'a', type: 'drop', targetWeightKg: 60, targetReps: 8, targetRpe: null },
            { id: 'b', type: 'drop', targetWeightKg: 50, targetReps: 8, targetRpe: null, toFailure: true },
            { id: 'c', type: 'drop', targetWeightKg: 60, targetReps: 8, targetRpe: null, dropStart: true },
            { id: 'd', type: 'drop', targetWeightKg: 50, targetReps: 8, targetRpe: null, toFailure: true },
          ],
          restSec: 180,
          supersetGroup: null,
          notes: '',
          order: 0,
        },
      ],
    });

  it('survivent a l’export puis a l’import', () => {
    const program = buildProgram({
      name: 'Bloc 1',
      note: '',
      routines: [routineAvecDescentes()],
      resolveExercise: resolve,
    });

    // Le fichier les transporte.
    const sets = program.routines[0]?.items[0]?.sets ?? [];
    expect(sets.map((set) => set.toFailure === true)).toEqual([false, true, false, true]);
    expect(sets.map((set) => set.dropStart === true)).toEqual([false, false, true, false]);

    // Et le destinataire les retrouve.
    const parsed = parseProgram(JSON.stringify(program));
    if (parsed.ok !== true) throw new Error('programme illisible');
    const routines = materializeRoutines(
      parsed.program,
      new Map([['developpe-couche', 'dest-bench']]),
      (() => {
        let n = 0;
        return () => `id-${n++}`;
      })(),
    );

    const recus = routines[0]?.items[0]?.sets ?? [];
    expect(recus.map((set) => set.toFailure === true)).toEqual([false, true, false, true]);
    expect(recus.map((set) => set.dropStart === true)).toEqual([false, false, true, false]);
  });

  it('n’inscrit rien quand il n’y a rien a dire', () => {
    // Une marque absente reste absente : on n'ecrit pas `false` partout dans
    // des fichiers que d'anciennes versions doivent pouvoir relire.
    const program = buildProgram({
      name: 'Bloc 1',
      note: '',
      routines: [senderRoutine()],
      resolveExercise: resolve,
    });
    expect(JSON.stringify(program)).not.toContain('toFailure');
    expect(JSON.stringify(program)).not.toContain('dropStart');
  });

  it('relit un fichier ecrit avant ces marques', () => {
    /**
     * Le fichier « ancien » est fabrique en RETIRANT les marques d'un
     * programme reel, plutot qu'ecrit a la main : c'est exactement ce qu'a
     * produit la version precedente, et ca ne peut pas diverger du format.
     */
    const program = buildProgram({
      name: 'Bloc 1',
      note: '',
      routines: [routineAvecDescentes()],
      resolveExercise: resolve,
    });
    const ancien = JSON.parse(JSON.stringify(program));
    for (const routine of ancien.routines) {
      for (const item of routine.items) {
        for (const set of item.sets) {
          delete set.toFailure;
          delete set.dropStart;
        }
      }
    }

    const parsed = parseProgram(JSON.stringify(ancien));
    if (parsed.ok !== true) throw new Error('programme illisible');
    const routines = materializeRoutines(
      parsed.program,
      new Map([['developpe-couche', 'dest-bench']]),
      (() => {
        let n = 0;
        return () => `id-${n++}`;
      })(),
    );

    const sets = routines[0]?.items[0]?.sets ?? [];
    // Les types survivent, les marques restent simplement absentes.
    expect(sets.map((set) => set.type)).toEqual(['drop', 'drop', 'drop', 'drop']);
    expect(sets.every((set) => set.toFailure === undefined)).toBe(true);
    expect(sets.every((set) => set.dropStart === undefined)).toBe(true);
  });
});
