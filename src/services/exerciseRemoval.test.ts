/**
 * Suppression d'un exercice de la bibliotheque.
 *
 * Le cas verrouille ici ne se voit PAS a l'ecran au moment ou il casse : un
 * exercice livre supprime aujourd'hui ne reapparaitrait qu'a la prochaine
 * montee de SEED_VERSION, des mois plus tard, sans que personne ne relie les
 * deux. C'est exactement le genre de regression qu'un test doit tenir.
 */

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { exerciseRepo, settingsRepo } from './repositories';
import { getDb } from './db';

async function resetDb(): Promise<void> {
  const db = await getDb();
  for (const store of ['exercises', 'settings'] as const) {
    const tx = db.transaction(store, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
}

describe('suppression d un exercice', () => {
  beforeEach(resetDb);

  it('retire un exercice perso sans laisser de pierre tombale', async () => {
    const perso = await exerciseRepo.create({
      name: 'Rowing Yates maison',
      muscleGroup: 'dos',
      equipment: 'barre',
      defaultRestSec: 120,
      isCustom: true,
    });

    await exerciseRepo.remove(perso.id);

    expect(await exerciseRepo.get(perso.id)).toBeUndefined();
    // Rien a memoriser : le seed ne recreera jamais un exercice qu'il n'a pas
    // ecrit, la liste doit donc rester vide plutot que de grossir pour rien.
    expect((await settingsRepo.get()).deletedSeedNames ?? []).toEqual([]);
  });

  it('memorise la suppression d un exercice LIVRE', async () => {
    const livre = await exerciseRepo.create({
      name: 'Développé couché',
      muscleGroup: 'pectoraux',
      equipment: 'barre',
      defaultRestSec: 180,
      isCustom: false,
    });

    await exerciseRepo.remove(livre.id);

    expect((await settingsRepo.get()).deletedSeedNames).toContain('développé couché');
  });

  it('ne reinjecte pas un exercice livre supprime', async () => {
    const livre = await exerciseRepo.create({
      name: 'Développé couché',
      muscleGroup: 'pectoraux',
      equipment: 'barre',
      defaultRestSec: 180,
      isCustom: false,
    });
    await exerciseRepo.remove(livre.id);

    // On simule une montee de catalogue : le seed se rejoue entierement.
    const settings = await settingsRepo.get();
    await settingsRepo.save({ ...settings, seedVersion: 0 });
    await exerciseRepo.seedIfNeeded();

    const noms = (await exerciseRepo.all()).map((e) => e.name.toLowerCase());
    expect(noms).not.toContain('développé couché');
    // Le reste du catalogue, lui, doit bien avoir ete seme.
    expect(noms.length).toBeGreaterThan(0);
  });

  it('ne memorise pas deux fois le meme nom', async () => {
    for (const _ of [0, 1]) {
      const livre = await exerciseRepo.create({
        name: 'Squat barre',
        muscleGroup: 'quadriceps',
        equipment: 'barre',
        defaultRestSec: 180,
        isCustom: false,
      });
      await exerciseRepo.remove(livre.id);
    }

    const noms = (await settingsRepo.get()).deletedSeedNames ?? [];
    expect(noms.filter((n) => n === 'squat barre')).toHaveLength(1);
  });
});
