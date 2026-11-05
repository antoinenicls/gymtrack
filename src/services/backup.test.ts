/**
 * Sauvegarde et restauration.
 *
 * C'est la seule porte de sortie des donnees d'une app 100 % locale : une
 * regression ici ne se voit pas a l'ecran, elle se decouvre le jour ou
 * quelqu'un change de telephone et constate qu'il lui manque la moitie de son
 * historique. D'ou le niveau de detail des cas ci-dessous.
 */

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildBackup,
  parseBackup,
  restoreBackup,
  summarizeBackup,
  type BackupFile,
} from './backup';
import { exerciseRepo, routineRepo, settingsRepo, workoutRepo } from './repositories';
import { DB_VERSION, getDb } from './db';

async function resetDb(): Promise<void> {
  const db = await getDb();
  for (const name of Array.from(db.objectStoreNames)) {
    const tx = db.transaction(name as never, 'readwrite');
    await tx.objectStore(name as never).clear();
    await tx.done;
  }
}

const seance = (id: string, name: string) => ({
  id,
  name,
  routineId: null,
  startedAt: Date.now(),
  endedAt: Date.now(),
  durationSec: 3600,
  notes: '',
  entries: [],
});

describe('buildBackup', () => {
  beforeEach(resetDb);

  it('embarque TOUS les magasins de la base', async () => {
    // Le coeur du sujet : le parcours est generique, donc un magasin ajoute
    // plus tard doit se retrouver dans le fichier sans qu'on y touche.
    const db = await getDb();
    const backup = await buildBackup();
    for (const name of Array.from(db.objectStoreNames)) {
      expect(Object.keys(backup.stores)).toContain(name);
    }
  });

  it('emporte les seances et les routines', async () => {
    await workoutRepo.save(seance('w-1', 'Push A'));
    await routineRepo.save({
      id: 'r-1',
      name: 'Pull B',
      folderId: null,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastPerformedAt: null,
    });

    const backup = await buildBackup();
    expect(backup.stores.workouts).toHaveLength(1);
    expect(backup.stores.routines).toHaveLength(1);
    expect(backup.format).toBe('gymtrack-backup');
    expect(backup.schemaVersion).toBe(DB_VERSION);
  });
});

describe('parseBackup', () => {
  it('refuse un fichier qui n est pas du JSON', () => {
    expect(() => parseBackup('bonjour')).toThrow(/pas lisible/);
  });

  it('refuse un JSON qui n est pas une sauvegarde', () => {
    expect(() => parseBackup('{"foo":1}')).toThrow(/pas une sauvegarde/);
  });

  it('refuse une sauvegarde d une version PLUS RECENTE', () => {
    // Les migrations IndexedDB ne rejouent pas a l'insertion : accepter ces
    // donnees les ferait entrer sans conversion, et casserait en silence.
    const futur = JSON.stringify({
      format: 'gymtrack-backup',
      schemaVersion: DB_VERSION + 1,
      exportedAt: '',
      stores: {},
    });
    expect(() => parseBackup(futur)).toThrow(/plus récente/);
  });

  it('refuse une sauvegarde d une version plus ancienne', () => {
    const ancien = JSON.stringify({
      format: 'gymtrack-backup',
      schemaVersion: DB_VERSION - 1,
      exportedAt: '',
      stores: {},
    });
    expect(() => parseBackup(ancien)).toThrow(/plus ancienne/);
  });

  it('accepte une sauvegarde de la bonne version', () => {
    const bon = JSON.stringify({
      format: 'gymtrack-backup',
      schemaVersion: DB_VERSION,
      exportedAt: '',
      stores: { workouts: [] },
    });
    expect(parseBackup(bon).schemaVersion).toBe(DB_VERSION);
  });
});

describe('restoreBackup', () => {
  beforeEach(resetDb);

  it('rend exactement l etat sauvegarde', async () => {
    await workoutRepo.save(seance('w-1', 'Push A'));
    await workoutRepo.save(seance('w-2', 'Pull B'));
    const backup = await buildBackup();

    await resetDb();
    expect(await workoutRepo.all()).toHaveLength(0);

    await restoreBackup(backup);
    const noms = (await workoutRepo.all()).map((w) => w.name).sort();
    expect(noms).toEqual(['Pull B', 'Push A']);
  });

  it('REMPLACE au lieu de fusionner', async () => {
    // Le telephone d'arrivee a deja des donnees : elles disparaissent. C'est
    // le comportement annonce a l'utilisateur, et il evite des doublons
    // impossibles a demeler ensuite.
    await workoutRepo.save(seance('w-1', 'Ancienne'));
    const backup = await buildBackup();

    await resetDb();
    await workoutRepo.save(seance('w-9', 'Seance du nouveau telephone'));

    await restoreBackup(backup);
    const noms = (await workoutRepo.all()).map((w) => w.name);
    expect(noms).toEqual(['Ancienne']);
  });

  it('preserve les reglages', async () => {
    const settings = await settingsRepo.get();
    await settingsRepo.save({ ...settings, weeklyGoal: 5, rpeEnabled: false });
    const backup = await buildBackup();

    await resetDb();
    await restoreBackup(backup);

    const restored = await settingsRepo.get();
    expect(restored.weeklyGoal).toBe(5);
    expect(restored.rpeEnabled).toBe(false);
  });

  it('preserve les exercices personnels et leurs notes', async () => {
    await exerciseRepo.create({
      name: 'Rowing Yates maison',
      muscleGroup: 'dos',
      equipment: 'barre',
      defaultRestSec: 120,
      isCustom: true,
      notes: 'Siège au cran 4',
    });
    const backup = await buildBackup();

    await resetDb();
    await restoreBackup(backup);

    const restored = (await exerciseRepo.all()).find((e) => e.name === 'Rowing Yates maison');
    expect(restored?.notes).toBe('Siège au cran 4');
  });
});

describe('summarizeBackup', () => {
  it('annonce ce que contient le fichier', () => {
    const backup: BackupFile = {
      format: 'gymtrack-backup',
      schemaVersion: DB_VERSION,
      exportedAt: '',
      stores: { workouts: [1, 2, 3], routines: [1], exercises: [] },
    };
    const { total, detail } = summarizeBackup(backup);
    expect(total).toBe(4);
    expect(detail).toContain('3 séances');
    expect(detail).toContain('1 routine');
    // Un magasin vide ne s'annonce pas : « 0 exercice » n'apprend rien.
    expect(detail).not.toContain('exercice');
  });
});
