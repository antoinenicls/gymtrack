/** Comparaison de texte saisi au clavier. */

/** Plage des signes diacritiques combinants, isolee par la normalisation NFD. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Minuscules sans accents, pour une recherche indulgente.
 *
 * « developpe » doit trouver « Développé » : personne ne pose les accents dans
 * un champ de recherche sur telephone. NFD separe la lettre de son signe
 * diacritique, la plage ci-dessus retire ensuite les signes.
 */
export function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '');
}
