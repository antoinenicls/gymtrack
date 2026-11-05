import { describe, expect, it } from 'vitest';
import { timeAgo } from './timeAgo';

/** Le 14 mai 2026 a 18 h 00, heure locale. Point de reference de tout le fichier. */
const MAINTENANT = new Date(2026, 4, 14, 18, 0).getTime();

const MINUTE = 60_000;
const HEURE = 60 * MINUTE;

/** Un instant de la journee, en jours d'ecart avec le 14 mai. */
const jour = (decalage: number, heure = 18, minute = 0): number =>
  new Date(2026, 4, 14 + decalage, heure, minute).getTime();

describe('timeAgo', () => {
  it('compte en heures tant qu’on est le meme jour', () => {
    expect(timeAgo(MAINTENANT - 12 * HEURE, MAINTENANT)).toBe('il y a 12 heures');
    expect(timeAgo(MAINTENANT - 1 * HEURE, MAINTENANT)).toBe('il y a une heure');
  });

  it('descend a la minute pour ce qui vient de se terminer', () => {
    expect(timeAgo(MAINTENANT - 20 * MINUTE, MAINTENANT)).toBe('il y a 20 minutes');
    expect(timeAgo(MAINTENANT - 1 * MINUTE, MAINTENANT)).toBe('il y a une minute');
    expect(timeAgo(MAINTENANT - 5_000, MAINTENANT)).toBe('à l’instant');
  });

  it('dit « hier » pour la journee d’hier, quelle qu’en soit l’heure', () => {
    expect(timeAgo(jour(-1, 7), MAINTENANT)).toBe('hier');
    expect(timeAgo(jour(-1, 23), MAINTENANT)).toBe('hier');
  });

  it('compte les jours de calendrier, pas les tranches de 24 h', () => {
    // 41 h en arriere, mais toujours la journee d'hier : c'est ce qu'on dit.
    expect(timeAgo(jour(-2, 22, 30), MAINTENANT)).toBe('il y a 2 jours');
    expect(timeAgo(jour(-3), MAINTENANT)).toBe('il y a 3 jours');
    expect(timeAgo(jour(-6), MAINTENANT)).toBe('il y a 6 jours');
  });

  it('rend la main a la date une fois la semaine passee', () => {
    expect(timeAgo(jour(-7), MAINTENANT)).toBeNull();
    expect(timeAgo(jour(-30), MAINTENANT)).toBeNull();
    expect(timeAgo(new Date(1999, 0, 1).getTime(), MAINTENANT)).toBeNull();
  });

  it('ne part pas en negatif si l’horloge du telephone avance', () => {
    expect(timeAgo(MAINTENANT + 3 * MINUTE, MAINTENANT)).toBe('à l’instant');
  });

  it('bascule sur « hier » au passage de minuit, pas 24 h apres', () => {
    // Seance de ce matin 8 h relue a midi : le minuit n'a pas ete franchi,
    // l'heure situe mieux que le jour.
    const midi = new Date(2026, 4, 14, 12, 0).getTime();
    expect(timeAgo(jour(0, 8), midi)).toBe('il y a 4 heures');
    // Seance d'hier 20 h relue ce matin a 8 h : douze heures seulement, mais
    // un minuit franchi, donc « hier ».
    const matin = new Date(2026, 4, 14, 8, 0).getTime();
    expect(timeAgo(jour(-1, 20), matin)).toBe('hier');
  });
});
