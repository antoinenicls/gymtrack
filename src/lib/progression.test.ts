import { describe, expect, it } from 'vitest';
import { suggestProgression } from './progression';
import { makeEntry, makeSet } from './testFactories';

const base = { targetSets: 3, targetReps: 8, availablePlatesKg: [25, 20, 10, 5, 2.5, 1.25] };

describe('suggestProgression', () => {
  it('propose la surcharge quand les cibles sont tenues a RPE 8 ou moins', () => {
    const entry = makeEntry({
      sets: [
        makeSet({ weightKg: 100, reps: 8, rpe: 7 }),
        makeSet({ weightKg: 100, reps: 8, rpe: 8 }),
        makeSet({ weightKg: 100, reps: 8, rpe: 8 }),
      ],
    });
    const suggestion = suggestProgression({ entry, ...base });

    expect(suggestion.kind).toBe('charge');
    expect(suggestion.nextWeightKg).toBe(102.5);
    // Le motif chiffre est la promesse centrale de la methode.
    expect(suggestion.reason).toContain('RPE');
    expect(suggestion.reason).toContain('3 séries');
  });

  it('fait reculer quand la serie a ete payee au prix fort', () => {
    const entry = makeEntry({
      sets: [
        makeSet({ weightKg: 100, reps: 8, rpe: 8 }),
        makeSet({ weightKg: 100, reps: 8, rpe: 10 }),
      ],
    });
    const suggestion = suggestProgression({ entry, ...base });

    expect(suggestion.kind).toBe('recul');
    expect(suggestion.nextWeightKg).toBe(97.5);
  });

  it('consolide quand les cibles passent mais que ca coute cher', () => {
    const entry = makeEntry({
      sets: [
        makeSet({ weightKg: 100, reps: 8, rpe: 9 }),
        makeSet({ weightKg: 100, reps: 8, rpe: 9 }),
        makeSet({ weightKg: 100, reps: 8, rpe: 9 }),
      ],
    });
    const suggestion = suggestProgression({ entry, ...base });

    expect(suggestion.kind).toBe('maintien');
    expect(suggestion.nextWeightKg).toBe(100);
  });

  it('fait gagner les reps avant la charge quand la cible est manquee', () => {
    const entry = makeEntry({
      sets: [
        makeSet({ weightKg: 100, reps: 8, rpe: 8 }),
        makeSet({ weightKg: 100, reps: 5, rpe: 8 }),
      ],
    });
    const suggestion = suggestProgression({ entry, ...base });

    expect(suggestion.kind).toBe('reps');
    expect(suggestion.nextWeightKg).toBe(100);
    expect(suggestion.reason).toContain('5 reps');
  });

  it('reste prudent quand le RPE n est pas renseigne', () => {
    const entry = makeEntry({
      sets: [
        makeSet({ weightKg: 100, reps: 8, rpe: null }),
        makeSet({ weightKg: 100, reps: 8, rpe: null }),
        makeSet({ weightKg: 100, reps: 8, rpe: null }),
      ],
    });
    const suggestion = suggestProgression({ entry, ...base });

    expect(suggestion.kind).toBe('charge');
    expect(suggestion.reason).toContain('non renseigné');
  });

  it('cale l increment sur les disques reellement disponibles', () => {
    const entry = makeEntry({
      sets: [
        makeSet({ weightKg: 100, reps: 8, rpe: 7 }),
        makeSet({ weightKg: 100, reps: 8, rpe: 7 }),
        makeSet({ weightKg: 100, reps: 8, rpe: 7 }),
      ],
    });
    // Salle sans disques sous 5 kg : le plus petit pas possible est +10 kg.
    const suggestion = suggestProgression({ entry, ...base, availablePlatesKg: [20, 10, 5] });
    expect(suggestion.nextWeightKg).toBe(110);
  });

  it('utilise un pas de 2,5 kg hors barre', () => {
    const entry = makeEntry({
      sets: [
        makeSet({ weightKg: 30, reps: 8, rpe: 7 }),
        makeSet({ weightKg: 30, reps: 8, rpe: 7 }),
        makeSet({ weightKg: 30, reps: 8, rpe: 7 }),
      ],
    });
    const suggestion = suggestProgression({ entry, ...base, usesBar: false });
    expect(suggestion.nextWeightKg).toBe(32.5);
  });

  it('ne suggere rien sans serie validee', () => {
    const entry = makeEntry({ sets: [makeSet({ done: false })] });
    expect(suggestProgression({ entry, ...base }).kind).toBe('donnees-insuffisantes');
  });

  it('ignore l echauffement dans le verdict', () => {
    const entry = makeEntry({
      sets: [
        makeSet({ type: 'echauffement', weightKg: 60, reps: 5, rpe: 3 }),
        makeSet({ weightKg: 100, reps: 8, rpe: 8 }),
        makeSet({ weightKg: 100, reps: 8, rpe: 8 }),
        makeSet({ weightKg: 100, reps: 8, rpe: 8 }),
      ],
    });
    const suggestion = suggestProgression({ entry, ...base });
    expect(suggestion.kind).toBe('charge');
    expect(suggestion.reason).toContain('3 séries');
  });

  it('gere une seance libre sans cible definie', () => {
    const entry = makeEntry({ sets: [makeSet({ weightKg: 100, reps: 8, rpe: 7 })] });
    const suggestion = suggestProgression({ entry, targetSets: null, targetReps: null });
    expect(suggestion.kind).toBe('charge');
  });
});
