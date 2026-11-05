/**
 * Les records suivent l'historique, dans les DEUX sens.
 *
 * Le bug corrige ici se voyait a l'ecran sans qu'aucun test ne le voie : apres
 * avoir supprime des seances, le Profil continuait d'afficher une charge max
 * et un 1RM estime pour des performances qui n'existaient plus nulle part. Les
 * tests unitaires de `rebuildRecords` ne suffisent pas a l'attraper, parce que
 * le defaut n'etait pas dans le calcul mais dans le fait qu'on ne l'appelait
 * jamais. C'est donc le CHEMIN DE SUPPRESSION qui est verrouille ici.
 */

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { recordRepo, workoutRepo } from './repositories';
import { getDb } from './db';
import type { Workout } from '@/types/domain';

const DAY = 86_400_000;

function seance(id: string, startedAt: number, weightKg: number, reps: number): Workout {
  return {
    id,
    name: `Seance ${id}`,
    routineId: null,
    startedAt,
    endedAt: startedAt,
    notes: '',
    durationSec: null,
    entries: [
      {
        id: `${id}-e`,
        exerciseId: 'ex-1',
        notes: '',
        restSec: 0,
        supersetGroup: null,
        order: 0,
        sets: [
          {
            id: `${id}-s`,
            type: 'normale',
            weightKg,
            reps,
            rpe: null,
            done: true,
            completedAt: startedAt,
          },
        ],
      },
    ],
  };
}

async function resetDb(): Promise<void> {
  const db = await getDb();
  for (const store of ['workouts', 'records'] as const) {
    const tx = db.transaction(store, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
}

describe('records et suppression de seances', () => {
  beforeEach(async () => {
    await resetDb();
    await workoutRepo.save(seance('a', DAY, 100, 5));
    await workoutRepo.save(seance('b', 2 * DAY, 140, 3));
    await recordRepo.recompute();
  });

  it('part d’un record etabli sur la meilleure seance', async () => {
    expect((await recordRepo.get('ex-1')).bestWeight?.weightKg).toBe(140);
  });

  it('fait redescendre le record quand la seance qui le portait est supprimee', async () => {
    await workoutRepo.remove('b');
    const record = await recordRepo.get('ex-1');
    expect(record.bestWeight?.weightKg).toBe(100);
    expect(record.bestWeight?.workoutId).toBe('a');
  });

  it('ne laisse plus rien quand tout l’historique est supprime', async () => {
    // Exactement le symptome signale : plus une seule seance, et pourtant une
    // charge max et un 1RM estime toujours affiches sur le Profil.
    await workoutRepo.removeMany(['a', 'b']);

    expect(await recordRepo.all()).toEqual([]);
    const record = await recordRepo.get('ex-1');
    expect(record.bestWeight).toBeNull();
    expect(record.bestE1rm).toBeNull();
    expect(record.bestSessionVolume).toBeNull();
  });

  it('recalcule une seule fois pour une suppression multiple', async () => {
    await workoutRepo.save(seance('c', 3 * DAY, 120, 5));
    await recordRepo.recompute();

    await workoutRepo.removeMany(['b', 'c']);
    expect((await recordRepo.get('ex-1')).bestWeight?.weightKg).toBe(100);
  });

  it('repare une base ou un record avait survecu a sa seance', async () => {
    // Simule l'etat d'un telephone d'avant le correctif : le record est la, la
    // seance non. C'est ce que `recompute` au demarrage doit nettoyer.
    const db = await getDb();
    await db.delete('workouts', 'b');
    expect((await recordRepo.get('ex-1')).bestWeight?.weightKg).toBe(140);

    await recordRepo.recompute();
    expect((await recordRepo.get('ex-1')).bestWeight?.weightKg).toBe(100);
  });
});
