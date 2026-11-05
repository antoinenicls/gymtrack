import { describe, expect, it } from 'vitest';
import { computePlates, groupPlates, smallestIncrementKg } from './plates';

describe('computePlates', () => {
  it('charge par paires, pas par cote', () => {
    // 100 kg sur barre de 20 : 80 kg a repartir, donc 40 par cote.
    const result = computePlates(100, 20);
    expect(result.perSide).toEqual([25, 15]);
    expect(result.achievedKg).toBe(100);
    expect(result.exact).toBe(true);
  });

  it('rend la barre a vide sans disque', () => {
    const result = computePlates(20, 20);
    expect(result.perSide).toEqual([]);
    expect(result.achievedKg).toBe(20);
    expect(result.exact).toBe(true);
  });

  it('signale une cible sous la barre a vide au lieu de bricoler', () => {
    const result = computePlates(15, 20);
    expect(result.belowBar).toBe(true);
    expect(result.perSide).toEqual([]);
  });

  it('avoue l ecart quand la cible n est pas atteignable', () => {
    // 101 kg n'existe pas avec des disques standard.
    const result = computePlates(101, 20);
    expect(result.exact).toBe(false);
    expect(Math.abs(result.deltaKg)).toBeLessThanOrEqual(2.5);
  });

  it('ne laisse pas les miettes flottantes de 1.25 casser le resultat', () => {
    const result = computePlates(62.5, 20);
    const total = result.perSide.reduce((a, b) => a + b, 0) * 2 + 20;
    expect(total).toBeCloseTo(62.5, 6);
    expect(result.exact).toBe(true);
  });

  it('respecte un jeu de disques limite', () => {
    const result = computePlates(100, 20, [20, 10]);
    expect(result.perSide).toEqual([20, 20]);
    expect(result.achievedKg).toBe(100);
  });

  it('gere la barre de 15 kg', () => {
    const result = computePlates(75, 15);
    expect(result.achievedKg).toBe(75);
    expect(result.exact).toBe(true);
  });

  it('rejette une cible absurde', () => {
    expect(computePlates(0, 20).belowBar).toBe(true);
    expect(computePlates(Number.NaN, 20).belowBar).toBe(true);
  });
});

describe('groupPlates', () => {
  it('compacte les doublons pour l affichage', () => {
    expect(groupPlates([25, 25, 10, 2.5])).toEqual([
      { plateKg: 25, count: 2 },
      { plateKg: 10, count: 1 },
      { plateKg: 2.5, count: 1 },
    ]);
  });
});

describe('smallestIncrementKg', () => {
  it('vaut deux fois le plus petit disque', () => {
    expect(smallestIncrementKg([25, 20, 5, 1.25])).toBe(2.5);
    expect(smallestIncrementKg([20, 10, 5])).toBe(10);
  });

  it('ne divise pas par un jeu vide', () => {
    expect(smallestIncrementKg([])).toBe(0);
  });
});
