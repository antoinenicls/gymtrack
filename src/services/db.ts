/**
 * Schema IndexedDB de GymTrack.
 *
 * Cette base est la seule source de verite de l'app : il n'y a pas de backend.
 * Aucun composant React n'ouvre cette base directement, tout passe par
 * src/services/repositories/*. C'est ce qui permettra de brancher une synchro
 * cloud plus tard sans toucher a l'interface.
 *
 * Regle : tout changement de schema = DB_VERSION incremente + une branche dans
 * upgrade(). Les migrations ne sont jamais destructives.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_CHIME } from '@/lib/restChime';
import type {
  ActiveSession,
  Exercise,
  PersonalRecord,
  Routine,
  RoutineFolder,
  Settings,
  Workout,
} from '@/types/domain';

export const DB_NAME = 'gymtrack';
export const DB_VERSION = 4;

export interface GymTrackDb extends DBSchema {
  exercises: {
    key: string;
    value: Exercise;
    indexes: { 'by-muscle': string; 'by-name': string };
  };
  workouts: {
    key: string;
    value: Workout;
    indexes: { 'by-started': number };
  };
  routines: {
    key: string;
    value: Routine;
    indexes: { 'by-updated': number };
  };
  routineFolders: {
    key: string;
    value: RoutineFolder;
  };
  records: {
    key: string;
    value: PersonalRecord;
  };
  settings: {
    key: string;
    value: Settings;
  };
  /**
   * Magasin a un seul enregistrement : la seance en cours. Separe des workouts
   * pour qu'une seance interrompue ne pollue jamais l'historique ni les stats.
   */
  activeSession: {
    key: string;
    value: ActiveSession;
  };
  /**
   * Ancienne file d'envoi vers un service externe, retire depuis. Le store
   * reste declare : le supprimer demanderait une migration, pour un gain nul.
   */
  datacheckOutbox: {
    key: string;
    value: OutboxItem;
  };
}

/** Element de l'ancienne file d'envoi (cf. `datacheckOutbox`). */
export interface OutboxItem {
  workoutId: string;
  /** Charge utile deja mise en forme, pour ne pas dependre de l'historique. */
  payload: Record<string, unknown>;
  queuedAt: number;
  attempts: number;
  lastError?: string;
}

/** Forme des routines avant la v2, pour typer la migration. */
interface LegacyRoutineItem {
  id: string;
  exerciseId: string;
  sets?: unknown;
  targetSets?: number;
  targetReps?: number | null;
  targetWeightKg?: number | null;
  restSec?: number;
  supersetGroup?: string | null;
  notes?: string;
  order?: number;
}
interface LegacyRoutine {
  id: string;
  items?: LegacyRoutineItem[];
}

let dbPromise: Promise<IDBPDatabase<GymTrackDb>> | null = null;

export function getDb(): Promise<IDBPDatabase<GymTrackDb>> {
  if (!dbPromise) {
    dbPromise = openDB<GymTrackDb>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          const exercises = db.createObjectStore('exercises', { keyPath: 'id' });
          exercises.createIndex('by-muscle', 'muscleGroup');
          exercises.createIndex('by-name', 'name');

          const workouts = db.createObjectStore('workouts', { keyPath: 'id' });
          workouts.createIndex('by-started', 'startedAt');

          const routines = db.createObjectStore('routines', { keyPath: 'id' });
          routines.createIndex('by-updated', 'updatedAt');

          db.createObjectStore('records', { keyPath: 'exerciseId' });
          db.createObjectStore('settings', { keyPath: 'id' });
          db.createObjectStore('activeSession', { keyPath: 'id' });
        }

        // v2 : une routine stocke desormais chaque serie individuellement,
        // au lieu d'un simple compteur. On deplie les anciennes routines en
        // repetant la cible sur le nombre de series prevu, ce qui reproduit
        // exactement ce que l'ancien modele signifiait.
        if (oldVersion < 2 && oldVersion >= 1) {
          const store = transaction.objectStore('routines');
          void store.openCursor().then(function migrate(cursor): unknown {
            if (!cursor) return undefined;
            const routine = cursor.value as LegacyRoutine;
            const items = (routine.items ?? []).map((item) => {
              if (Array.isArray(item.sets)) return item;
              const count = Math.max(1, item.targetSets ?? 3);
              return {
                id: item.id,
                exerciseId: item.exerciseId,
                sets: Array.from({ length: count }, (_, i) => ({
                  id: `${item.id}-s${i}`,
                  type: 'normale',
                  targetWeightKg: item.targetWeightKg ?? null,
                  targetReps: item.targetReps ?? null,
                  targetRpe: null,
                })),
                restSec: item.restSec ?? 120,
                supersetGroup: item.supersetGroup ?? null,
                notes: item.notes ?? '',
                order: item.order ?? 0,
              };
            });
            void cursor.update({ ...routine, items } as unknown as Routine);
            return cursor.continue().then(migrate);
          });
        }

        // v3 : dossiers de rangement des routines. Les routines existantes
        // restent a la racine, aucune n'est deplacee sans que l'utilisateur
        // l'ait demande.
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('routineFolders')) {
            db.createObjectStore('routineFolders', { keyPath: 'id' });
          }
          if (oldVersion >= 1) {
            const store = transaction.objectStore('routines');
            void store.openCursor().then(function assign(cursor): unknown {
              if (!cursor) return undefined;
              const routine = cursor.value as Routine;
              if (routine.folderId === undefined) {
                void cursor.update({ ...routine, folderId: null });
              }
              return cursor.continue().then(assign);
            });
          }
        }

        // v4 : file d'attente d'envoi (inutilisee depuis). Purement additif : aucune donnee
        // existante n'est lue ni reecrite, une base v3 s'ouvre simplement avec
        // un magasin de plus, vide.
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains('datacheckOutbox')) {
            db.createObjectStore('datacheckOutbox', { keyPath: 'workoutId' });
          }
        }
      },
      blocked() {
        console.warn('GymTrack : une autre version de l’app est ouverte dans un onglet.');
      },
    });
  }
  return dbPromise;
}

/** Reinitialise le cache de connexion. Utilise par les tests. */
export function resetDbCache(): void {
  dbPromise = null;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  barWeightsKg: [20, 15, 10],
  defaultBarWeightKg: 20,
  availablePlatesKg: [25, 20, 15, 10, 5, 2.5, 1.25],
  defaultRestSec: 120,
  soundEnabled: true,
  chimeId: DEFAULT_CHIME,
  vibrationEnabled: true,
  weightStepKg: 2.5,
  rpeEnabled: true,
  effortScale: 'rpe',
  // Trois seances par semaine : le rythme le plus courant, et un point de
  // depart que l'utilisateur ajuste depuis son profil.
  weeklyGoal: 3,
  // Desactive par defaut : une notification exige une permission systeme,
  // qu'on ne demande qu'apres un geste explicite de l'utilisateur.
  notificationsEnabled: false,
  // Aucune enseigne par defaut : on ne devine pas ou l'athlete s'entraine.
  gym: null,
};
