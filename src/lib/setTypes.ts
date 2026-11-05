/**
 * Presentation des types de serie, en un seul endroit.
 *
 * La pastille se lit sur trois ecrans (la seance en cours, l'editeur de
 * routine, l'historique) et elle doit y etre RIGOUREUSEMENT identique : c'est
 * un code appris une fois, et un « D » bleu ici mais gris ailleurs oblige a le
 * reapprendre a chaque ecran. Ces tables etaient deja dupliquees a l'identique
 * a deux endroits ; une troisieme copie aurait fini par diverger.
 */

import type { SetType } from '@/types/domain';

/** Lettre de la pastille. Une serie normale garde son NUMERO, pas de lettre. */
export const TYPE_LETTER: Record<SetType, string | null> = {
  normale: null,
  echauffement: 'W',
  drop: 'D',
  echec: 'F',
  myo: 'M',
};

export const TYPE_STYLE: Record<SetType, string> = {
  normale: 'bg-alt text-ink',
  echauffement: 'bg-pr-soft text-pr',
  drop: 'bg-accent-soft text-accent',
  echec: 'bg-red-50 text-red-600',
  myo: 'bg-purple-50 text-purple-600',
};

/**
 * Une serie a-t-elle ete menee jusqu'a l'echec ?
 *
 * Deux ecritures pour la meme chose, et c'est assume : le type historique
 * 'echec' porte l'information sur toutes les seances deja enregistrees, et le
 * drapeau `toFailure` la porte sur les nouvelles, ou elle peut se combiner
 * avec une degressive. Tout l'affichage passe par ici, donc les deux se lisent
 * pareil a l'ecran.
 */
export function isToFailure(set: { type: SetType; toFailure?: boolean }): boolean {
  return set.toFailure === true || set.type === 'echec';
}

/**
 * Reporte les marques d'une serie qui ne tiennent pas dans son `type`.
 *
 * Existe parce qu'elles se perdaient : une seance passe par cinq conversions
 * (routine vers seance, seance vers routine, report des ecarts, export et
 * import d'un programme) et chacune reconstruisait ses series champ par champ,
 * en n'y recopiant que le `type`. Une descente configuree a l'echec et separee
 * de la suivante repartait donc soudee et sans son echec des qu'on lancait la
 * seance : tout le travail de configuration disparaissait au moment precis ou
 * il servait.
 *
 * On n'ecrit que ce qui est VRAI : une marque absente reste absente, plutot
 * que d'inscrire `false` partout dans des donnees deja enregistrees.
 */
export function carrySetMarks(set: { toFailure?: boolean; dropStart?: boolean }): {
  toFailure?: boolean;
  dropStart?: boolean;
} {
  return {
    ...(set.toFailure === true ? { toFailure: true } : {}),
    ...(set.dropStart === true ? { dropStart: true } : {}),
  };
}

/**
 * Intitule, pour les colonnes, les listes et les infobulles.
 *
 * Court par necessite : il s'affiche dans la colonne la plus etroite de
 * l'editeur de routine. « Série normale » y prenait deux lignes pour ne rien
 * dire de plus que « Normale », sur le type justement le plus frequent.
 */
export const TYPE_LABEL: Record<SetType, string> = {
  normale: 'Normale',
  echauffement: 'Échauffement',
  drop: 'Dégressive',
  echec: 'À l’échec',
  myo: 'Myo-reps',
};
