/**
 * « Quoi de neuf » : nouveautes pas encore vues, montrees une fois a l'ouverture.
 *
 * Reprise de MacroTrack. Les entrees sont ecrites a la main (une par nouveaute
 * visible, pas une par commit) et identifiees par `AAAA-MM-JJ-sujet` : l'ordre
 * des id suit l'ordre chronologique, ce qui retrouve « ce qui est plus recent
 * que la derniere vue » meme si une ancienne entree est retiree de la liste.
 */

export interface ChangelogEntry {
  /** `AAAA-MM-JJ-sujet`, unique et triable. */
  id: string;
  title: string;
  body: string;
}

/** Au-dela, la feuille propose « Voir les N autres » plutot qu'un mur de texte. */
export const WHATS_NEW_MAX = 3;

/** Date (`AAAA-MM-JJ`) d'une entree, tiree de son id. */
export function entryDate(entry: ChangelogEntry): string {
  return entry.id.slice(0, 10);
}

/** Entrees triees de la plus recente a la plus ancienne. */
export function sortedEntries(entries: ChangelogEntry[]): ChangelogEntry[] {
  return [...entries].sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
}

/** Entrees plus recentes que la derniere vue (toutes si rien n'a jamais ete vu). */
export function unseenEntries(entries: ChangelogEntry[], seenId: string | undefined): ChangelogEntry[] {
  return sortedEntries(entries).filter((e) => !seenId || e.id > seenId);
}

/** Id a memoriser une fois la feuille fermee : la plus recente entree. */
export function latestId(entries: ChangelogEntry[]): string | undefined {
  return sortedEntries(entries)[0]?.id;
}
