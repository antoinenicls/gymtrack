/**
 * Bibliotheque d'exercices livree avec l'app.
 *
 * Bumper SEED_VERSION pour injecter de nouveaux mouvements chez les
 * utilisateurs existants. Le seed n'ecrase jamais un exercice deja present :
 * l'athlete a pu en renommer ou en regler le repos, on ne lui reprend pas.
 *
 * Les temps de repos par defaut suivent la logique du cout nerveux : lourd et
 * polyarticulaire = long, isolation legere = court.
 */

import type { Equipment, MuscleGroup } from '@/types/domain';

export const SEED_VERSION = 1;

export interface SeedExercise {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  defaultRestSec: number;
  defaultBarWeightKg?: number;
}

export const SEED_EXERCISES: SeedExercise[] = [
  // Pectoraux
  { name: 'Développé couché', muscleGroup: 'pectoraux', equipment: 'barre', defaultRestSec: 180, defaultBarWeightKg: 20 },
  { name: 'Développé incliné barre', muscleGroup: 'pectoraux', equipment: 'barre', defaultRestSec: 180, defaultBarWeightKg: 20 },
  { name: 'Développé couché haltères', muscleGroup: 'pectoraux', equipment: 'halteres', defaultRestSec: 150 },
  { name: 'Développé incliné haltères', muscleGroup: 'pectoraux', equipment: 'halteres', defaultRestSec: 150 },
  { name: 'Écarté à la poulie', muscleGroup: 'pectoraux', equipment: 'poulie', defaultRestSec: 90 },
  { name: 'Écarté haltères', muscleGroup: 'pectoraux', equipment: 'halteres', defaultRestSec: 90 },
  { name: 'Développé machine convergente', muscleGroup: 'pectoraux', equipment: 'machine', defaultRestSec: 120 },
  { name: 'Dips lestés', muscleGroup: 'pectoraux', equipment: 'poids du corps', defaultRestSec: 150 },
  { name: 'Pompes', muscleGroup: 'pectoraux', equipment: 'poids du corps', defaultRestSec: 90 },

  // Dos
  { name: 'Soulevé de terre', muscleGroup: 'dos', equipment: 'barre', defaultRestSec: 240, defaultBarWeightKg: 20 },
  { name: 'Rowing barre', muscleGroup: 'dos', equipment: 'barre', defaultRestSec: 180, defaultBarWeightKg: 20 },
  { name: 'Rowing haltère', muscleGroup: 'dos', equipment: 'halteres', defaultRestSec: 120 },
  { name: 'Tractions pronation', muscleGroup: 'dos', equipment: 'poids du corps', defaultRestSec: 180 },
  { name: 'Tractions supination', muscleGroup: 'dos', equipment: 'poids du corps', defaultRestSec: 180 },
  { name: 'Tirage vertical', muscleGroup: 'dos', equipment: 'poulie', defaultRestSec: 120 },
  { name: 'Tirage horizontal', muscleGroup: 'dos', equipment: 'poulie', defaultRestSec: 120 },
  { name: 'Rowing T-bar', muscleGroup: 'dos', equipment: 'machine', defaultRestSec: 150 },
  { name: 'Pull-over à la poulie', muscleGroup: 'dos', equipment: 'poulie', defaultRestSec: 90 },
  { name: 'Shrug barre', muscleGroup: 'dos', equipment: 'barre', defaultRestSec: 90, defaultBarWeightKg: 20 },

  // Épaules
  { name: 'Développé militaire', muscleGroup: 'epaules', equipment: 'barre', defaultRestSec: 180, defaultBarWeightKg: 20 },
  { name: 'Développé épaules haltères', muscleGroup: 'epaules', equipment: 'halteres', defaultRestSec: 150 },
  { name: 'Élévations latérales', muscleGroup: 'epaules', equipment: 'halteres', defaultRestSec: 60 },
  { name: 'Élévations latérales poulie', muscleGroup: 'epaules', equipment: 'poulie', defaultRestSec: 60 },
  { name: 'Oiseau haltères', muscleGroup: 'epaules', equipment: 'halteres', defaultRestSec: 60 },
  { name: 'Face pull', muscleGroup: 'epaules', equipment: 'poulie', defaultRestSec: 60 },
  { name: 'Développé Arnold', muscleGroup: 'epaules', equipment: 'halteres', defaultRestSec: 120 },

  // Biceps
  { name: 'Curl barre', muscleGroup: 'biceps', equipment: 'barre', defaultRestSec: 90, defaultBarWeightKg: 20 },
  { name: 'Curl haltères', muscleGroup: 'biceps', equipment: 'halteres', defaultRestSec: 90 },
  { name: 'Curl incliné', muscleGroup: 'biceps', equipment: 'halteres', defaultRestSec: 90 },
  { name: 'Curl marteau', muscleGroup: 'biceps', equipment: 'halteres', defaultRestSec: 90 },
  { name: 'Curl pupitre', muscleGroup: 'biceps', equipment: 'machine', defaultRestSec: 90 },
  { name: 'Curl à la poulie', muscleGroup: 'biceps', equipment: 'poulie', defaultRestSec: 60 },

  // Triceps
  { name: 'Développé couché prise serrée', muscleGroup: 'triceps', equipment: 'barre', defaultRestSec: 150, defaultBarWeightKg: 20 },
  { name: 'Extension poulie haute', muscleGroup: 'triceps', equipment: 'poulie', defaultRestSec: 75 },
  { name: 'Extension corde', muscleGroup: 'triceps', equipment: 'poulie', defaultRestSec: 75 },
  { name: 'Barre au front', muscleGroup: 'triceps', equipment: 'barre', defaultRestSec: 120, defaultBarWeightKg: 20 },
  { name: 'Extension nuque haltère', muscleGroup: 'triceps', equipment: 'halteres', defaultRestSec: 90 },
  { name: 'Dips machine', muscleGroup: 'triceps', equipment: 'machine', defaultRestSec: 90 },

  // Avant-bras
  { name: 'Curl poignets', muscleGroup: 'avant-bras', equipment: 'barre', defaultRestSec: 60, defaultBarWeightKg: 20 },
  { name: 'Farmer walk', muscleGroup: 'avant-bras', equipment: 'halteres', defaultRestSec: 120 },

  // Quadriceps
  { name: 'Squat barre', muscleGroup: 'quadriceps', equipment: 'barre', defaultRestSec: 240, defaultBarWeightKg: 20 },
  { name: 'Squat avant', muscleGroup: 'quadriceps', equipment: 'barre', defaultRestSec: 210, defaultBarWeightKg: 20 },
  { name: 'Presse à cuisses', muscleGroup: 'quadriceps', equipment: 'machine', defaultRestSec: 180 },
  { name: 'Leg extension', muscleGroup: 'quadriceps', equipment: 'machine', defaultRestSec: 90 },
  { name: 'Fentes marchées', muscleGroup: 'quadriceps', equipment: 'halteres', defaultRestSec: 150 },
  { name: 'Squat bulgare', muscleGroup: 'quadriceps', equipment: 'halteres', defaultRestSec: 150 },
  { name: 'Hack squat', muscleGroup: 'quadriceps', equipment: 'machine', defaultRestSec: 180 },

  // Ischios
  { name: 'Soulevé de terre jambes tendues', muscleGroup: 'ischios', equipment: 'barre', defaultRestSec: 180, defaultBarWeightKg: 20 },
  { name: 'Leg curl allongé', muscleGroup: 'ischios', equipment: 'machine', defaultRestSec: 90 },
  { name: 'Leg curl assis', muscleGroup: 'ischios', equipment: 'machine', defaultRestSec: 90 },
  { name: 'Good morning', muscleGroup: 'ischios', equipment: 'barre', defaultRestSec: 150, defaultBarWeightKg: 20 },

  // Fessiers
  { name: 'Hip thrust', muscleGroup: 'fessiers', equipment: 'barre', defaultRestSec: 180, defaultBarWeightKg: 20 },
  { name: 'Abduction machine', muscleGroup: 'fessiers', equipment: 'machine', defaultRestSec: 60 },
  { name: 'Kickback poulie', muscleGroup: 'fessiers', equipment: 'poulie', defaultRestSec: 60 },

  // Mollets
  { name: 'Mollets debout', muscleGroup: 'mollets', equipment: 'machine', defaultRestSec: 60 },
  { name: 'Mollets assis', muscleGroup: 'mollets', equipment: 'machine', defaultRestSec: 60 },
  { name: 'Mollets à la presse', muscleGroup: 'mollets', equipment: 'machine', defaultRestSec: 60 },

  // Abdominaux
  { name: 'Crunch à la poulie', muscleGroup: 'abdominaux', equipment: 'poulie', defaultRestSec: 60 },
  { name: 'Relevé de jambes suspendu', muscleGroup: 'abdominaux', equipment: 'poids du corps', defaultRestSec: 60 },
  { name: 'Gainage', muscleGroup: 'abdominaux', equipment: 'poids du corps', defaultRestSec: 60 },
  { name: 'Roue abdominale', muscleGroup: 'abdominaux', equipment: 'autre', defaultRestSec: 90 },
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  pectoraux: 'Pectoraux',
  dos: 'Dos',
  epaules: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  'avant-bras': 'Avant-bras',
  quadriceps: 'Quadriceps',
  ischios: 'Ischios',
  fessiers: 'Fessiers',
  mollets: 'Mollets',
  abdominaux: 'Abdominaux',
  cardio: 'Cardio',
};

/** Ordre d'affichage : on suit le corps de haut en bas, pas l'alphabet. */
export const MUSCLE_GROUP_ORDER: MuscleGroup[] = [
  'pectoraux',
  'dos',
  'epaules',
  'biceps',
  'triceps',
  'avant-bras',
  'quadriceps',
  'ischios',
  'fessiers',
  'mollets',
  'abdominaux',
  'cardio',
];
