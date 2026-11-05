import { describe, expect, it } from 'vitest';
import { formatElapsed } from './metrics';

describe('formatElapsed', () => {
  it('suit la progression demandee', () => {
    expect(formatElapsed(7)).toBe('0:07');
    expect(formatElapsed(45)).toBe('0:45');
    expect(formatElapsed(200)).toBe('3:20');
    expect(formatElapsed(2535)).toBe('42:15');
    expect(formatElapsed(3930)).toBe('1:05:30');
  });

  it('garde les secondes AU-DELA de l heure', () => {
    // Le defaut corrige : `formatDuration` abrege en « 1h05 » et le chrono
    // semblait bloque pendant soixante secondes.
    expect(formatElapsed(3600)).toBe('1:00:00');
    expect(formatElapsed(3601)).toBe('1:00:01');
  });

  it('affiche zero proprement', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(-5)).toBe('0:00');
  });

  it('passe a trois chiffres d heures sans casser', () => {
    expect(formatElapsed(36000)).toBe('10:00:00');
  });
});
