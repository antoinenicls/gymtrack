/**
 * Programmes transferables : des seances partagees d'un appareil a l'autre.
 *
 * GymTrack n'a pas de serveur. Un programme voyage donc dans un fichier JSON
 * que l'un exporte et que l'autre importe.
 *
 * LE PIEGE CENTRAL : les identifiants d'exercice sont des UUID generes par
 * APPAREIL. L'id du « Developpe couche » sur le telephone de l'expediteur
 * n'existe pas sur celui du destinataire. Transferer un exerciseId brut produirait des
 * routines pointant dans le vide.
 *
 * D'ou la regle : le fichier embarque la DEFINITION de chaque exercice, et
 * l'import rapproche par nom normalise avant de creer ce qui manque.
 */

import type { Equipment, MuscleGroup, Routine, RoutineItem, SetType } from '@/types/domain';
import { carrySetMarks } from './setTypes';

/** Incremente a chaque changement cassant du format. */
export const PROGRAM_FORMAT_VERSION = 2;

export interface ProgramExercise {
  /** Cle de rapprochement : le nom normalise, jamais un UUID. */
  ref: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  defaultRestSec: number;
  defaultBarWeightKg?: number;
}

/** Une serie prescrite, telle qu'elle voyage dans le fichier. */
export interface ProgramSet {
  type: SetType;
  targetWeightKg: number | null;
  targetReps: number | null;
  /** Ajoute au format v2. Absent des fichiers plus anciens. */
  targetRpe?: number | null;
  /**
   * Marques ajoutees apres le format v2, absentes des fichiers plus anciens.
   * Un programme qui ne les porte pas se relit exactement comme avant : leur
   * absence vaut « non ».
   */
  toFailure?: boolean;
  dropStart?: boolean;
}

export interface ProgramItem {
  /** Reference vers ProgramExercise.ref. */
  ref: string;
  /** Depuis le format v2 : les series une par une, avec leur type. */
  sets: ProgramSet[];
  restSec: number;
  /** Index de groupe de superset, local au programme. */
  supersetGroup: number | null;
  notes: string;
  /** Champs du format v1, conserves pour pouvoir relire un ancien fichier. */
  targetSets?: number;
  targetReps?: number | null;
  targetWeightKg?: number | null;
}

export interface ProgramRoutine {
  name: string;
  items: ProgramItem[];
}

export interface Program {
  format: 'gymtrack.program';
  version: number;
  name: string;
  /** Mot joint par l'expediteur, affiche au moment d'importer. */
  note: string;
  createdAt: number;
  exercises: ProgramExercise[];
  routines: ProgramRoutine[];
}

/** Normalisation servant de cle de rapprochement entre appareils. */
export function normalizeRef(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

export interface ExportInput {
  name: string;
  note: string;
  routines: Routine[];
  /** Resolveur d'exercice, fourni par l'appelant depuis le repository. */
  resolveExercise: (exerciseId: string) => ProgramExercise | undefined;
}

export function buildProgram(input: ExportInput): Program {
  const exercises = new Map<string, ProgramExercise>();

  const routines: ProgramRoutine[] = input.routines.map((routine) => {
    // Les groupes de superset sont des UUID en base ; on les reindexe en
    // entiers locaux au programme, plus lisibles et sans fuite d'identifiant.
    const groupIndex = new Map<string, number>();

    const items: ProgramItem[] = [...routine.items]
      .sort((a, b) => a.order - b.order)
      .flatMap((item) => {
        const exercise = input.resolveExercise(item.exerciseId);
        // Un exercice supprime de la bibliotheque ne peut pas etre decrit,
        // donc il ne part pas : mieux vaut un programme amput e qu'une ligne
        // impossible a reconstituer chez le destinataire.
        if (!exercise) return [];

        exercises.set(exercise.ref, exercise);

        let group: number | null = null;
        if (item.supersetGroup) {
          if (!groupIndex.has(item.supersetGroup)) {
            groupIndex.set(item.supersetGroup, groupIndex.size);
          }
          group = groupIndex.get(item.supersetGroup) ?? null;
        }

        return [
          {
            ref: exercise.ref,
            sets: item.sets.map((planned) => ({
              type: planned.type,
              ...carrySetMarks(planned),
              targetWeightKg: planned.targetWeightKg,
              targetReps: planned.targetReps,
              targetRpe: planned.targetRpe,
            })),
            restSec: item.restSec,
            supersetGroup: group,
            notes: item.notes,
          },
        ];
      });

    return { name: routine.name, items };
  });

  return {
    format: 'gymtrack.program',
    version: PROGRAM_FORMAT_VERSION,
    name: input.name,
    note: input.note,
    createdAt: Date.now(),
    exercises: [...exercises.values()],
    routines,
  };
}

/* -------------------------------------------------------------------------- */
/* Import                                                                      */
/* -------------------------------------------------------------------------- */

export type ParseResult =
  | { ok: true; program: Program }
  | { ok: false; error: string };

/**
 * Analyse un fichier recu.
 *
 * On valide reellement la structure au lieu de faire confiance : le fichier
 * a transite par Instagram ou par mail, il a pu etre tronque, renomme, ou
 * ne jamais avoir ete un programme GymTrack.
 */
export function parseProgram(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Ce fichier n’est pas lisible. Il a peut-être été modifié pendant l’envoi.' };
  }

  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Ce fichier ne contient pas de programme.' };
  }

  const candidate = data as Partial<Program>;

  if (candidate.format !== 'gymtrack.program') {
    return { ok: false, error: 'Ce fichier n’est pas un programme GymTrack.' };
  }

  if (typeof candidate.version !== 'number' || candidate.version > PROGRAM_FORMAT_VERSION) {
    return {
      ok: false,
      error: 'Ce programme a été créé avec une version plus récente de GymTrack. Mets l’application à jour.',
    };
  }

  if (!Array.isArray(candidate.exercises) || !Array.isArray(candidate.routines)) {
    return { ok: false, error: 'Ce programme est incomplet.' };
  }

  const knownRefs = new Set(candidate.exercises.map((e) => e?.ref));
  for (const routine of candidate.routines) {
    if (typeof routine?.name !== 'string' || !Array.isArray(routine.items)) {
      return { ok: false, error: 'Ce programme est incomplet.' };
    }
    for (const item of routine.items) {
      // Une reference orpheline donnerait une ligne vide chez le destinataire.
      if (!knownRefs.has(item?.ref)) {
        return {
          ok: false,
          error: 'Ce programme fait référence à un exercice qu’il ne décrit pas.',
        };
      }
    }
  }

  return {
    ok: true,
    program: {
      format: 'gymtrack.program',
      version: candidate.version,
      name: typeof candidate.name === 'string' ? candidate.name : 'Programme importé',
      note: typeof candidate.note === 'string' ? candidate.note : '',
      createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now(),
      exercises: candidate.exercises,
      routines: candidate.routines,
    },
  };
}

export interface ImportPlan {
  /** Exercices du programme deja presents chez le destinataire, rapproches par nom. */
  matched: Array<{ ref: string; exerciseId: string; name: string }>;
  /** Exercices absents, qui seront crees a l'import. */
  missing: ProgramExercise[];
  routineCount: number;
}

/**
 * Prepare l'import sans rien ecrire, pour pouvoir annoncer au destinataire ce qui
 * va se passer avant qu'il valide.
 */
export function planImport(
  program: Program,
  existing: Array<{ id: string; name: string }>,
): ImportPlan {
  const byRef = new Map(existing.map((e) => [normalizeRef(e.name), e]));

  const matched: ImportPlan['matched'] = [];
  const missing: ProgramExercise[] = [];

  for (const exercise of program.exercises) {
    const found = byRef.get(normalizeRef(exercise.name));
    if (found) {
      matched.push({ ref: exercise.ref, exerciseId: found.id, name: found.name });
    } else {
      missing.push(exercise);
    }
  }

  return { matched, missing, routineCount: program.routines.length };
}

/**
 * Construit les routines a partir du programme et d'une table
 * ref vers exerciseId resolue sur l'appareil du destinataire.
 */
export function materializeRoutines(
  program: Program,
  refToExerciseId: Map<string, string>,
  makeId: () => string,
  now: number = Date.now(),
): Routine[] {
  return program.routines.map((routine) => {
    const groupIds = new Map<number, string>();

    const items: RoutineItem[] = routine.items.flatMap((item, index) => {
      const exerciseId = refToExerciseId.get(item.ref);
      if (!exerciseId) return [];

      let supersetGroup: string | null = null;
      if (item.supersetGroup !== null && item.supersetGroup !== undefined) {
        if (!groupIds.has(item.supersetGroup)) groupIds.set(item.supersetGroup, makeId());
        supersetGroup = groupIds.get(item.supersetGroup) ?? null;
      }

      // Un fichier au format v1 ne porte qu'un compteur de series : on le
      // deplie ici, exactement comme la migration de base de donnees.
      const sets =
        Array.isArray(item.sets) && item.sets.length > 0
          ? item.sets.map((planned) => ({
              id: makeId(),
              type: planned.type ?? 'normale',
              ...carrySetMarks(planned),
              targetWeightKg: planned.targetWeightKg ?? null,
              targetReps: planned.targetReps ?? null,
              targetRpe: planned.targetRpe ?? null,
            }))
          : Array.from({ length: Math.max(1, item.targetSets ?? 3) }, () => ({
              id: makeId(),
              type: 'normale' as SetType,
              targetWeightKg: item.targetWeightKg ?? null,
              targetReps: item.targetReps ?? null,
              targetRpe: null,
            }));

      return [
        {
          id: makeId(),
          exerciseId,
          sets,
          restSec: Math.max(0, item.restSec ?? 120),
          supersetGroup,
          notes: item.notes ?? '',
          order: index,
        },
      ];
    });

    return {
      id: makeId(),
      name: routine.name,
      // Un programme importe atterrit a la racine : le rangement est propre
      // a chaque appareil, il n'a pas a voyager.
      folderId: null,
      items,
      createdAt: now,
      updatedAt: now,
      lastPerformedAt: null,
    };
  });
}
