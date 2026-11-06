import { describe, expect, it } from 'vitest';
import { formatEffort, fromScale, toScale } from './effort';

describe('échelle d’effort', () => {
  it('RIR = 10 - RPE', () => {
    expect(toScale(8, 'rir')).toBe(2);
    expect(toScale(10, 'rir')).toBe(0);
    expect(toScale(8.5, 'rir')).toBe(1.5);
    expect(toScale(8, 'rpe')).toBe(8);
  });

  it('stocke toujours du RPE, quelle que soit l’échelle saisie', () => {
    expect(fromScale(2, 'rir')).toBe(8);
    expect(fromScale(0, 'rir')).toBe(10);
    expect(fromScale(7.5, 'rpe')).toBe(7.5);
  });

  it('borne les saisies hors échelle', () => {
    expect(fromScale(12, 'rir')).toBe(1);
    expect(fromScale(-1, 'rir')).toBe(10);
    expect(fromScale(12, 'rpe')).toBe(10);
  });

  it('laisse passer l’absence de valeur', () => {
    expect(toScale(null, 'rir')).toBeNull();
    expect(fromScale(null, 'rir')).toBeNull();
  });

  it('formate à la française', () => {
    expect(formatEffort(8.5, 'rpe')).toBe('RPE 8,5');
    expect(formatEffort(8.5, 'rir')).toBe('RIR 1,5');
    expect(formatEffort(10, 'rir')).toBe('RIR 0');
  });
});
