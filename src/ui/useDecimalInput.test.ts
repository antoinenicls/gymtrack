/**
 * Le coeur du champ decimal, teste sans DOM : la normalisation d'une frappe.
 *
 * C'est elle qui portait le bug. Un champ controle sur la valeur RELUE
 * effacait la virgule a l'instant ou on la tapait, et 37,5 kg etait impossible
 * a saisir.
 */

import { describe, expect, it } from 'vitest';
import { normaliseDecimal } from './useDecimalInput';

describe('saisie decimale', () => {
  it('garde la virgule pendant la frappe', () => {
    // Les etats intermediaires comptent autant que le resultat : c'est en
    // passant par « 37, » qu'on ecrit « 37,5 ».
    expect(normaliseDecimal('3', 2)).toBe('3');
    expect(normaliseDecimal('37', 2)).toBe('37');
    expect(normaliseDecimal('37,', 2)).toBe('37,');
    expect(normaliseDecimal('37,5', 2)).toBe('37,5');
  });

  it('accepte le point et le rend en virgule', () => {
    // Selon la langue du clavier, iOS envoie l'un ou l'autre.
    expect(normaliseDecimal('37.5', 2)).toBe('37,5');
  });

  it('plafonne le nombre de decimales', () => {
    expect(normaliseDecimal('37,25', 2)).toBe('37,25');
    expect(normaliseDecimal('37,256', 2)).toBe('37,25');
    // Un RPE se note au demi-point.
    expect(normaliseDecimal('7,55', 1)).toBe('7,5');
    // Une repetition ne se coupe pas en deux.
    expect(normaliseDecimal('8,5', 0)).toBe('8');
  });

  it('absorbe les virgules en trop plutot que de bloquer la saisie', () => {
    expect(normaliseDecimal('37,,5', 2)).toBe('37,5');
    expect(normaliseDecimal('37,5,2', 2)).toBe('37,52');
  });

  it('ignore tout ce qui n’est pas un chiffre', () => {
    expect(normaliseDecimal('37kg', 2)).toBe('37');
    expect(normaliseDecimal('-37', 2)).toBe('37');
    expect(normaliseDecimal('', 2)).toBe('');
  });
});
