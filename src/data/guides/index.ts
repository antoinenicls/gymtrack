/**
 * Fiches d'execution embarquees.
 *
 * Contenu volontairement factuel : ce qu'il faut placer, dans quel ordre, et
 * ce qui casse le mouvement. Pas de promesse de resultat, pas de prescription
 * individuelle : ce sont des reperes techniques que l'athlete apprend a
 * appliquer seul.
 *
 * En particulier, aucune fiche ne donne de nombre de series ni de fourchette
 * de repetitions. Combien en faire releve du programme, pas d'une fiche
 * generique lue hors contexte.
 *
 * Le contenu est decoupe par groupe musculaire pour rester lisible ; ce
 * fichier n'est que l'assemblage et l'API de lecture. Tout exercice du
 * catalogue livre doit avoir sa fiche : c'est verifie par coverage.test.ts.
 */

import type { ExerciseGuide } from '@/types/guide';
import { PECTORAUX_GUIDES } from './pectoraux';
import { DOS_GUIDES } from './dos';
import { EPAULES_GUIDES } from './epaules';
import { BICEPS_GUIDES, TRICEPS_GUIDES, AVANT_BRAS_GUIDES } from './bras';
import {
  QUADRICEPS_GUIDES,
  ISCHIOS_GUIDES,
  FESSIERS_GUIDES,
  MOLLETS_GUIDES,
} from './jambes';
import { ABDOMINAUX_GUIDES } from './abdominaux';

export const GUIDES: ExerciseGuide[] = [
  ...PECTORAUX_GUIDES,
  ...DOS_GUIDES,
  ...EPAULES_GUIDES,
  ...BICEPS_GUIDES,
  ...TRICEPS_GUIDES,
  ...AVANT_BRAS_GUIDES,
  ...QUADRICEPS_GUIDES,
  ...ISCHIOS_GUIDES,
  ...FESSIERS_GUIDES,
  ...MOLLETS_GUIDES,
  ...ABDOMINAUX_GUIDES,
];

const GUIDE_BY_KEY = new Map(GUIDES.map((g) => [g.key, g]));

export function getGuide(key: string): ExerciseGuide | undefined {
  return GUIDE_BY_KEY.get(key);
}

export function guideCount(): number {
  return GUIDES.length;
}
