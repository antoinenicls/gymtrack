import { describe, expect, it } from 'vitest';
import type { SetType } from '@/types/domain';
import {
  continuesDropGroup,
  endsDropGroup,
  plannedSetCount,
  setGroups,
  setNumbers,
} from './dropset';

interface TestSet {
  type: SetType;
  dropStart?: boolean;
}

const s = (...types: SetType[]): TestSet[] => types.map((type) => ({ type }));

/** Ouvre une nouvelle descente sur le palier de rang `index`. */
const detach = (sets: TestSet[], index: number): TestSet[] =>
  sets.map((set, i) => (i === index ? { ...set, dropStart: true } : set));

describe('groupes de series', () => {
  it('laisse chaque serie normale seule', () => {
    expect(setGroups(s('normale', 'normale', 'normale'))).toHaveLength(3);
  });

  it('associe les degressives posees a la suite', () => {
    // Une degressive apres une normale OUVRE son groupe : la normale reste
    // une serie a part entiere.
    const groups = setGroups(s('normale', 'drop', 'drop'));
    expect(groups).toHaveLength(2);
    expect(groups[1]).toHaveLength(2);
  });

  it('associe autant de paliers qu’il y en a', () => {
    const groups = setGroups(s('drop', 'drop', 'drop', 'drop'));
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(4);
  });

  it('separe deux degressives qu’une normale interrompt', () => {
    const groups = setGroups(s('drop', 'drop', 'normale', 'drop', 'drop'));
    expect(groups.map((g) => g.length)).toEqual([2, 1, 2]);
  });

  it('n’associe pas un echauffement a une degressive', () => {
    expect(setGroups(s('echauffement', 'drop')).map((g) => g.length)).toEqual([1, 1]);
  });
});

describe('deux degressives qui s’enchainent', () => {
  /**
   * Le cas qui a demande la marque explicite : deux descentes de deux paliers
   * se lisaient comme une seule de quatre, et l'exercice annoncait une serie
   * la ou il y en avait deux.
   */
  it('reste UNE descente sans marque', () => {
    expect(setGroups(s('drop', 'drop', 'drop', 'drop')).map((g) => g.length)).toEqual([4]);
  });

  it('devient DEUX descentes avec la marque', () => {
    const sets = detach(s('drop', 'drop', 'drop', 'drop'), 2);
    expect(setGroups(sets).map((g) => g.length)).toEqual([2, 2]);
  });

  it('compte alors deux series prevues', () => {
    expect(plannedSetCount(detach(s('drop', 'drop', 'drop', 'drop'), 2))).toBe(2);
  });

  it('numerote les deux descentes separement', () => {
    // Un numero par descente, une fleche sur chaque palier de continuation.
    expect(setNumbers(detach(s('drop', 'drop', 'drop', 'drop'), 2))).toEqual([1, null, 2, null]);
  });

  it('rend le repos entre les deux descentes', () => {
    const sets = detach(s('drop', 'drop', 'drop', 'drop'), 2);
    // Le premier palier n'a rien apres lui qui le ferme.
    expect(endsDropGroup(sets, 0)).toBe(false);
    // Le second ferme SA descente : le repos a lieu la.
    expect(endsDropGroup(sets, 1)).toBe(true);
    expect(endsDropGroup(sets, 2)).toBe(false);
    expect(endsDropGroup(sets, 3)).toBe(true);
  });

  it('ignore la marque sur une serie qui n’est pas une degressive', () => {
    // Poser la marque sur une normale ne doit rien changer : elle est deja
    // seule, et rien ne s'y rattache.
    const sets = detach(s('normale', 'normale'), 1);
    expect(setGroups(sets).map((g) => g.length)).toEqual([1, 1]);
  });
});

describe('repos entre les paliers', () => {
  it('ne coupe jamais un groupe degressif', () => {
    const sets = s('normale', 'drop', 'drop', 'normale');
    // Le palier 2 prolonge le 1 : rien ne les separe.
    expect(continuesDropGroup(sets, 2)).toBe(true);
    // La premiere degressive, elle, suit un repos normal.
    expect(continuesDropGroup(sets, 1)).toBe(false);
    expect(continuesDropGroup(sets, 0)).toBe(false);
  });

  it('rend le repos apres le dernier palier', () => {
    const sets = s('drop', 'drop', 'normale');
    expect(endsDropGroup(sets, 0)).toBe(false);
    expect(endsDropGroup(sets, 1)).toBe(true);
    // Derniere serie de l'exercice : son groupe se ferme forcement.
    expect(endsDropGroup(s('drop'), 0)).toBe(true);
  });
});

describe('series prevues', () => {
  it('exclut l’echauffement', () => {
    // Chauffer n'est pas travailler : l'annoncer promettrait un volume qui
    // n'aura pas lieu.
    expect(plannedSetCount(s('echauffement', 'echauffement', 'normale', 'normale'))).toBe(2);
  });

  it('compte une degressive pour une', () => {
    expect(plannedSetCount(s('normale', 'drop', 'drop', 'drop'))).toBe(2);
  });

  it('cumule les deux regles', () => {
    expect(plannedSetCount(s('echauffement', 'normale', 'drop', 'drop', 'normale'))).toBe(3);
  });

  it('ne soude pas deux degressives que l’echauffement retire separait', () => {
    // L'echauffement disparait du compte, mais il ne doit pas pour autant
    // coller les deux degressives qu'il separait : ce sont deux efforts.
    expect(plannedSetCount(s('drop', 'echauffement', 'drop'))).toBe(2);
  });
});

describe('numerotation', () => {
  it('ne fait pas avancer le compteur sur un palier', () => {
    // Trois series affichees, dont une degressive en deux paliers.
    expect(setNumbers(s('normale', 'drop', 'drop', 'normale'))).toEqual([1, 2, null, 3]);
  });

  it('numerote un groupe ouvert par une degressive', () => {
    expect(setNumbers(s('drop', 'drop', 'normale'))).toEqual([1, null, 2]);
  });

  it('compte l’echauffement comme une ligne a part', () => {
    expect(setNumbers(s('echauffement', 'normale', 'drop', 'drop'))).toEqual([1, 2, 3, null]);
  });
});
