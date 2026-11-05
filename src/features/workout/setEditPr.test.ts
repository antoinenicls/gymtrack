/**
 * Un record se lit sur ce qui est ECRIT, pas sur ce qui l'etait au clic.
 *
 * Le geste reel de la salle : on coche la serie, puis on corrige les reps par
 * ce qu'on a vraiment fait. La detection figee au moment de la coche ratait
 * donc les records battus une seconde plus tard, et gardait affiches ceux
 * qu'une correction a la baisse venait d'annuler.
 */

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkoutStore } from './workoutStore';
import { exerciseRepo, recordRepo, workoutRepo } from '@/services/repositories';
import type { Exercise } from '@/types/domain';

const DEV_COUCHE: Exercise = {
  id: 'ex-dc',
  name: 'Développé couché',
  muscleGroup: 'pectoraux',
  equipment: 'barre',
  defaultRestSec: 120,
  isCustom: false,
  createdAt: 1,
};

const store = () => useWorkoutStore.getState();

/** Identifiants de la premiere serie du premier exercice de la seance. */
function premiereSerie(): { entryId: string; setId: string } {
  const entry = store().workout!.entries[0]!;
  return { entryId: entry.id, setId: entry.sets[0]!.id };
}

const serie = () => store().workout!.entries[0]!.sets[0]!;

async function seanceAvecUnExercice(): Promise<void> {
  await store().startEmpty();
  await store().addExercises([DEV_COUCHE.id]);
}

describe('records rejoues a la correction d’une serie', () => {
  beforeEach(async () => {
    await store().cancel();
    await recordRepo.clear();
    for (const w of await workoutRepo.all()) await workoutRepo.remove(w.id);
    await exerciseRepo.save(DEV_COUCHE);
  });

  it('reconnait le record etabli APRES avoir coche la serie', async () => {
    await seanceAvecUnExercice();
    const { entryId, setId } = premiereSerie();

    // Coche a vide, comme quand on valide avant d'avoir tout saisi.
    await store().toggleSetDone(entryId, setId);
    expect(serie().prKinds).toBeUndefined();

    await store().updateSet(entryId, setId, { weightKg: 100 });
    await store().updateSet(entryId, setId, { reps: 8 });

    expect(serie().prKinds).toContain('charge');
    expect((await recordRepo.get(DEV_COUCHE.id)).bestWeight?.weightKg).toBe(100);
  });

  it('retire le badge quand la correction ramene sous le record', async () => {
    // Un passe a 120 kg, donc 110 kg n'est plus un record de charge.
    await workoutRepo.save({
      id: 'passe',
      name: 'Push',
      routineId: null,
      startedAt: Date.parse('2026-07-01T10:00:00Z'),
      endedAt: Date.parse('2026-07-01T11:00:00Z'),
      durationSec: 3600,
      notes: '',
      entries: [
        {
          id: 'e-passe',
          exerciseId: DEV_COUCHE.id,
          sets: [
            {
              id: 's-passe',
              type: 'normale',
              weightKg: 120,
              reps: 5,
              rpe: null,
              done: true,
            },
          ],
          notes: '',
          restSec: 120,
          supersetGroup: null,
          order: 0,
        },
      ],
    });
    await recordRepo.recompute();

    await seanceAvecUnExercice();
    const { entryId, setId } = premiereSerie();

    await store().updateSet(entryId, setId, { weightKg: 125, reps: 5 });
    await store().toggleSetDone(entryId, setId);
    expect(serie().prKinds).toContain('charge');

    // Correction : c'etait 115, pas 125. Le badge n'a plus lieu d'etre, et le
    // record repasse a la performance passee.
    await store().updateSet(entryId, setId, { weightKg: 115 });
    expect(serie().prKinds).toBeUndefined();
    expect((await recordRepo.get(DEV_COUCHE.id)).bestWeight?.weightKg).toBe(120);
  });

  it('efface le tout premier record d’un exercice si la correction l’annule', async () => {
    await seanceAvecUnExercice();
    const { entryId, setId } = premiereSerie();

    await store().updateSet(entryId, setId, { weightKg: 60, reps: 10 });
    await store().toggleSetDone(entryId, setId);
    expect((await recordRepo.get(DEV_COUCHE.id)).bestWeight?.weightKg).toBe(60);

    // Sans historique derriere, il ne reste rien a afficher : la ligne s'en va
    // au lieu de garder un record vide.
    await store().updateSet(entryId, setId, { reps: 0 });
    expect(serie().prKinds).toBeUndefined();
    expect(await recordRepo.all()).toEqual([]);
  });

  it('rend le record a la serie precedente quand la derniere redescend', async () => {
    await seanceAvecUnExercice();
    const { entryId } = premiereSerie();
    await store().addSet(entryId);

    const sets = store().workout!.entries[0]!.sets;
    const [une, deux] = [sets[0]!.id, sets[1]!.id];

    await store().updateSet(entryId, une, { weightKg: 100, reps: 5 });
    await store().toggleSetDone(entryId, une);
    await store().updateSet(entryId, deux, { weightKg: 105, reps: 5 });
    await store().toggleSetDone(entryId, deux);

    const badges = () => store().workout!.entries[0]!.sets.map((s) => s.prKinds);
    expect(badges()[0]).toContain('charge');
    expect(badges()[1]).toContain('charge');

    // La deuxieme retombe a 95 : elle perd son badge, la premiere garde le sien.
    await store().updateSet(entryId, deux, { weightKg: 95 });
    expect(badges()[0]).toContain('charge');
    expect(badges()[1]).toBeUndefined();
    expect((await recordRepo.get(DEV_COUCHE.id)).bestWeight?.weightKg).toBe(100);
  });

  it('met a jour l’e1rm fige quand les reps changent apres la coche', async () => {
    await seanceAvecUnExercice();
    const { entryId, setId } = premiereSerie();

    await store().updateSet(entryId, setId, { weightKg: 100, reps: 5 });
    await store().toggleSetDone(entryId, setId);
    const avant = serie().e1rm!;

    await store().updateSet(entryId, setId, { reps: 8 });
    expect(serie().e1rm!).toBeGreaterThan(avant);
  });

  it('pose un badge « PR du mois » quand on bat le mois sans battre l’absolu', async () => {
    const now = Date.now();
    const seance = (id: string, startedAt: number, weightKg: number, reps: number) => ({
      id,
      name: 'Push',
      routineId: null,
      startedAt,
      endedAt: startedAt + 1,
      notes: '',
      durationSec: 1,
      entries: [
        {
          id: `${id}-e`,
          exerciseId: DEV_COUCHE.id,
          notes: '',
          restSec: 120,
          supersetGroup: null,
          order: 0,
          sets: [{ id: `${id}-s`, type: 'normale' as const, weightKg, reps, rpe: null, done: true }],
        },
      ],
    });
    // Le record absolu date d'il y a un an ; ce mois-ci, on tourne a 90 kg x 6.
    await workoutRepo.save(seance('ancienne', now - 365 * 86_400_000, 100, 5));
    await workoutRepo.save(seance('ce-mois', now - 1000, 90, 6));
    await recordRepo.recompute();

    await seanceAvecUnExercice();
    const { entryId, setId } = premiereSerie();
    await store().updateSet(entryId, setId, { weightKg: 90, reps: 8 });
    const flash = await store().toggleSetDone(entryId, setId);

    expect(serie().prKinds).toBeUndefined();
    expect(serie().monthPrKinds).toEqual(['e1rm']);
    expect(flash?.month).toBe(true);

    // Redescendre sous la reference du mois retire le badge.
    await store().updateSet(entryId, setId, { reps: 5 });
    expect(serie().monthPrKinds).toBeUndefined();
  });
});
