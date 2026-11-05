/**
 * Fiche d'execution d'un exercice.
 *
 * Contrainte structurante : l'app doit fonctionner sans reseau, donc tout ce
 * contenu est embarque dans le bundle. Pas de photo ni de video distante en
 * dependance : au mieux un lien de complement, affiche seulement si le
 * telephone a du reseau, et jamais necessaire pour comprendre le mouvement.
 */

export interface ExerciseGuide {
  /** Slug de l'exercice, identique au nom normalise. */
  key: string;
  /** Une phrase : a quoi sert ce mouvement, et pourquoi le choisir. */
  summary: string;
  /** Muscles reellement moteurs sur le mouvement. */
  primaryMuscles: string[];
  secondaryMuscles: string[];
  /** Mise en place, avant la premiere rep. */
  setup: string[];
  /** Deroule de la repetition. */
  execution: string[];
  /** Points d'attention qui font la difference entre faire et bien faire. */
  cues: string[];
  /** Erreurs frequentes, formulees comme ce qu'on observe reellement. */
  mistakes: string[];
  /**
   * Pas de fourchette de repetitions ici, volontairement.
   *
   * Une fiche decrit COMMENT executer un mouvement, jamais combien en faire :
   * le nombre de series et de reps est une prescription, il appartient au
   * programme ecrit par le coach, pas a une fiche generique lue hors contexte.
   * Ne pas reintroduire de champ de ce type.
   */

  /** Cle du schema SVG associe, si un schema existe. */
  diagram?: DiagramKey;
  /** Recherche video de complement, ouverte seulement si le reseau est la. */
  videoQuery?: string;
}

/** Schemas disponibles. Ajouter une cle ici oblige a dessiner le SVG en face. */
export type DiagramKey =
  | 'squat'
  | 'bench'
  | 'deadlift'
  | 'overhead-press'
  | 'row'
  | 'pullup'
  | 'hip-thrust'
  | 'lateral-raise'
  | 'curl'
  | 'triceps-pushdown';

/** Normalise un nom d'exercice en cle de fiche. */
export function guideKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
