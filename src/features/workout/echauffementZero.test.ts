/**
 * Un echauffement valide sans repetitions a bien eu lieu.
 *
 * Le geste reel : on monte en charge jusqu'a se sentir chaud, sans compter ses
 * repetitions, et on laisse 0. La seance effacait alors la serie a la fin,
 * comme si rien n'avait ete fait, et la routine mise a jour repartait sans
 * echauffement la semaine suivante.
 */

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkoutStore } from './workoutStore';
import { exerciseRepo, workoutRepo } from '@/services/repositories';
import type { Exercise } from '@/types/domain';

const SQUAT: Exercise = {
  id: 'ex-squat',
  name: 'Squat',
  muscleGroup: 'quadriceps',
  equipment: 'barre',
  defaultRestSec: 180,
  isCustom: false,
  createdAt: 1,
};

const store = () => useWorkoutStore.getState();

async function seanceEchauffee(repsEchauffement: number | null): Promise<void> {
  await store().startEmpty();
  await store().addExercises([SQUAT.id]);

  const entryId = store().workout!.entries[0]!.id;
  await store().addSet(entryId);

  const [chauffe, travail] = store().workout!.entries[0]!.sets.map((s) => s.id) as [string, string];

  await store().setSetType(entryId, chauffe, 'echauffement');
  await store().updateSet(entryId, chauffe, { weightKg: 40, reps: repsEchauffement });
  await store().toggleSetDone(entryId, chauffe);

  await store().updateSet(entryId, travail, { weightKg: 100, reps: 5 });
  await store().toggleSetDone(entryId, travail);
}

describe('echauffement sans repetitions', () => {
  beforeEach(async () => {
    await store().cancel();
    for (const w of await workoutRepo.all()) await workoutRepo.remove(w.id);
    await exerciseRepo.save(SQUAT);
  });

  it('conserve l’echauffement a 0 rep en fin de seance', async () => {
    await seanceEchauffee(0);
    const finie = await store().finish();

    expect(finie?.entries[0]?.sets.map((s) => s.type)).toEqual(['echauffement', 'normale']);
  });

  it('conserve aussi un echauffement dont les reps sont restees vides', async () => {
    await seanceEchauffee(null);
    const finie = await store().finish();

    expect(finie?.entries[0]?.sets).toHaveLength(2);
  });

  it('ecarte en revanche une serie de travail restee a 0', async () => {
    await seanceEchauffee(0);
    const entryId = store().workout!.entries[0]!.id;
    const travail = store().workout!.entries[0]!.sets[1]!.id;
    await store().updateSet(entryId, travail, { reps: 0 });

    const finie = await store().finish();
    expect(finie?.entries[0]?.sets.map((s) => s.type)).toEqual(['echauffement']);
  });

  it('ne compte jamais l’echauffement dans le volume', async () => {
    await seanceEchauffee(0);
    const finie = await store().finish();

    // 100 x 5, et rien de l'echauffement.
    expect(finie?.entries[0]?.sets.filter((s) => s.type === 'echauffement')).toHaveLength(1);
    const volume = finie!.entries[0]!.sets.reduce(
      (sum, s) => sum + (s.type === 'echauffement' ? 0 : (s.weightKg ?? 0) * (s.reps ?? 0)),
      0,
    );
    expect(volume).toBe(500);
  });
});
