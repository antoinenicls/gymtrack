/**
 * Le descriptif d'une seance est UNE valeur, partagee avec sa routine.
 *
 * La regle tenue ici : le corriger d'un cote le corrige de l'autre, dans les
 * deux sens et sans condition. Une premiere version protegeait le texte saisi
 * pendant la seance ; c'etait un contresens, « proteger » revenait a
 * desynchroniser les deux affichages, ce que l'utilisateur lisait comme une
 * perte de sa modification.
 */

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkoutStore } from './workoutStore';
import { routineRepo } from '@/services/repositories';
import type { Routine } from '@/types/domain';

const ROUTINE: Routine = {
  id: 'r-push',
  name: 'PUSH A',
  description: 'Descriptif initial',
  folderId: null,
  items: [],
  createdAt: 1,
  updatedAt: 1,
  lastPerformedAt: null,
};

const store = () => useWorkoutStore.getState();

async function lancer(description: string | undefined): Promise<void> {
  const routine = { ...ROUTINE, description };
  await routineRepo.save(routine);
  await store().startFromRoutine(routine);
}

const descriptifEnBase = async (): Promise<string | undefined> =>
  (await routineRepo.get(ROUTINE.id))?.description;

describe('descriptif partage entre la seance et sa routine', () => {
  beforeEach(async () => {
    await store().cancel();
  });

  it('recopie le descriptif au lancement', async () => {
    await lancer('Consigne du jour');
    expect(store().workout?.notes).toBe('Consigne du jour');
  });

  it('ecrit sur la routine ce qui est saisi pendant la seance', async () => {
    await lancer('Avant');
    await store().setDescription('Corrigé pendant la séance');

    expect(store().workout?.notes).toBe('Corrigé pendant la séance');
    expect(await descriptifEnBase()).toBe('Corrigé pendant la séance');
  });

  it('remonte aussi un descriptif ecrit alors qu’il etait vide', async () => {
    await lancer(undefined);
    await store().setDescription('Ajouté en cours de route');

    expect(await descriptifEnBase()).toBe('Ajouté en cours de route');
  });

  it('efface le descriptif de la routine quand on vide le champ', async () => {
    await lancer('Avant');
    await store().setDescription('');

    // `undefined` et non chaine vide : « efface » et « jamais renseigne »
    // doivent rester le meme etat, comme partout ailleurs dans l'app.
    expect(await descriptifEnBase()).toBeUndefined();
  });

  it('ne touche a aucune routine depuis une seance libre', async () => {
    await routineRepo.save(ROUTINE);
    await store().startEmpty();
    await store().setDescription('Note de seance libre');

    expect(store().workout?.notes).toBe('Note de seance libre');
    expect(await descriptifEnBase()).toBe('Descriptif initial');
  });

  it('repercute sur la seance en cours une modification de la routine', async () => {
    await lancer('Avant');
    const change = await store().applyRoutineDescription('r-push', 'Après');

    expect(change).toBe(true);
    expect(store().workout?.notes).toBe('Après');
  });

  it('ecrase meme un texte saisi pendant la seance, les deux ne font qu’un', async () => {
    await lancer('Avant');
    await store().setDescription('Saisi pendant la séance');

    await store().applyRoutineDescription('r-push', 'Décidé depuis l’éditeur');
    expect(store().workout?.notes).toBe('Décidé depuis l’éditeur');
  });

  it('ignore une seance issue d’une AUTRE routine', async () => {
    await lancer('Avant');
    const change = await store().applyRoutineDescription('r-autre', 'Après');

    expect(change).toBe(false);
    expect(store().workout?.notes).toBe('Avant');
  });

  it('ne fait rien quand aucune seance n’est en cours', async () => {
    expect(await store().applyRoutineDescription('r-push', 'Après')).toBe(false);
  });
});
