import { describe, expect, it } from 'vitest';
import { CHIMES, DEFAULT_CHIME, chimeDurationSec, getChime, restChimeSample } from './restChime';

/** Energie efficace du son sur une fenetre, pour raisonner sur ce qu'on entend. */
function energie(id: (typeof CHIMES)[number]['id'], debut: number, fin: number): number {
  let somme = 0;
  let n = 0;
  for (let t = debut; t < fin; t += 1 / 48000) {
    somme += restChimeSample(t, id) ** 2;
    n += 1;
  }
  return n > 0 ? Math.sqrt(somme / n) : 0;
}

describe('le catalogue de sonneries', () => {
  it('propose des identifiants uniques', () => {
    const ids = CHIMES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a une sonnerie par defaut qui existe', () => {
    expect(CHIMES.some((c) => c.id === DEFAULT_CHIME)).toBe(true);
  });

  /**
   * Un identifiant inconnu ne doit JAMAIS rendre l'app muette : une base
   * ecrite par une version qui proposait une sonnerie retiree depuis doit
   * simplement retomber sur celle par defaut.
   */
  it('retombe sur la premiere sonnerie devant un identifiant inconnu', () => {
    expect(getChime(undefined).id).toBe(CHIMES[0]?.id);
    expect(getChime('inexistante' as never).id).toBe(CHIMES[0]?.id);
    expect(chimeDurationSec('inexistante' as never)).toBe(CHIMES[0]?.durationSec);
  });
});

describe.each(CHIMES)('la sonnerie « $label »', (chime) => {
  /**
   * Zero aux deux bouts : sans quoi le tampon commence ou finit sur une marche,
   * et une marche s'entend comme un clic.
   */
  it('part de zero et s’eteint completement', () => {
    expect(restChimeSample(0, chime.id)).toBe(0);
    expect(restChimeSample(chime.durationSec, chime.id)).toBe(0);
    // Un peu avant la fin aussi : l'extinction doit etre engagee, pas brutale.
    expect(Math.abs(restChimeSample(chime.durationSec - 0.01, chime.id))).toBeLessThan(0.05);
  });

  it('ne rend rien hors de sa duree', () => {
    expect(restChimeSample(-0.1, chime.id)).toBe(0);
    expect(restChimeSample(chime.durationSec + 0.1, chime.id)).toBe(0);
  });

  /**
   * Meme niveau de pic pour toutes : changer de sonnerie ne doit pas revenir
   * a changer le volume, sans quoi le choix se ferait sur le mauvais critere.
   */
  it('atteint le meme pic que les autres, sans saturer', () => {
    let peak = 0;
    for (let i = 0; i <= chime.durationSec * 48000; i += 1) {
      peak = Math.max(peak, Math.abs(restChimeSample(i / 48000, chime.id)));
    }
    expect(peak).toBeCloseTo(0.85, 2);
  });

  it('s’entend vraiment, du debut a la fin de son attaque', () => {
    expect(energie(chime.id, 0, 0.03)).toBeGreaterThan(0.05);
  });
});

/**
 * Ce qui rend une sonnerie reconnaissable, c'est son nombre de frappes : on le
 * verifie sur l'energie, qui doit retomber puis repartir entre deux coups.
 */
describe('le nombre de frappes', () => {
  it.each([
    ['cloche', 0.2],
    ['bip', 0.16],
    ['triolet', 0.14],
  ] as const)('« %s » frappe a nouveau a %s s', (id, seconde) => {
    const creux = energie(id, seconde - 0.03, seconde - 0.01);
    const reprise = energie(id, seconde, seconde + 0.02);
    expect(reprise).toBeGreaterThan(creux * 1.5);
  });

  it('« gong » ne frappe qu’une fois', () => {
    expect(getChime('gong').strikes).toHaveLength(1);
  });
});
