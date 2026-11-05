/**
 * Une serie oubliee au milieu se glisse a sa place.
 *
 * Sans insertion, la seule issue etait d'ajouter en bout de liste puis de
 * retaper tous les chiffres du dessous pour les decaler d'un rang. Ce qui est
 * verifie ici : la position, et le fait que les series deja validees ne bougent
 * ni de contenu ni de resultat.
 */

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkoutStore } from './workoutStore';
import { exerciseRepo, workoutRepo } from '@/services/repositories';
import type { Exercise } from '@/types/domain';

const DEVELOPPE: Exercise = {
  id: 'ex-developpe',
  name: 'Développé couché',
  muscleGroup: 'pectoraux',
  equipment: 'barre',
  defaultRestSec: 120,
  isCustom: false,
  createdAt: 1,
};

const store = () => useWorkoutStore.getState();
const sets = () => store().workout!.entries[0]!.sets;

/** Trois series chiffrees, les deux premieres validees. */
async function troisSeries(): Promise<string> {
  await store().startEmpty();
  await store().addExercises([DEVELOPPE.id]);

  const entryId = store().workout!.entries[0]!.id;
  await store().addSet(entryId);
  await store().addSet(entryId);

  const ids = sets().map((s) => s.id);
  await store().updateSet(entryId, ids[0]!, { weightKg: 60, reps: 10 });
  await store().updateSet(entryId, ids[1]!, { weightKg: 70, reps: 8 });
  await store().updateSet(entryId, ids[2]!, { weightKg: 80, reps: 6 });
  await store().toggleSetDone(entryId, ids[0]!);
  await store().toggleSetDone(entryId, ids[1]!);

  return entryId;
}

describe('insertion d’une serie', () => {
  beforeEach(async () => {
    await store().cancel();
    for (const w of await workoutRepo.all()) await workoutRepo.remove(w.id);
    await exerciseRepo.save(DEVELOPPE);
  });

  it('glisse la nouvelle serie juste avant celle designee', async () => {
    const entryId = await troisSeries();
    const troisieme = sets()[2]!.id;

    await store().insertSetBefore(entryId, troisieme);

    expect(sets()).toHaveLength(4);
    expect(sets()[2]!.done).toBe(false);
    expect(sets()[3]!.id).toBe(troisieme);
  });

  it('reprend la charge de la serie qui la precede', async () => {
    const entryId = await troisSeries();
    await store().insertSetBefore(entryId, sets()[2]!.id);

    expect(sets()[2]).toMatchObject({ weightKg: 70, reps: 8 });
  });

  it('en tete de liste, se cale sur la serie au-dessus de laquelle elle passe', async () => {
    const entryId = await troisSeries();
    await store().insertSetBefore(entryId, sets()[0]!.id);

    expect(sets()[0]).toMatchObject({ weightKg: 60, reps: 10, done: false });
    expect(sets()[1]!.done).toBe(true);
  });

  it('laisse intactes les series deja validees', async () => {
    const entryId = await troisSeries();
    const avant = sets().map((s) => ({ ...s }));

    await store().insertSetBefore(entryId, avant[1]!.id);

    const apres = sets();
    expect(apres[0]).toEqual(avant[0]);
    expect(apres[2]).toEqual(avant[1]);
    expect(apres[3]).toEqual(avant[2]);
  });
});
