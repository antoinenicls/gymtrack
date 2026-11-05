/**
 * Repositories : unique porte d'entree vers IndexedDB.
 *
 * Aucun composant React n'importe `idb` ni `getDb` directement. Cette couche
 * est la couture prevue pour brancher une synchro cloud plus tard sans
 * toucher a l'interface.
 */

import { DEFAULT_SETTINGS, getDb } from '../db';
import { SEED_EXERCISES, SEED_VERSION } from '@/data/seedExercises';
import { emptyRecord, rebuildRecords } from '@/lib/records';
import { workingSets } from '@/lib/metrics';
import type {
  ActiveSession,
  Exercise,
  PersonalRecord,
  Routine,
  RoutineFolder,
  Settings,
  Workout,
} from '@/types/domain';

export const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/* -------------------------------------------------------------------------- */
/* Exercices                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Signal de modification de la bibliotheque d'exercices.
 *
 * IndexedDB ne previent personne : un ecran qui a charge une fiche la garde
 * telle qu'elle etait, indefiniment. Cas reellement vecu : en pleine seance, on
 * ouvre la fiche d'un mouvement depuis son nom, on y corrige la note de
 * reglage, on referme, et le bandeau de note du bloc affiche encore l'ancien
 * texte jusqu'a ce qu'on quitte la seance.
 *
 * Un numero de revision plutot qu'un bus d'evenements detailles : ce qui
 * compte est « quelque chose a bouge, relis », et la relecture d'une poignee
 * de fiches ne coute rien. `useSyncExternalStore` s'y branche directement.
 */
const exerciseListeners = new Set<() => void>();
let exerciseRevision = 0;

export function subscribeExercises(listener: () => void): () => void {
  exerciseListeners.add(listener);
  return () => {
    exerciseListeners.delete(listener);
  };
}

export function getExerciseRevision(): number {
  return exerciseRevision;
}

/** Copie du Set avant parcours : un abonne peut se desabonner en reagissant. */
function exercisesChanged(): void {
  exerciseRevision += 1;
  for (const listener of [...exerciseListeners]) listener();
}

export const exerciseRepo = {
  async all(): Promise<Exercise[]> {
    const db = await getDb();
    const list = await db.getAll('exercises');
    return list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  },

  async get(id: string): Promise<Exercise | undefined> {
    return (await getDb()).get('exercises', id);
  },

  async save(exercise: Exercise): Promise<void> {
    await (await getDb()).put('exercises', exercise);
    exercisesChanged();
  },

  async create(input: Omit<Exercise, 'id' | 'createdAt'>): Promise<Exercise> {
    const exercise: Exercise = { ...input, id: newId(), createdAt: Date.now() };
    await this.save(exercise);
    return exercise;
  },

  /**
   * Supprime un exercice de la bibliotheque.
   *
   * Les seances passees ne sont PAS touchees : elles gardent la trace de ce qui
   * a ete souleve, et un historique qui se reecrirait tout seul ne vaudrait
   * plus rien. Elles afficheront « Exercice supprime » a cet endroit, ce que
   * l'ecran de confirmation annonce avant d'agir.
   *
   * Un exercice LIVRE laisse une pierre tombale : voir `deletedSeedNames`.
   */
  async remove(id: string): Promise<void> {
    const db = await getDb();
    const exercise = await db.get('exercises', id);
    await db.delete('exercises', id);

    if (exercise && !exercise.isCustom) {
      const settings = await settingsRepo.get();
      const name = normalizeName(exercise.name);
      const known = settings.deletedSeedNames ?? [];
      if (!known.includes(name)) {
        await settingsRepo.save({ ...settings, deletedSeedNames: [...known, name] });
      }
    }

    exercisesChanged();
  },

  /**
   * Injecte les exercices livres avec l'app. N'ecrase jamais un exercice
   * existant : l'athlete a pu en regler le repos ou le renommer.
   *
   * Protege contre la double execution. React reexecute les effets en
   * StrictMode, et deux appels concurrents lisaient tous les deux le compteur
   * de version AVANT que l'un n'ecrive : les deux concluaient qu'il fallait
   * semer, et le catalogue partait en double. Un verrou de promesse au niveau
   * du module fait partager la meme execution a tous les appelants.
   */
  seedIfNeeded(): Promise<void> {
    seedPromise ??= runSeed();
    return seedPromise;
  },
};

let seedPromise: Promise<void> | null = null;

async function runSeed(): Promise<void> {
  const db = await getDb();
  const settings = await settingsRepo.get();
  if ((settings.seedVersion ?? 0) >= SEED_VERSION) {
    await dedupeSeededExercises();
    return;
  }

  const existing = await db.getAll('exercises');
  const knownNames = new Set(existing.map((e) => normalizeName(e.name)));

  // Les exercices livres deja supprimes a la main ne reviennent pas : une mise
  // a jour du catalogue ne doit pas defaire un choix explicite de l'athlete.
  for (const name of settings.deletedSeedNames ?? []) knownNames.add(name);

  const tx = db.transaction('exercises', 'readwrite');
  for (const seed of SEED_EXERCISES) {
    if (knownNames.has(normalizeName(seed.name))) continue;
    // On enrichit au fil de l'eau : deux entrees du catalogue portant le meme
    // nom ne doivent pas non plus se dupliquer entre elles.
    knownNames.add(normalizeName(seed.name));
    await tx.store.put({
      id: newId(),
      name: seed.name,
      muscleGroup: seed.muscleGroup,
      equipment: seed.equipment,
      defaultRestSec: seed.defaultRestSec,
      defaultBarWeightKg: seed.defaultBarWeightKg,
      isCustom: false,
      createdAt: Date.now(),
    });
  }
  await tx.done;

  await settingsRepo.save({ ...settings, seedVersion: SEED_VERSION });
  exercisesChanged();
}

/**
 * Repare les bases deja polluees par le doublon decrit ci-dessus.
 *
 * On ne supprime qu'un doublon du CATALOGUE (jamais un exercice cree par
 * l'athlete) et seulement s'il n'est reference par aucune seance : mieux vaut
 * laisser un doublon visible que de trouer un historique.
 */
async function dedupeSeededExercises(): Promise<void> {
  const db = await getDb();
  const all = await db.getAll('exercises');

  const byName = new Map<string, typeof all>();
  for (const exercise of all) {
    const key = normalizeName(exercise.name);
    byName.set(key, [...(byName.get(key) ?? []), exercise]);
  }

  const duplicates = [...byName.values()].filter((group) => group.length > 1);
  if (duplicates.length === 0) return;

  const workouts = await db.getAll('workouts');
  const routines = await db.getAll('routines');
  const used = new Set<string>();
  for (const workout of workouts) {
    for (const entry of workout.entries) used.add(entry.exerciseId);
  }
  for (const routine of routines) {
    for (const item of routine.items) used.add(item.exerciseId);
  }

  let removed = false;
  for (const group of duplicates) {
    // On garde le plus ancien, qui est celui que d'eventuelles references
    // pointent le plus probablement.
    const sorted = [...group].sort((a, b) => a.createdAt - b.createdAt);
    for (const extra of sorted.slice(1)) {
      if (extra.isCustom || used.has(extra.id)) continue;
      await db.delete('exercises', extra.id);
      removed = true;
    }
  }

  if (removed) exercisesChanged();
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* Seances                                                                     */
/* -------------------------------------------------------------------------- */

export const workoutRepo = {
  /** Historique du plus recent au plus ancien. */
  async all(): Promise<Workout[]> {
    const db = await getDb();
    const list = await db.getAllFromIndex('workouts', 'by-started');
    return list.reverse();
  },

  async get(id: string): Promise<Workout | undefined> {
    return (await getDb()).get('workouts', id);
  },

  async save(workout: Workout): Promise<void> {
    await (await getDb()).put('workouts', workout);
  },

  /**
   * Supprime une seance ET remet les records d'aplomb.
   *
   * Le recalcul est fait ICI et non par l'ecran appelant : un record survivant
   * a la seance qui le portait est un fantome, et le seul moyen que cela
   * n'arrive jamais est que la suppression ne puisse pas se faire sans.
   */
  async remove(id: string): Promise<void> {
    await (await getDb()).delete('workouts', id);
    await recordRepo.recompute();
  },

  /**
   * Supprime plusieurs seances d'un coup.
   *
   * Existe pour le recalcul, pas pour la suppression : appeler `remove` en
   * boucle rejouerait l'historique entier a chaque tour. Sur une selection de
   * cinquante seances, l'ecran se figeait le temps de cinquante parcours
   * complets. Ici on supprime tout, puis on recalcule une fois.
   */
  async removeMany(ids: string[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('workouts', 'readwrite');
    for (const id of ids) await tx.store.delete(id);
    await tx.done;
    await recordRepo.recompute();
  },

  /** Seances contenant un exercice donne, plus recentes en premier. */
  async forExercise(exerciseId: string): Promise<Workout[]> {
    const all = await this.all();
    return all.filter((w) => w.entries.some((e) => e.exerciseId === exerciseId));
  },

  /**
   * Derniere prestation sur un exercice, pour alimenter la colonne
   * « Precedent » de l'ecran de log.
   *
   * Toutes routines confondues : c'est l'exercice qui compte, pas la seance
   * d'ou il vient. On saute les apparitions sans aucune serie de travail (un
   * exercice ou l'on n'a fait que s'echauffer) : elles vidaient la colonne
   * alors qu'une vraie prestation existait juste avant.
   */
  async lastEntryFor(exerciseId: string): Promise<{ workout: Workout; entryIndex: number } | null> {
    for (const workout of await this.forExercise(exerciseId)) {
      const entryIndex = workout.entries.findIndex(
        (e) => e.exerciseId === exerciseId && workingSets(e).length > 0,
      );
      if (entryIndex >= 0) return { workout, entryIndex };
    }
    return null;
  },
};

/* -------------------------------------------------------------------------- */
/* Routines                                                                    */
/* -------------------------------------------------------------------------- */

export const routineRepo = {
  /**
   * Rang choisi a la main d'abord, « modifiee en dernier » ensuite.
   *
   * Le repli n'est pas un detail : une routine jamais rangee n'a pas d'`order`,
   * et elle doit se placer quelque part sans casser l'ordre de celles qui en
   * ont un. Elle passe donc apres, a sa place habituelle.
   */
  async all(): Promise<Routine[]> {
    const db = await getDb();
    const list = await db.getAll('routines');
    return list.sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
        b.updatedAt - a.updatedAt,
    );
  },

  async get(id: string): Promise<Routine | undefined> {
    return (await getDb()).get('routines', id);
  },

  async save(routine: Routine): Promise<void> {
    await (await getDb()).put('routines', { ...routine, updatedAt: Date.now() });
  },

  async remove(id: string): Promise<void> {
    await (await getDb()).delete('routines', id);
  },

  /**
   * Recale « derniere fois le… » sur ce que dit l'historique.
   *
   * Appelee apres la suppression d'une seance : la fin d'entrainement avait
   * pose la date du jour sur la routine, et annuler cette seance doit la
   * ramener a la precedente, pas la laisser mentir. On relit l'historique
   * plutot que de memoriser l'ancienne valeur : c'est lui qui fait foi.
   */
  async refreshLastPerformed(routineId: string): Promise<void> {
    const routine = await this.get(routineId);
    if (!routine) return;

    const workouts = await workoutRepo.all();
    const dates = workouts
      .filter((w) => w.routineId === routineId)
      .map((w) => w.startedAt);

    await this.save({
      ...routine,
      lastPerformedAt: dates.length > 0 ? Math.max(...dates) : null,
    });
  },

  /**
   * Copie complete d'une routine, pour la ranger ailleurs sans la deplacer.
   *
   * Le cas qui l'appelle : la meme seance doit figurer dans deux dossiers.
   * Elle n'y figurait qu'une fois, et la seule facon d'en avoir deux etait de
   * la reconstruire exercice par exercice.
   *
   * TOUS les identifiants sont regeneres, jusqu'aux series : deux routines qui
   * partagent l'id d'une serie, c'est une modification de l'une qui se
   * repercute dans l'autre au premier enregistrement.
   *
   * Ce qui n'est PAS repris : la date de derniere realisation, parce que la
   * copie n'a jamais ete faite et que son historique est celui de l'originale ;
   * et le rang de rangement, que deux routines ne peuvent pas occuper ensemble.
   * Les groupes de superset, eux, sont conserves tels quels : leurs
   * identifiants ne servent qu'a apparier des exercices A L'INTERIEUR d'une
   * routine, donc les regenerer ne changerait rien sinon rompre les paires.
   */
  async duplicate(id: string): Promise<Routine | undefined> {
    const source = await this.get(id);
    if (!source) return undefined;

    const { order: _order, ...rest } = source;
    const copy: Routine = {
      ...rest,
      id: newId(),
      name: `${source.name} (copie)`,
      items: source.items.map((item) => ({
        ...item,
        id: newId(),
        sets: item.sets.map((set) => ({ ...set, id: newId() })),
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastPerformedAt: null,
    };

    await this.save(copy);
    return copy;
  },

  /**
   * Fige l'ordre d'un groupe de routines, dans l'ordre des ids recus.
   *
   * Passe par `put` et non par `save` : ranger n'est pas modifier. Bousculer
   * `updatedAt` ferait mentir la fiche, et surtout redistribuerait le tri de
   * repli des routines encore sans `order` a chaque glissement.
   */
  async reorder(ids: string[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('routines', 'readwrite');
    for (const [index, id] of ids.entries()) {
      const routine = await tx.store.get(id);
      if (routine) await tx.store.put({ ...routine, order: index });
    }
    await tx.done;
  },
};

/* -------------------------------------------------------------------------- */
/* Dossiers de routines                                                        */
/* -------------------------------------------------------------------------- */

export const folderRepo = {
  async all(): Promise<RoutineFolder[]> {
    const list = await (await getDb()).getAll('routineFolders');
    return list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  },

  async create(name: string): Promise<RoutineFolder> {
    const existing = await this.all();
    const folder: RoutineFolder = {
      id: newId(),
      name: name.trim() || 'Nouveau dossier',
      order: existing.length,
      createdAt: Date.now(),
    };
    await (await getDb()).put('routineFolders', folder);
    return folder;
  },

  async save(folder: RoutineFolder): Promise<void> {
    await (await getDb()).put('routineFolders', folder);
  },

  /** Fige l'ordre des dossiers, dans l'ordre des ids recus. */
  async reorder(ids: string[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('routineFolders', 'readwrite');
    for (const [index, id] of ids.entries()) {
      const folder = await tx.store.get(id);
      if (folder) await tx.store.put({ ...folder, order: index });
    }
    await tx.done;
  },

  /**
   * Supprime un dossier SANS supprimer les routines qu'il contient : elles
   * remontent a la racine. Perdre des seances en rangeant serait inacceptable.
   */
  async remove(id: string): Promise<void> {
    const db = await getDb();
    const routines = await db.getAll('routines');
    for (const routine of routines) {
      if (routine.folderId === id) await db.put('routines', { ...routine, folderId: null });
    }
    await db.delete('routineFolders', id);
  },
};

/* -------------------------------------------------------------------------- */
/* Records                                                                     */
/* -------------------------------------------------------------------------- */

export const recordRepo = {
  async get(exerciseId: string): Promise<PersonalRecord> {
    const found = await (await getDb()).get('records', exerciseId);
    return found ?? emptyRecord(exerciseId);
  },

  async all(): Promise<PersonalRecord[]> {
    return (await getDb()).getAll('records');
  },

  async save(record: PersonalRecord): Promise<void> {
    await (await getDb()).put('records', record);
  },

  /**
   * Retire la ligne d'un exercice.
   *
   * Necessaire depuis que les records d'une seance en cours se RECALCULENT :
   * corriger une serie qui venait d'etablir le tout premier record d'un
   * exercice doit pouvoir le faire disparaitre, et reecrire une coquille vide
   * laisserait une ligne sans chiffre dans le Profil.
   */
  async remove(exerciseId: string): Promise<void> {
    await (await getDb()).delete('records', exerciseId);
  },

  async clear(): Promise<void> {
    await (await getDb()).clear('records');
  },

  /**
   * Reconstruit le magasin depuis l'historique reel.
   *
   * On VIDE avant de reecrire, dans la meme transaction : un exercice dont la
   * derniere seance vient d'etre supprimee ne doit plus avoir de record du
   * tout, et une simple reecriture laisserait son ancienne ligne en place.
   */
  async recompute(): Promise<void> {
    const db = await getDb();
    const workouts = await db.getAll('workouts');
    const rebuilt = rebuildRecords(workouts);

    const tx = db.transaction('records', 'readwrite');
    await tx.store.clear();
    for (const record of rebuilt) await tx.store.put(record);
    await tx.done;
  },
};

/* -------------------------------------------------------------------------- */
/* Reglages                                                                    */
/* -------------------------------------------------------------------------- */

export const settingsRepo = {
  async get(): Promise<Settings> {
    const found = await (await getDb()).get('settings', 'settings');
    // Fusion avec les valeurs par defaut : un reglage ajoute dans une version
    // ulterieure ne doit pas revenir undefined chez un utilisateur existant.
    return { ...DEFAULT_SETTINGS, ...found, id: 'settings' };
  },

  async save(settings: Settings): Promise<void> {
    await (await getDb()).put('settings', { ...settings, id: 'settings' });
  },

  /**
   * Modifie quelques reglages sans detenir les autres.
   *
   * Un ecran qui ne s'occupe que d'un reglage n'a pas a garder les vingt
   * autres en memoire pour les reecrire : il les ecraserait des qu'un autre
   * ecran en modifierait un pendant ce temps.
   */
  async patch(changes: Partial<Omit<Settings, 'id'>>): Promise<void> {
    await this.save({ ...(await this.get()), ...changes });
  },
};

/* -------------------------------------------------------------------------- */
/* Seance en cours                                                             */
/* -------------------------------------------------------------------------- */

export const activeSessionRepo = {
  async get(): Promise<ActiveSession | undefined> {
    return (await getDb()).get('activeSession', 'active');
  },

  /** Appelee a chaque mutation : c'est le filet anti-perte de donnees. */
  async save(session: Omit<ActiveSession, 'id' | 'updatedAt'>): Promise<void> {
    await (await getDb()).put('activeSession', {
      ...session,
      id: 'active',
      updatedAt: Date.now(),
    });
  },

  async clear(): Promise<void> {
    await (await getDb()).delete('activeSession', 'active');
  },
};

/* -------------------------------------------------------------------------- */
/* Maintenance                                                                 */
/* -------------------------------------------------------------------------- */

/** Efface tout. Utilise par le bouton de reinitialisation des reglages. */
export async function wipeAllData(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.clear('workouts'),
    db.clear('routines'),
    db.clear('routineFolders'),
    db.clear('records'),
    db.clear('activeSession'),
    db.clear('exercises'),
    db.clear('settings'),
  ]);
  exercisesChanged();
}
