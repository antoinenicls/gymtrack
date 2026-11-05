import { describe, expect, it } from 'vitest';
import { restBelongsTo, restRemainingMs } from './restTimer';
import type { RestTimerState } from '@/types/domain';

const timer = (over: Partial<RestTimerState> = {}): RestTimerState => ({
  endsAt: Date.now() + 60_000,
  totalSec: 120,
  entryId: 'entry-1',
  setId: 'set-1',
  ...over,
});

describe('restRemainingMs', () => {
  const MAINTENANT = 1_000_000;

  it('derive le reste de l’echeance', () => {
    expect(restRemainingMs(timer({ endsAt: MAINTENANT + 45_000 }), MAINTENANT)).toBe(45_000);
  });

  it('lit la valeur figee quand le chrono est en pause', () => {
    // L'echeance ne veut plus rien dire pendant l'arret : elle recule.
    const arrete = timer({ endsAt: MAINTENANT - 30_000, pausedRemainingMs: 86_000 });
    expect(restRemainingMs(arrete, MAINTENANT)).toBe(86_000);
  });

  it('ne rend jamais plus que la duree du repos', () => {
    // Le cas signale : relance apres cinq secondes de pause, le chrono
    // affichait cinq secondes de trop le temps d'un battement, parce que
    // l'horloge lue etait restee sur l'instant de la mise en pause.
    const relance = timer({ totalSec: 120, endsAt: MAINTENANT + 125_000 });
    expect(restRemainingMs(relance, MAINTENANT)).toBe(120_000);
  });

  it('ne descend pas sous zero une fois le repos ecoule', () => {
    expect(restRemainingMs(timer({ endsAt: MAINTENANT - 9_000 }), MAINTENANT)).toBe(0);
  });

  it('ne rend rien sans chrono', () => {
    expect(restRemainingMs(null, MAINTENANT)).toBe(0);
  });
});

describe('restBelongsTo', () => {
  it('reconnait la serie qui a lance le chrono', () => {
    expect(restBelongsTo(timer(), 'entry-1', 'set-1')).toBe(true);
  });

  it('ignore une autre serie du MEME exercice', () => {
    // Le cas qui compte : trois series enchainees, on decoche la premiere.
    // Le repos en cours appartient a la troisieme, il doit continuer.
    expect(restBelongsTo(timer({ setId: 'set-3' }), 'entry-1', 'set-1')).toBe(false);
  });

  it('ignore une serie d un autre exercice', () => {
    expect(restBelongsTo(timer(), 'entry-2', 'set-9')).toBe(false);
  });

  it('ne fait rien sans chrono en cours', () => {
    expect(restBelongsTo(null, 'entry-1', 'set-1')).toBe(false);
  });

  it('retombe sur l exercice pour un chrono d avant la mise a jour', () => {
    // Seance deja en cours lors du deploiement : le chrono persiste n'a pas de
    // setId. On ne peut pas faire mieux que l'exercice, et c'est suffisant.
    expect(restBelongsTo(timer({ setId: undefined }), 'entry-1', 'set-1')).toBe(true);
    expect(restBelongsTo(timer({ setId: undefined }), 'entry-2', 'set-1')).toBe(false);
  });
});
