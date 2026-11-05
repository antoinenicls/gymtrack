/**
 * Regles structurelles des fiches d'execution.
 *
 * Ces tests ne verifient pas le contenu redactionnel, ils verrouillent deux
 * promesses faites a l'athlete : tout exercice livre a une fiche, et aucune
 * fiche ne prescrit un nombre de repetitions.
 */

import { describe, expect, it } from 'vitest';
import { GUIDES, getGuide } from './index';
import { SEED_EXERCISES } from '@/data/seedExercises';
import { guideKey } from '@/types/guide';

describe('couverture des fiches', () => {
  it('livre une fiche pour chaque exercice du catalogue', () => {
    const manquants = SEED_EXERCISES.filter(
      (exercise) => getGuide(guideKey(exercise.name)) === undefined,
    ).map((exercise) => exercise.name);

    expect(manquants).toEqual([]);
  });

  it('ne contient aucune fiche orpheline', () => {
    const catalogue = new Set(SEED_EXERCISES.map((e) => guideKey(e.name)));
    const orphelines = GUIDES.map((g) => g.key).filter((key) => !catalogue.has(key));

    expect(orphelines).toEqual([]);
  });

  it('n’a pas deux fiches pour la meme cle', () => {
    const cles = GUIDES.map((g) => g.key);
    expect(new Set(cles).size).toBe(cles.length);
  });
});

describe('contenu des fiches', () => {
  it('remplit les sections obligatoires', () => {
    for (const guide of GUIDES) {
      expect(guide.summary.length, guide.key).toBeGreaterThan(0);
      expect(guide.primaryMuscles.length, guide.key).toBeGreaterThan(0);
      expect(guide.setup.length, guide.key).toBeGreaterThan(0);
      expect(guide.execution.length, guide.key).toBeGreaterThan(0);
      expect(guide.cues.length, guide.key).toBeGreaterThan(0);
      expect(guide.mistakes.length, guide.key).toBeGreaterThan(0);
    }
  });

  /**
   * Une fiche decrit comment executer, jamais combien en faire. Le champ
   * repRange a ete supprime du modele : ce test empeche qu'une prescription
   * revienne par le texte libre.
   */
  it('ne prescrit aucun nombre de repetitions', () => {
    const prescription = /\b\d+\s*(a|à|-|et)\s*\d+\s*(reps|repetitions|répétitions)/i;
    const fautives = GUIDES.filter((guide) =>
      [guide.summary, ...guide.setup, ...guide.execution, ...guide.cues, ...guide.mistakes].some(
        (ligne) => prescription.test(ligne),
      ),
    ).map((g) => g.key);

    expect(fautives).toEqual([]);
  });
});
