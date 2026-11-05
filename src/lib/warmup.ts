/**
 * Generateur de series d'echauffement.
 *
 * Principe : monter en charge en descendant en volume, pour preparer le
 * systeme nerveux sans entamer les reserves.
 *
 * DEUX PALIERS AU MAXIMUM, jamais trois. Le brief d'origine en prevoyait trois
 * (50 / 70 / 90) ; a l'usage c'est trop long entre deux exercices. On garde
 * donc 50 % pour lancer le mouvement et 80 % pour approcher la charge de
 * travail : l'ecart de 80 a 100 % reste franchissable sans palier
 * intermediaire. Le plafond est verrouille par un test.
 *
 * Chaque palier est arrondi a un poids reellement chargeable sur la barre :
 * proposer "62.5 kg" quand la salle n'a pas de disques de 1.25 fait perdre du
 * temps a l'athlete devant le rack.
 */

import { DEFAULT_BAR_KG, DEFAULT_PLATES_KG, computePlates } from './plates';

export interface WarmupSet {
  weightKg: number;
  reps: number;
  /** Part de la serie effective, pour affichage. */
  percent: number;
}

interface WarmupOptions {
  barKg?: number;
  availablePlatesKg?: number[];
  /** Exercice sans barre (halteres, machine) : on n'arrondit pas aux disques. */
  usesBar?: boolean;
}

const SCHEME = [
  { percent: 0.5, reps: 5 },
  { percent: 0.8, reps: 2 },
];

/** Plafond dur : meme si le bareme grossissait, l'echauffement s'arrete la. */
const MAX_SETS = 2;

export function generateWarmup(workingWeightKg: number, options: WarmupOptions = {}): WarmupSet[] {
  const { barKg = DEFAULT_BAR_KG, availablePlatesKg = DEFAULT_PLATES_KG, usesBar = true } = options;

  if (!Number.isFinite(workingWeightKg) || workingWeightKg <= 0) return [];

  // Sous une charge deja legere, s'echauffer avec des paliers n'a pas de sens :
  // la barre a vide fait deja le travail.
  if (usesBar && workingWeightKg <= barKg) return [];

  const sets: WarmupSet[] = [];

  for (const step of SCHEME) {
    const raw = workingWeightKg * step.percent;
    const weightKg = usesBar
      ? computePlates(raw, barKg, availablePlatesKg).achievedKg
      : roundToHalf(raw);

    // Un palier sous la barre a vide, ou identique au precedent apres
    // arrondi, n'apporte rien : on l'ecarte plutot que d'empiler des doublons.
    if (usesBar && weightKg <= barKg) continue;
    if (sets.some((s) => s.weightKg === weightKg)) continue;
    if (weightKg >= workingWeightKg) continue;

    sets.push({ weightKg, reps: step.reps, percent: step.percent });
    if (sets.length === MAX_SETS) break;
  }

  return sets;
}

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}
