/**
 * Regles du catalogue par enseigne.
 *
 * L'enjeu de ces tests n'est pas la completude du releve, qui est partielle et
 * assumee, mais sa SEMANTIQUE : une information manquante ne doit jamais se
 * transformer en affirmation d'absence.
 */

import { describe, expect, it } from 'vitest';
import { GYM_CATALOG, confirmedCount, gymAlias, gymPresence } from './gymCatalog';
import { SEED_EXERCISES } from './seedExercises';
import { guideKey } from '@/types/guide';
import { GYM_BRANDS } from '@/types/gym';

describe('coherence du catalogue', () => {
  it('ne reference que des exercices existants', () => {
    const catalogue = new Set(SEED_EXERCISES.map((e) => guideKey(e.name)));
    const inconnus = GYM_CATALOG.map((e) => e.key).filter((key) => !catalogue.has(key));

    expect(inconnus).toEqual([]);
  });

  it('n’a pas deux entrees pour le meme mouvement', () => {
    const cles = GYM_CATALOG.map((e) => e.key);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it('ne declare jamais une enseigne a la fois presente et absente', () => {
    for (const entry of GYM_CATALOG) {
      const contradictions = (entry.absent ?? []).filter((b) => entry.present.includes(b));
      expect(contradictions, entry.key).toEqual([]);
    }
  });

  it('n’attache un alias qu’a une enseigne ou le mouvement existe', () => {
    for (const entry of GYM_CATALOG) {
      for (const brand of Object.keys(entry.aliases ?? {}) as typeof GYM_BRANDS) {
        expect(entry.present, `${entry.key} / ${brand}`).toContain(brand);
      }
    }
  });
});

describe('lecture de la disponibilite', () => {
  it('renvoie inconnu, et non absent, pour un mouvement non releve', () => {
    // Volontairement laisse hors du releve tant que personne ne l'a verifie.
    expect(gymPresence('hack-squat', 'basic-fit')).toBe('inconnu');
    expect(gymPresence('rowing-t-bar', 'fitness-park')).toBe('inconnu');
    expect(gymPresence('mouvement-qui-nexiste-pas', 'on-air')).toBe('inconnu');
  });

  it('renvoie present pour un mouvement confirme', () => {
    for (const brand of GYM_BRANDS) {
      expect(gymPresence('presse-a-cuisses', brand)).toBe('present');
      expect(gymPresence('developpe-couche', brand)).toBe('present');
    }
  });

  it('ne renvoie aucun alias tant qu’aucun n’a ete releve sur place', () => {
    // Se mettra a echouer le jour ou un alias sera saisi : il faudra alors
    // remplacer cette assertion par une verification de l'alias attendu.
    const avecAlias = GYM_CATALOG.filter((e) => e.aliases !== undefined);
    expect(avecAlias).toEqual([]);
    expect(gymAlias('presse-a-cuisses', 'basic-fit')).toBeUndefined();
  });

  it('compte les mouvements confirmes par enseigne', () => {
    for (const brand of GYM_BRANDS) {
      expect(confirmedCount(brand)).toBe(GYM_CATALOG.length);
    }
  });
});
