/**
 * Disponibilite des mouvements par enseigne.
 *
 * ETAT DE REMPLISSAGE : partiel, et volontairement.
 *
 * Ne figurent ici que les mouvements dont la presence est structurellement
 * certaine dans les trois enseignes : ceux qui ne demandent que des halteres,
 * une barre et un rack, une poulie reglable, une barre de traction, ou l'une
 * des quelques machines qu'aucune salle de ce format n'omet (presse a cuisses,
 * tirage vertical, leg curl, leg extension, mollets, abduction).
 *
 * Tout le reste est absent de ce fichier, ce qui signifie « inconnu » et non
 * « indisponible » : le parc varie d'un club a l'autre au sein d'une meme
 * enseigne, et personne n'a encore releve les machines sur place. Notamment
 * laisses de cote tant qu'ils ne sont pas verifies : hack squat, rowing T-bar,
 * developpe machine convergente, dips machine, machine a mollets debout
 * dediee. Ils existent dans beaucoup de clubs, mais pas dans tous.
 *
 * Les `aliases` sont vides pour la meme raison : un nom commercial approximatif
 * serait pire que pas de nom du tout.
 *
 * Pour completer : ajouter l'enseigne dans `present`, et le nom commercial dans
 * `aliases` s'il differe du nom canonique. Les cles suivent guideKey().
 */

import type { GymBrand, GymEntry, GymPresence } from '@/types/gym';
import { GYM_BRANDS } from '@/types/gym';

/** Raccourci : disponible dans les trois enseignes. */
const PARTOUT: GymBrand[] = GYM_BRANDS;

export const GYM_CATALOG: GymEntry[] = [
  // Halteres, barres et racks : le socle commun de toutes ces salles.
  { key: 'developpe-couche', present: PARTOUT },
  { key: 'developpe-incline-barre', present: PARTOUT },
  { key: 'developpe-couche-halteres', present: PARTOUT },
  { key: 'developpe-incline-halteres', present: PARTOUT },
  { key: 'ecarte-halteres', present: PARTOUT },
  { key: 'pompes', present: PARTOUT },
  { key: 'souleve-de-terre', present: PARTOUT },
  { key: 'rowing-barre', present: PARTOUT },
  { key: 'rowing-haltere', present: PARTOUT },
  { key: 'shrug-barre', present: PARTOUT },
  { key: 'developpe-militaire', present: PARTOUT },
  { key: 'developpe-epaules-halteres', present: PARTOUT },
  { key: 'elevations-laterales', present: PARTOUT },
  { key: 'oiseau-halteres', present: PARTOUT },
  { key: 'developpe-arnold', present: PARTOUT },
  { key: 'curl-barre', present: PARTOUT },
  { key: 'curl-halteres', present: PARTOUT },
  { key: 'curl-incline', present: PARTOUT },
  { key: 'curl-marteau', present: PARTOUT },
  { key: 'developpe-couche-prise-serree', present: PARTOUT },
  { key: 'barre-au-front', present: PARTOUT },
  { key: 'extension-nuque-haltere', present: PARTOUT },
  { key: 'curl-poignets', present: PARTOUT },
  { key: 'farmer-walk', present: PARTOUT },
  { key: 'squat-barre', present: PARTOUT },
  { key: 'squat-avant', present: PARTOUT },
  { key: 'fentes-marchees', present: PARTOUT },
  { key: 'squat-bulgare', present: PARTOUT },
  { key: 'souleve-de-terre-jambes-tendues', present: PARTOUT },
  { key: 'good-morning', present: PARTOUT },
  { key: 'hip-thrust', present: PARTOUT },
  { key: 'gainage', present: PARTOUT },

  // Barre de traction et barres paralleles : presentes dans les trois.
  { key: 'tractions-pronation', present: PARTOUT },
  { key: 'tractions-supination', present: PARTOUT },
  { key: 'dips-lestes', present: PARTOUT },
  { key: 'releve-de-jambes-suspendu', present: PARTOUT },

  // Poulies reglables : idem.
  { key: 'ecarte-a-la-poulie', present: PARTOUT },
  { key: 'tirage-vertical', present: PARTOUT },
  { key: 'tirage-horizontal', present: PARTOUT },
  { key: 'pull-over-a-la-poulie', present: PARTOUT },
  { key: 'elevations-laterales-poulie', present: PARTOUT },
  { key: 'face-pull', present: PARTOUT },
  { key: 'curl-a-la-poulie', present: PARTOUT },
  { key: 'extension-poulie-haute', present: PARTOUT },
  { key: 'extension-corde', present: PARTOUT },
  { key: 'kickback-poulie', present: PARTOUT },
  { key: 'crunch-a-la-poulie', present: PARTOUT },

  // Machines que ce format de salle n'omet pas.
  { key: 'presse-a-cuisses', present: PARTOUT },
  { key: 'leg-extension', present: PARTOUT },
  { key: 'leg-curl-assis', present: PARTOUT },
  { key: 'leg-curl-allonge', present: PARTOUT },
  { key: 'mollets-a-la-presse', present: PARTOUT },
  { key: 'abduction-machine', present: PARTOUT },
  { key: 'curl-pupitre', present: PARTOUT },
];

const BY_KEY = new Map(GYM_CATALOG.map((entry) => [entry.key, entry]));

/**
 * Ce qu'on sait du mouvement dans cette enseigne.
 *
 * Retourne 'inconnu' des qu'on n'a pas l'information, jamais 'absent' par
 * defaut : une donnee manquante ne doit pas devenir une affirmation.
 */
export function gymPresence(key: string, brand: GymBrand): GymPresence {
  const entry = BY_KEY.get(key);
  if (!entry) return 'inconnu';
  if (entry.present.includes(brand)) return 'present';
  if (entry.absent?.includes(brand)) return 'absent';
  return 'inconnu';
}

/**
 * Nom commercial de la machine dans cette enseigne, s'il a ete releve.
 * Undefined = on affiche le nom canonique, ce qui reste toujours correct.
 */
export function gymAlias(key: string, brand: GymBrand): string | undefined {
  return BY_KEY.get(key)?.aliases?.[brand];
}

/** Nombre de mouvements confirmes pour une enseigne. Sert a l'affichage. */
export function confirmedCount(brand: GymBrand): number {
  return GYM_CATALOG.filter((entry) => entry.present.includes(brand)).length;
}
