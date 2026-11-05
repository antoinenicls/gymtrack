import { describe, expect, it } from 'vitest';
import { estimateE1rm, e1rmValue, weightForReps } from './e1rm';

describe('estimateE1rm (Brzycki)', () => {
  it('renvoie le poids brut a 1 rep, sans passer par la formule', () => {
    expect(estimateE1rm(100, 1)).toEqual({ value: 100, reliable: true });
  });

  it('applique la formule du brief', () => {
    // 100 / (1.0278 - 0.0278 x 8) = 100 / 0.8054 = 124.16
    expect(estimateE1rm(100, 8)?.value).toBeCloseTo(124.2, 1);
  });

  it('classe une serie longue comme non fiable sans refuser de la calculer', () => {
    const result = estimateE1rm(60, 20);
    expect(result).not.toBeNull();
    expect(result?.reliable).toBe(false);
  });

  it('refuse le domaine ou le denominateur s annule ou devient negatif', () => {
    // 1.0278 / 0.0278 = 36.97 : au-dela, la formule renverrait un 1RM negatif.
    expect(estimateE1rm(60, 37)).toBeNull();
    expect(estimateE1rm(60, 50)).toBeNull();
  });

  it('rejette les entrees absurdes plutot que de propager un NaN', () => {
    expect(estimateE1rm(0, 5)).toBeNull();
    expect(estimateE1rm(-20, 5)).toBeNull();
    expect(estimateE1rm(100, 0)).toBeNull();
    expect(estimateE1rm(Number.NaN, 5)).toBeNull();
    expect(estimateE1rm(100, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('e1rmValue retombe sur 0 au lieu de propager null', () => {
    expect(e1rmValue(0, 0)).toBe(0);
    expect(e1rmValue(100, 1)).toBe(100);
  });

  it('compare honnetement deux series de formats differents', () => {
    // Le point de tout le E1RM : 90x8 est un meilleur effort que 100x3.
    expect(e1rmValue(90, 8)).toBeGreaterThan(e1rmValue(100, 3));
  });
});

describe('weightForReps', () => {
  it('fait l aller-retour avec estimateE1rm', () => {
    const e1rm = e1rmValue(100, 5);
    expect(weightForReps(e1rm, 5)).toBeCloseTo(100, 0);
  });

  it('rejette un E1RM nul ou un domaine invalide', () => {
    expect(weightForReps(0, 5)).toBeNull();
    expect(weightForReps(150, 40)).toBeNull();
  });
});
