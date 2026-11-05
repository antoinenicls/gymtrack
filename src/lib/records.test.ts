import { describe, expect, it } from 'vitest';
import {
  checkSessionVolumeForPr,
  checkSetForPr,
  emptyRecord,
  monthRecords,
  rebuildRecords,
  replayEntryPrs,
  replayMonthPrs,
} from './records';
import { makeEntry, makeSet, makeWorkout } from './testFactories';
import type { Workout } from '@/types/domain';

const AT = Date.parse('2026-07-19T10:00:00Z');

describe('checkSetForPr', () => {
  it('declare les deux records sur la toute premiere serie', () => {
    const { kinds, next } = checkSetForPr(makeSet({ weightKg: 100, reps: 5 }), emptyRecord('ex-1'), 'w1', AT);
    expect(kinds).toEqual(['e1rm', 'charge']);
    expect(next.bestWeight?.weightKg).toBe(100);
  });

  it('ne declenche rien quand on egale son record sans le battre', () => {
    const first = checkSetForPr(makeSet({ weightKg: 100, reps: 5 }), emptyRecord('ex-1'), 'w1', AT);
    const second = checkSetForPr(makeSet({ weightKg: 100, reps: 5 }), first.next, 'w2', AT);
    expect(second.kinds).toEqual([]);
  });

  it('distingue un record de force d un record de charge', () => {
    const first = checkSetForPr(makeSet({ weightKg: 100, reps: 5 }), emptyRecord('ex-1'), 'w1', AT);
    // Plus lourd mais moins de reps : la charge tombe, la force estimee non.
    const second = checkSetForPr(makeSet({ weightKg: 105, reps: 1 }), first.next, 'w2', AT);
    expect(second.kinds).toEqual(['charge']);

    // Plus leger mais bien plus de reps : la force estimee progresse seule.
    const third = checkSetForPr(makeSet({ weightKg: 95, reps: 10 }), second.next, 'w3', AT);
    expect(third.kinds).toEqual(['e1rm']);
  });

  it('n accorde jamais de record a une serie d echauffement', () => {
    const set = makeSet({ type: 'echauffement', weightKg: 200, reps: 10 });
    expect(checkSetForPr(set, emptyRecord('ex-1'), 'w1', AT).kinds).toEqual([]);
  });

  it('ignore une serie sans charge ni reps', () => {
    expect(checkSetForPr(makeSet({ weightKg: null }), emptyRecord('ex-1'), 'w1', AT).kinds).toEqual([]);
    expect(checkSetForPr(makeSet({ reps: 0 }), emptyRecord('ex-1'), 'w1', AT).kinds).toEqual([]);
  });

  it('ne mute pas le record recu en entree', () => {
    const current = emptyRecord('ex-1');
    checkSetForPr(makeSet({ weightKg: 100, reps: 5 }), current, 'w1', AT);
    expect(current.bestWeight).toBeNull();
  });
});

describe('checkSessionVolumeForPr', () => {
  it('retient le meilleur tonnage de seance', () => {
    const first = checkSessionVolumeForPr(5000, emptyRecord('ex-1'), 'w1', AT);
    expect(first.kinds).toEqual(['volume']);

    expect(checkSessionVolumeForPr(4000, first.next, 'w2', AT).kinds).toEqual([]);
    expect(checkSessionVolumeForPr(6000, first.next, 'w3', AT).kinds).toEqual(['volume']);
  });

  it('ignore un volume nul', () => {
    expect(checkSessionVolumeForPr(0, emptyRecord('ex-1'), 'w1', AT).kinds).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* Recalcul complet                                                            */
/* -------------------------------------------------------------------------- */

const DAY = 86_400_000;

function seance(id: string, startedAt: number, weightKg: number, reps: number): Workout {
  return {
    id,
    name: 'S',
    routineId: null,
    startedAt,
    endedAt: startedAt,
    notes: '',
    durationSec: null,
    entries: [
      {
        id: `${id}-e`,
        exerciseId: 'ex-1',
        notes: '',
        restSec: 0,
        supersetGroup: null,
        order: 0,
        sets: [
          {
            id: `${id}-s`,
            type: 'normale',
            weightKg,
            reps,
            rpe: null,
            done: true,
            completedAt: startedAt,
          },
        ],
      },
    ],
  };
}

describe('rebuildRecords', () => {
  it('fait REDESCENDRE un record quand la seance qui le portait disparait', () => {
    // Le coeur du sujet. Un record ne fait pas que monter : supprimer la
    // seance a 140 kg doit rendre le record a la meilleure qui reste.
    const complet = [seance('a', DAY, 100, 5), seance('b', 2 * DAY, 140, 3)];
    expect(rebuildRecords(complet)[0]?.bestWeight?.weightKg).toBe(140);

    const ampute = complet.filter((w) => w.id !== 'b');
    const [record] = rebuildRecords(ampute);
    expect(record?.bestWeight?.weightKg).toBe(100);
    expect(record?.bestWeight?.workoutId).toBe('a');
  });

  it('ne laisse plus aucun record quand tout l’historique est supprime', () => {
    // C'est le cas signale : des charges max et des 1RM estimes affiches alors
    // que plus une seule seance ne les justifiait.
    expect(rebuildRecords([])).toEqual([]);
  });

  it('date le record du jour ou il a ete etabli', () => {
    const [record] = rebuildRecords([
      seance('recent', 10 * DAY, 90, 5),
      seance('ancien', DAY, 100, 5),
    ]);
    expect(record?.bestWeight?.achievedAt).toBe(DAY);
    expect(record?.bestWeight?.workoutId).toBe('ancien');
  });

  it('ne rend pas de coquille vide pour un exercice sans serie chiffree', () => {
    const vide = seance('a', DAY, 0, 0);
    expect(rebuildRecords([vide])).toEqual([]);
  });

  it('ignore les series d’echauffement', () => {
    const leger = seance('a', DAY, 200, 1);
    leger.entries[0]!.sets[0]!.type = 'echauffement';
    expect(rebuildRecords([leger])).toEqual([]);
  });
});

describe('records du mois', () => {
  // Juin : 100 kg x 5, record absolu. Juillet : on est redescendu a 90 kg.
  const juin = makeWorkout({
    startedAt: new Date(2026, 5, 20, 10).getTime(),
    entries: [makeEntry({ sets: [makeSet({ weightKg: 100, reps: 5 })] })],
  });
  const debutJuillet = makeWorkout({
    startedAt: new Date(2026, 6, 3, 10).getTime(),
    entries: [makeEntry({ sets: [makeSet({ weightKg: 90, reps: 6 })] })],
  });
  const at = new Date(2026, 6, 10, 10).getTime();

  it('ne retient que les seances du mois civil, avant la seance en cours', () => {
    const [record] = monthRecords([juin, debutJuillet], at);
    expect(record?.bestWeight?.weightKg).toBe(90);
    expect(monthRecords([juin, debutJuillet], new Date(2026, 6, 2).getTime())).toEqual([]);
  });

  it('badge la serie qui bat le mois sans battre l absolu', () => {
    const [monthBase] = monthRecords([juin, debutJuillet], at);
    const set = makeSet({ weightKg: 90, reps: 8 });
    const entry = makeEntry({ sets: [set] });
    const allTime = replayEntryPrs(entry, rebuildRecords([juin, debutJuillet])[0]!, 'w', at);

    expect(allTime.kindsBySetId.size).toBe(0);
    expect(replayMonthPrs(entry, monthBase, allTime.kindsBySetId, 'w', at).get(set.id)).toEqual([
      'e1rm',
    ]);
  });

  it('ne badge rien sans prestation anterieure dans le mois', () => {
    const entry = makeEntry({ sets: [makeSet({ weightKg: 90, reps: 8 })] });
    expect(replayMonthPrs(entry, undefined, new Map(), 'w', at).size).toBe(0);
  });

  it('laisse le record absolu au badge dore', () => {
    const [monthBase] = monthRecords([debutJuillet], at);
    const set = makeSet({ weightKg: 110, reps: 5 });
    const entry = makeEntry({ sets: [set] });
    const allTime = replayEntryPrs(entry, rebuildRecords([juin])[0]!, 'w', at);

    expect(allTime.kindsBySetId.has(set.id)).toBe(true);
    expect(replayMonthPrs(entry, monthBase, allTime.kindsBySetId, 'w', at).size).toBe(0);
  });
});
