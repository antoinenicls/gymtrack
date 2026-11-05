import { describe, expect, it } from 'vitest';
import { previousFill } from './previousFill';
import { makeSet } from './testFactories';

describe('reprise de la serie precedente', () => {
  it('recopie la charge et les repetitions', () => {
    expect(previousFill(makeSet({ weightKg: 82.5, reps: 9 }))).toEqual({
      weightKg: 82.5,
      reps: 9,
    });
  });

  it('ne recopie ni le RPE, ni le type, ni la validation', () => {
    const patch = previousFill(makeSet({ rpe: 9, type: 'echec', done: true }));
    expect(patch).not.toHaveProperty('rpe');
    expect(patch).not.toHaveProperty('type');
    expect(patch).not.toHaveProperty('done');
  });

  it('n’efface pas la charge du jour quand la fois d’avant n’en portait pas', () => {
    // Traction lestee : la derniere fois c'etait au poids du corps, mais
    // aujourd'hui l'athlete a deja saisi ses kilos. Reprendre les reps ne doit
    // pas les lui reprendre.
    expect(previousFill(makeSet({ weightKg: null, reps: 12 }))).toEqual({ reps: 12 });
  });

  it('ne propose rien sur une serie passee entierement vide', () => {
    expect(previousFill(makeSet({ weightKg: null, reps: null }))).toBeNull();
  });

  it('ne propose rien quand il n’y a pas de seance precedente', () => {
    expect(previousFill(null)).toBeNull();
  });
});
