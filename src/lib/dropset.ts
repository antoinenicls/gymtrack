/**
 * Regroupement des series degressives.
 *
 * Une degressive n'est pas une serie de plus : c'est la MEME serie qu'on
 * poursuit en allegeant la barre, sans repos, jusqu'a l'echec. Marquer trois
 * lignes « degressive » a la suite decrit donc un seul effort en trois
 * paliers, et l'app le comptait comme trois series : le total de la seance
 * gonflait, et la moyenne par seance avec lui.
 *
 * Le regroupement est positionnel par DEFAUT : des lignes degressives posees a
 * la suite s'associent d'elles-memes, sans identifiant de groupe a maintenir.
 * C'est ce qui permet d'en ajouter ou d'en retirer une sans rien reconstruire,
 * et ce qui evite un groupe orphelin apres une suppression. Une serie normale,
 * elle, reste toujours seule.
 *
 * Mais la position ne suffit pas a tout dire, et c'est la limite qui a demande
 * une marque explicite : deux descentes de deux paliers qui s'enchainent sont
 * positionnellement identiques a une seule descente de quatre. Aucune regle
 * automatique ne peut trancher, parce que la difference est une intention.
 * `dropStart` la porte, et n'intervient que la : partout ailleurs, le defaut
 * continue de suffire.
 */

import type { SetType } from '@/types/domain';

interface Typed {
  type: SetType;
  /** Ouvre une nouvelle descente au lieu de prolonger celle du dessus. */
  dropStart?: boolean;
}

/**
 * La serie de rang `index` se rattache-t-elle a celle du dessus ?
 *
 * Predicat UNIQUE d'ou tout le reste decoule : le decoupage en groupes, la
 * numerotation, et l'endroit ou s'affiche un repos. Les trois s'en servaient
 * chacun a sa facon, et il suffisait d'en corriger un pour que les autres
 * mentent.
 */
function attachesToPrevious<T extends Typed>(sets: T[], index: number): boolean {
  const current = sets[index];
  const previous = sets[index - 1];
  if (!current || !previous) return false;
  if (current.type !== 'drop' || previous.type !== 'drop') return false;
  // La marque explicite tranche ce qu'aucune position ne peut trancher.
  return current.dropStart !== true;
}

/**
 * Decoupe une liste de series en groupes.
 *
 * Chaque groupe vaut UNE serie. Les degressives consecutives tiennent dans un
 * seul groupe ; tout le reste forme un groupe d'un element.
 */
export function setGroups<T extends Typed>(sets: T[]): T[][] {
  const groups: T[][] = [];
  sets.forEach((set, index) => {
    const last = groups[groups.length - 1];
    if (last && attachesToPrevious(sets, index)) {
      last.push(set);
      return;
    }
    groups.push([set]);
  });
  return groups;
}

/**
 * Vrai si la serie de rang `index` prolonge la precedente, donc si rien ne les
 * separe : ni repos, ni numero, ni trait.
 */
export function continuesDropGroup<T extends Typed>(sets: T[], index: number): boolean {
  return attachesToPrevious(sets, index);
}

/**
 * Vrai si la serie de rang `index` ferme son groupe, donc si le repos qui suit
 * a lieu d'etre. La derniere serie de l'exercice ferme forcement le sien.
 */
export function endsDropGroup<T extends Typed>(sets: T[], index: number): boolean {
  const current = sets[index];
  if (!current) return false;
  if (current.type !== 'drop') return true;
  // Le palier suivant peut exister et ouvrir malgre tout une autre descente :
  // le repos a alors bien lieu entre les deux.
  return !attachesToPrevious(sets, index + 1);
}

/**
 * Nombre de series PREVUES, tel qu'on l'annonce avant de s'entrainer.
 *
 * Deux exclusions, et ce sont les deux memes que du cote realise. Un
 * echauffement n'est pas une serie de travail : il chauffe le muscle, il ne le
 * charge pas, et l'annoncer dans « series prevues » promet un volume qui
 * n'existe pas. Une degressive, elle, compte pour une quel que soit son nombre
 * de paliers.
 */
export function plannedSetCount<T extends Typed>(sets: T[]): number {
  /**
   * On groupe AVANT d'exclure, et l'ordre compte.
   *
   * Filtrer d'abord rapprocherait des lignes que quelque chose separait :
   * deux degressives de part et d'autre d'un echauffement se retrouvaient
   * collees en un seul groupe une fois l'echauffement retire, et deux efforts
   * distincts n'en faisaient plus qu'un.
   */
  return setGroups(sets).filter((group) =>
    group.some((set) => set.type !== 'echauffement'),
  ).length;
}

/**
 * Numero affiche de chaque serie, par rang.
 *
 * Les paliers d'une degressive partagent le numero de leur groupe : ils ne
 * font pas avancer le compteur, exactement comme ils ne font pas avancer le
 * total de la seance. `null` marque un palier de continuation, qui n'affiche
 * pas de numero du tout.
 */
export function setNumbers<T extends Typed>(sets: T[]): Array<number | null> {
  const numbers: Array<number | null> = [];
  let counter = 0;
  sets.forEach((_set, index) => {
    if (continuesDropGroup(sets, index)) {
      numbers.push(null);
      return;
    }
    counter += 1;
    numbers.push(counter);
  });
  return numbers;
}
