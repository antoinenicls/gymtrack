import { describe, expect, it } from 'vitest';
import { supersetLetters, supersetRuns } from './superset';

const e = (id: string, supersetGroup: string | null) => ({ id, supersetGroup });

describe('supersetRuns', () => {
  it('isole les exercices sans groupe', () => {
    const runs = supersetRuns([e('a', null), e('b', null)]);
    expect(runs.map((r) => r.map((x) => x.id))).toEqual([['a'], ['b']]);
  });

  it('reunit deux exercices lies', () => {
    const runs = supersetRuns([e('a', 'g1'), e('b', 'g1'), e('c', null)]);
    expect(runs.map((r) => r.map((x) => x.id))).toEqual([['a', 'b'], ['c']]);
  });

  it('accueille un troisieme exercice dans le groupe', () => {
    // Le cas signale : lier un exercice au groupe deja forme au-dessus.
    const runs = supersetRuns([e('a', 'g1'), e('b', 'g1'), e('c', 'g1')]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toHaveLength(3);
  });

  it('separe deux groupes differents qui se suivent', () => {
    const runs = supersetRuns([e('a', 'g1'), e('b', 'g1'), e('c', 'g2'), e('d', 'g2')]);
    expect(runs.map((r) => r.map((x) => x.id))).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('EXIGE l adjacence', () => {
    // Meme groupe, mais un intrus au milieu : deux suites. Un trait unique
    // engloberait l'intrus et affirmerait qu'il fait partie du superset.
    const runs = supersetRuns([e('a', 'g1'), e('b', null), e('c', 'g1')]);
    expect(runs.map((r) => r.map((x) => x.id))).toEqual([['a'], ['b'], ['c']]);
  });

  it('ne groupe jamais deux exercices sans groupe', () => {
    // `null === null` est vrai : sans garde explicite, deux exercices libres
    // se retrouveraient lies. C'est le piege de cette fonction.
    const runs = supersetRuns([e('a', null), e('b', null), e('c', null)]);
    expect(runs).toHaveLength(3);
  });

  it('rend une liste vide sur une seance vide', () => {
    expect(supersetRuns([])).toEqual([]);
  });
});

describe('supersetLetters', () => {
  it('nomme deux supersets qui se suivent', () => {
    // Le cas signale : sans lettre, les deux groupes etaient indistinguables.
    const runs = supersetRuns([
      e('a', 'g1'), e('b', 'g1'),
      e('c', 'g2'), e('d', 'g2'),
    ]);
    expect(supersetLetters(runs)).toEqual(['A', 'B']);
  });

  it('ne donne pas de lettre a un exercice seul', () => {
    const runs = supersetRuns([e('a', null), e('b', 'g1'), e('c', 'g1')]);
    expect(supersetLetters(runs)).toEqual([null, 'A']);
  });

  it('ne decale pas l alphabet a cause d un exercice intercale', () => {
    // A, puis un exercice seul, puis B, et surtout pas A puis C.
    const runs = supersetRuns([
      e('a', 'g1'), e('b', 'g1'),
      e('x', null),
      e('c', 'g2'), e('d', 'g2'),
    ]);
    expect(supersetLetters(runs)).toEqual(['A', null, 'B']);
  });

  it('repart a A au-dela de Z', () => {
    const runs = Array.from({ length: 27 }, (_, i) => [
      e(`a${i}`, `g${i}`),
      e(`b${i}`, `g${i}`),
    ]);
    const lettres = supersetLetters(runs);
    expect(lettres[25]).toBe('Z');
    expect(lettres[26]).toBe('A');
  });
});
