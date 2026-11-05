import { describe, expect, it } from 'vitest';
import { generateWarmup } from './warmup';

describe('generateWarmup', () => {
  it('monte en charge en descendant en volume', () => {
    const sets = generateWarmup(100, { barKg: 20 });
    expect(sets.map((s) => s.reps)).toEqual([5, 2]);

    const weights = sets.map((s) => s.weightKg);
    expect(weights).toEqual([...weights].sort((a, b) => a - b));
    expect(weights.every((w) => w < 100)).toBe(true);
  });

  it('ne genere jamais plus de deux series', () => {
    // Balaie large : aucune charge, avec ou sans barre, ne doit en produire 3.
    for (const charge of [25, 30, 42.5, 60, 100, 180, 300]) {
      expect(generateWarmup(charge, { barKg: 20 }).length).toBeLessThanOrEqual(2);
      expect(generateWarmup(charge, { usesBar: false }).length).toBeLessThanOrEqual(2);
    }
  });

  it('n arrondit qu a des charges reellement chargeables', () => {
    const sets = generateWarmup(100, { barKg: 20, availablePlatesKg: [20, 10, 5] });
    // Avec ce jeu, tout doit tomber sur un multiple de 10 au-dessus de la barre.
    for (const set of sets) {
      expect((set.weightKg - 20) % 10).toBe(0);
    }
  });

  it('ne propose pas de s echauffer sous la barre a vide', () => {
    expect(generateWarmup(20, { barKg: 20 })).toEqual([]);
    expect(generateWarmup(15, { barKg: 20 })).toEqual([]);
  });

  it('ecarte les paliers en doublon apres arrondi', () => {
    const sets = generateWarmup(30, { barKg: 20 });
    const weights = sets.map((s) => s.weightKg);
    expect(new Set(weights).size).toBe(weights.length);
  });

  it('descend au demi-kilo pour les halteres', () => {
    const sets = generateWarmup(30, { usesBar: false });
    expect(sets.map((s) => s.weightKg)).toEqual([15, 24]);
  });

  it('rejette une charge absurde', () => {
    expect(generateWarmup(0)).toEqual([]);
    expect(generateWarmup(-50)).toEqual([]);
    expect(generateWarmup(Number.NaN)).toEqual([]);
  });
});
