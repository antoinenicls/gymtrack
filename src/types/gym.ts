/**
 * Enseignes de salle et disponibilite des mouvements.
 *
 * Modele retenu : un exercice CANONIQUE unique, et par enseigne un eventuel
 * nom commercial. On ne duplique pas le catalogue par salle, sinon l'historique
 * d'un athlete qui change de club se casse en deux.
 *
 * Regle de lecture la plus importante de ce fichier : l'absence d'information
 * ne vaut PAS absence de la machine. Trois etats seulement, et le troisieme
 * est le cas le plus frequent :
 *
 *   - confirme present  : entree presente dans le catalogue
 *   - confirme absent   : entree presente, enseigne listee dans `absent`
 *   - inconnu           : aucune entree, ou enseigne non listee
 *
 * Rien dans l'interface ne doit presenter un « inconnu » comme un « absent ».
 * Le parc machines varie d'un club a l'autre au sein d'une meme enseigne, et
 * une donnee inventee serait lue comme un fait par un athlete accompagne.
 */

export type GymBrand = 'basic-fit' | 'fitness-park' | 'on-air';

export const GYM_BRANDS: GymBrand[] = ['basic-fit', 'fitness-park', 'on-air'];

export const GYM_LABELS: Record<GymBrand, string> = {
  'basic-fit': 'Basic-Fit',
  'fitness-park': 'Fitness Park',
  'on-air': 'On Air',
};

/** Ce qu'on sait d'un mouvement dans une enseigne donnee. */
export type GymPresence = 'present' | 'absent' | 'inconnu';

export interface GymEntry {
  /** Slug de l'exercice, identique a la cle de fiche (voir guideKey). */
  key: string;
  /**
   * Enseignes ou le mouvement est realisable. On n'y inscrit que ce qui est
   * verifie ou structurellement certain (un rack, une poulie, des halteres :
   * aucune salle de cette taille n'en est depourvue).
   */
  present: GymBrand[];
  /** Enseignes ou l'on sait que le mouvement n'est PAS realisable. */
  absent?: GymBrand[];
  /**
   * Nom commercial de la machine, par enseigne, quand il differe du nom
   * canonique. Vide tant que personne ne l'a releve sur place : on prefere
   * n'afficher aucun alias plutot qu'un alias approximatif.
   */
  aliases?: Partial<Record<GymBrand, string>>;
}
