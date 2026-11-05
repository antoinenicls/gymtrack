/**
 * Etat de la seance en cours.
 *
 * Regle absolue du brief : aucune perte de donnees en cours d'entrainement.
 * Chaque mutation persiste immediatement dans IndexedDB via le repository.
 * Si le telephone meurt entre deux series, on retrouve tout au redemarrage.
 */

import { create } from 'zustand';
import type {
  ActiveSession,
  PersonalRecord,
  PrKind,
  RestTimerState,
  Routine,
  SetType,
  Workout,
  WorkoutEntry,
  WorkoutSet,
} from '@/types/domain';
import {
  activeSessionRepo,
  exerciseRepo,
  newId,
  recordRepo,
  routineRepo,
  workoutRepo,
} from '@/services/repositories';
import {
  checkSessionVolumeForPr,
  emptyRecord,
  isEmptyRecord,
  monthRecords,
  rebuildRecords,
  replayEntryPrs,
  replayMonthPrs,
} from '@/lib/records';
import { entryVolume, entryWorkingSetCount, performedSets } from '@/lib/metrics';
import { endsDropGroup } from '@/lib/dropset';
import { carrySetMarks } from '@/lib/setTypes';
import { e1rmValue } from '@/lib/e1rm';
import { generateWarmup } from '@/lib/warmup';
import { restBelongsTo } from '@/lib/restTimer';

interface WorkoutState {
  workout: Workout | null;
  restTimer: RestTimerState | null;
  /**
   * Records d'AVANT la seance en cours, charges a son ouverture.
   *
   * Ce point de depart ne bouge pas de toute la seance, et c'est ce qui permet
   * de rejouer les badges PR a chaque correction : un record cumule avec ce
   * qui vient d'etre saisi ne saurait plus dire ce qu'il valait avant, donc ne
   * saurait pas revenir en arriere si l'athlete corrige ses reps a la baisse.
   */
  baseRecords: Map<string, PersonalRecord>;
  /**
   * Records du mois civil d'AVANT la seance, pour le badge « PR du mois ».
   * Un exercice absent de la carte n'a pas encore ete fait ce mois-ci.
   */
  baseMonthRecords: Map<string, PersonalRecord>;
  hydrated: boolean;
  /**
   * Seance repliee en barre, le temps d'aller voir ailleurs.
   *
   * Purement visuel, et volontairement NON persiste : ce qui se joue ici est
   * « je vais jeter un oeil pendant mon repos », pas un etat de la seance. Une
   * app relancee apres avoir ete tuee par iOS rouvre donc l'entrainement en
   * grand, ce qui est ce qu'on veut en revenant dessus a froid.
   */
  minimized: boolean;

  hydrate: () => Promise<void>;
  setMinimized: (minimized: boolean) => void;
  startEmpty: () => Promise<void>;
  startFromRoutine: (routine: Routine) => Promise<void>;
  cancel: () => Promise<void>;
  finish: () => Promise<Workout | null>;

  addExercises: (exerciseIds: string[]) => Promise<void>;
  removeEntry: (entryId: string) => Promise<void>;
  reorderEntry: (entryId: string, direction: -1 | 1) => Promise<void>;
  setEntryNotes: (entryId: string, notes: string) => Promise<void>;
  setEntryRest: (entryId: string, restSec: number) => Promise<void>;
  toggleSuperset: (entryId: string) => Promise<void>;

  addSet: (entryId: string) => Promise<void>;
  /** Glisse une serie vierge JUSTE AVANT celle-ci, sans toucher aux autres. */
  insertSetBefore: (entryId: string, setId: string) => Promise<void>;
  removeSet: (entryId: string, setId: string) => Promise<void>;
  updateSet: (entryId: string, setId: string, patch: Partial<WorkoutSet>) => Promise<void>;
  setSetType: (entryId: string, setId: string, type: SetType) => Promise<void>;
  toggleSetDone: (entryId: string, setId: string) => Promise<PrFlash | null>;
  addWarmupSets: (entryId: string) => Promise<void>;

  setName: (name: string) => Promise<void>;
  /** Descriptif de la seance. Repercute sur la routine dont elle est issue. */
  setDescription: (description: string) => Promise<void>;
  /** Sens inverse : la routine a ete modifiee, la seance en cours suit. */
  applyRoutineDescription: (routineId: string, description: string) => Promise<boolean>;

  startRest: (entryId: string, seconds: number, setId?: string) => Promise<void>;
  adjustRest: (deltaSec: number) => Promise<void>;
  toggleRestPause: () => Promise<void>;
  stopRest: () => Promise<void>;
}

/** Signal renvoye a l'UI quand une serie validee bat un record. */
export interface PrFlash {
  entryId: string;
  setId: string;
  kinds: string[];
  /** Vrai quand seul le record DU MOIS est battu, pas le record absolu. */
  month: boolean;
}


/**
 * Records d'avant la seance en cours.
 *
 * Deux sources, et la distinction compte. Sans seance en cours, le magasin des
 * records EST a jour, on le lit tel quel. Avec une seance en cours, il contient
 * deja les records qu'elle a etablis : le relire prendrait pour point de depart
 * une performance de la seance elle-meme, et un badge PR ne pourrait plus
 * jamais redescendre. On rejoue alors l'historique, qui ne contient par
 * construction que les seances terminees.
 */
async function loadBaseRecords(hasActiveSession: boolean): Promise<Map<string, PersonalRecord>> {
  const records = hasActiveSession
    ? rebuildRecords(await workoutRepo.all())
    : await recordRepo.all();
  return new Map(records.map((r) => [r.exerciseId, r]));
}

/**
 * Records du mois d'avant la seance commencee a `startedAt`.
 *
 * Toujours rejoues depuis l'historique : le magasin des records ne garde que
 * l'absolu. La seance en cours n'y figure pas, puisqu'elle n'est pas encore
 * enregistree.
 */
async function loadBaseMonthRecords(startedAt: number): Promise<Map<string, PersonalRecord>> {
  const records = monthRecords(await workoutRepo.all(), startedAt);
  return new Map(records.map((r) => [r.exerciseId, r]));
}

export const useWorkoutStore = create<WorkoutState>((set, get) => {
  /** Persiste l'etat courant. Appele apres chaque mutation, sans exception. */
  const persist = async (): Promise<void> => {
    const { workout, restTimer } = get();
    if (!workout) {
      await activeSessionRepo.clear();
      return;
    }
    await activeSessionRepo.save({ workout, restTimer });
  };

  const mutateWorkout = async (fn: (draft: Workout) => void): Promise<void> => {
    const current = get().workout;
    if (!current) return;
    const draft: Workout = { ...current, entries: current.entries.map(cloneEntry) };
    fn(draft);
    set({ workout: draft });
    await persist();
  };

  const findEntry = (workout: Workout, entryId: string): WorkoutEntry | undefined =>
    workout.entries.find((e) => e.id === entryId);

  /**
   * Modifie un exercice, puis REPOSE ses badges PR sur ce qui est ecrit.
   *
   * Tout ce qui touche a une serie validee passe par ici : cocher, decocher,
   * corriger un chiffre, changer un type, supprimer une ligne. Un record ne se
   * decide pas au moment du clic, il se decide sur le contenu final de
   * l'exercice, et il doit pouvoir disparaitre aussi bien qu'apparaitre.
   *
   * La modification est appliquee DANS le meme brouillon que le recalcul :
   * une seule ecriture en base pour les deux, ce qui compte quand la frappe
   * d'un chiffre passe par ici a chaque caractere.
   *
   * @returns les records battus, par identifiant de serie.
   */
  const rewritePrs = async (
    entryId: string,
    edit: (entry: WorkoutEntry) => void,
  ): Promise<{ all: Map<string, PrKind[]>; month: Map<string, PrKind[]> }> => {
    const source = get().workout;
    const entry = source ? findEntry(source, entryId) : undefined;
    if (!entry) return { all: new Map(), month: new Map() };

    const base = get().baseRecords.get(entry.exerciseId) ?? emptyRecord(entry.exerciseId);
    const monthBase = get().baseMonthRecords.get(entry.exerciseId);
    let kindsBySetId = new Map<string, PrKind[]>();
    let monthBySetId = new Map<string, PrKind[]>();
    let next = base;

    await mutateWorkout((draft) => {
      const target = findEntry(draft, entryId);
      if (!target) return;
      edit(target);

      const now = Date.now();
      const replay = replayEntryPrs(target, base, draft.id, now);
      kindsBySetId = replay.kindsBySetId;
      next = replay.next;
      monthBySetId = replayMonthPrs(target, monthBase, kindsBySetId, draft.id, now);

      for (const s of target.sets) {
        const kinds = kindsBySetId.get(s.id);
        if (kinds) s.prKinds = kinds;
        else delete s.prKinds;
        const monthKinds = monthBySetId.get(s.id);
        if (monthKinds) s.monthPrKinds = monthKinds;
        else delete s.monthPrKinds;
      }
    });

    // Le magasin des records suit dans les deux sens : un record efface par une
    // correction doit quitter le Profil aussi vite qu'il y etait apparu, et un
    // exercice qui n'a plus rien a montrer ne garde pas de ligne vide.
    if (isEmptyRecord(next)) await recordRepo.remove(entry.exerciseId);
    else await recordRepo.save(next);

    return { all: kindsBySetId, month: monthBySetId };
  };

  return {
    workout: null,
    restTimer: null,
    baseRecords: new Map(),
    baseMonthRecords: new Map(),
    hydrated: false,
    minimized: false,

    async hydrate() {
      const session: ActiveSession | undefined = await activeSessionRepo.get();
      const baseRecords = await loadBaseRecords(session !== undefined);
      const baseMonthRecords = session
        ? await loadBaseMonthRecords(session.workout.startedAt)
        : new Map<string, PersonalRecord>();
      set({
        workout: session?.workout ?? null,
        restTimer: session?.restTimer ?? null,
        baseRecords,
        baseMonthRecords,
        hydrated: true,
        minimized: false,
      });
    },

    setMinimized(minimized) {
      set({ minimized });
    },

    async startEmpty() {
      const startedAt = Date.now();
      const baseRecords = await loadBaseRecords(false);
      const baseMonthRecords = await loadBaseMonthRecords(startedAt);
      set({
        workout: {
          id: newId(),
          name: defaultSessionName(),
          routineId: null,
          startedAt,
          endedAt: null,
          entries: [],
          notes: '',
          durationSec: null,
        },
        restTimer: null,
        baseRecords,
        baseMonthRecords,
        minimized: false,
      });
      await persist();
    },

    async startFromRoutine(routine) {
      const startedAt = Date.now();
      const baseRecords = await loadBaseRecords(false);
      const baseMonthRecords = await loadBaseMonthRecords(startedAt);
      const entries: WorkoutEntry[] = routine.items
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((item, index) => ({
          id: newId(),
          exerciseId: item.exerciseId,
          /**
            * Chaque serie prevue devient une serie a realiser, en conservant
            * son type ET ses marques : un echauffement prescrit reste un
            * echauffement, une descente reste separee de la suivante et garde
            * son echec. Sans `carrySetMarks`, tout ce qui avait ete configure
            * dans l'editeur disparaissait au lancement de la seance.
            */
          sets: item.sets.map((planned) => ({
            ...blankSet(planned.targetWeightKg, planned.targetReps),
            type: planned.type,
            ...carrySetMarks(planned),
          })),
          notes: item.notes,
          restSec: item.restSec,
          supersetGroup: item.supersetGroup,
          order: index,
        }));

      set({
        workout: {
          id: newId(),
          name: routine.name,
          routineId: routine.id,
          startedAt,
          endedAt: null,
          entries,
          // La description de la routine devient la note de la seance, comme
          // les notes d'exercice juste au-dessus. Copie et non lien : ce qu'on
          // ecrit pendant la seance appartient a CETTE seance, sinon corriger
          // une charge du jour reecrirait la routine pour toutes les suivantes.
          notes: routine.description ?? '',
          durationSec: null,
        },
        restTimer: null,
        baseRecords,
        baseMonthRecords,
        minimized: false,
      });
      await persist();
    },

    async cancel() {
      set({ workout: null, restTimer: null, minimized: false });
      await activeSessionRepo.clear();
    },

    async finish() {
      const { workout } = get();
      if (!workout) return null;

      // On ne garde que ce qui a ete REALISE : une seance polluee de lignes
      // vides fausse toutes les statistiques. Un echauffement valide compte
      // comme realise meme sans repetitions, une serie de travail non.
      const entries = workout.entries
        .map((entry) => ({ ...entry, sets: performedSets(entry) }))
        .filter((entry) => entry.sets.length > 0);

      const endedAt = Date.now();
      const finished: Workout = {
        ...workout,
        entries,
        endedAt,
        durationSec: Math.round((endedAt - workout.startedAt) / 1000),
      };

      // Un record de volume par exercice se juge sur la seance complete,
      // donc seulement maintenant.
      for (const entry of finished.entries) {
        const current = await recordRepo.get(entry.exerciseId);
        const check = checkSessionVolumeForPr(
          entryVolume(entry),
          current,
          finished.id,
          endedAt,
        );
        if (check.kinds.length > 0) await recordRepo.save(check.next);
      }

      if (finished.entries.length > 0) {
        await workoutRepo.save(finished);
        if (finished.routineId) {
          const routine = await routineRepo.get(finished.routineId);
          if (routine) await routineRepo.save({ ...routine, lastPerformedAt: endedAt });
        }
      }

      set({ workout: null, restTimer: null, minimized: false });
      await activeSessionRepo.clear();
      return finished.entries.length > 0 ? finished : null;
    },

    async addExercises(exerciseIds) {
      const exercises = await Promise.all(exerciseIds.map((id) => exerciseRepo.get(id)));
      await mutateWorkout((draft) => {
        exercises.forEach((exercise, i) => {
          if (!exercise) return;
          draft.entries.push({
            id: newId(),
            exerciseId: exercise.id,
            sets: [blankSet(null, null)],
            notes: '',
            restSec: exercise.defaultRestSec,
            supersetGroup: null,
            order: draft.entries.length + i,
          });
        });
      });
    },

    async removeEntry(entryId) {
      await mutateWorkout((draft) => {
        draft.entries = draft.entries.filter((e) => e.id !== entryId);
        draft.entries.forEach((e, i) => (e.order = i));
      });
    },

    async reorderEntry(entryId, direction) {
      await mutateWorkout((draft) => {
        const index = draft.entries.findIndex((e) => e.id === entryId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= draft.entries.length) return;
        const [moved] = draft.entries.splice(index, 1);
        if (moved) draft.entries.splice(target, 0, moved);
        draft.entries.forEach((e, i) => (e.order = i));
      });
    },

    async setEntryNotes(entryId, notes) {
      await mutateWorkout((draft) => {
        const entry = findEntry(draft, entryId);
        if (entry) entry.notes = notes;
      });
    },

    async setEntryRest(entryId, restSec) {
      await mutateWorkout((draft) => {
        const entry = findEntry(draft, entryId);
        if (entry) entry.restSec = Math.max(0, restSec);
      });
    },

    /**
     * Lie ou delie cet exercice avec le precedent. Un superset se construit en
     * accrochant un exercice a celui du dessus, ce qui est la seule geste qui
     * ait du sens dans une liste ordonnee.
     */
    async toggleSuperset(entryId) {
      await mutateWorkout((draft) => {
        const index = draft.entries.findIndex((e) => e.id === entryId);
        const entry = draft.entries[index];
        const previous = draft.entries[index - 1];
        if (!entry || !previous) return;

        if (entry.supersetGroup && entry.supersetGroup === previous.supersetGroup) {
          // On detache : le groupe ne garde du sens que s'il reste au moins
          // deux membres, sinon on le dissout entierement.
          const group = entry.supersetGroup;
          entry.supersetGroup = null;
          const remaining = draft.entries.filter((e) => e.supersetGroup === group);
          if (remaining.length === 1 && remaining[0]) remaining[0].supersetGroup = null;
          return;
        }

        const group = previous.supersetGroup ?? newId();
        previous.supersetGroup = group;
        entry.supersetGroup = group;
      });
    },

    async addSet(entryId) {
      await mutateWorkout((draft) => {
        const entry = findEntry(draft, entryId);
        if (!entry) return;
        // La nouvelle serie reprend la charge de la precedente : c'est ce que
        // l'athlete fait neuf fois sur dix, autant lui epargner la saisie.
        const last = [...entry.sets].reverse().find((s) => s.type !== 'echauffement');
        entry.sets.push(blankSet(last?.weightKg ?? null, last?.reps ?? null));
      });
    },

    /**
     * Insere une serie AVANT celle designee.
     *
     * Une serie oubliee au milieu ne pouvait jusqu'ici que s'ajouter en bout de
     * liste : il fallait ensuite retaper tous les chiffres du dessous pour les
     * decaler. Un seul sens d'insertion suffit a atteindre toutes les positions,
     * « en dessous de la 2 » etant « au-dessus de la 3 », et le bout de liste
     * restant la charge du bouton d'ajout.
     *
     * La nouvelle ligne est vierge et non validee : elle ne peut rien changer
     * aux records, d'ou la mutation simple plutot que le recalcul.
     */
    async insertSetBefore(entryId, setId) {
      await mutateWorkout((draft) => {
        const entry = findEntry(draft, entryId);
        if (!entry) return;
        const index = entry.sets.findIndex((s) => s.id === setId);
        if (index < 0) return;
        // Meme raison qu'a l'ajout : on reprend la charge de la serie qui
        // precede l'insertion, sinon celle au-dessus de laquelle on se glisse.
        const above = entry.sets
          .slice(0, index)
          .reverse()
          .find((s) => s.type !== 'echauffement');
        const model = above ?? entry.sets[index];
        entry.sets.splice(index, 0, blankSet(model?.weightKg ?? null, model?.reps ?? null));
      });
    },

    async removeSet(entryId, setId) {
      // Supprimer une serie validee rend son record a celle qui suit, s'il y
      // en a une : d'ou le passage par le recalcul.
      await rewritePrs(entryId, (entry) => {
        entry.sets = entry.sets.filter((s) => s.id !== setId);
      });
    },

    /**
     * Corrige une serie.
     *
     * Sur une serie DEJA validee, toucher au poids ou aux reps rejoue les
     * records de l'exercice. C'est le geste le plus courant de la seance :
     * on coche, puis on ajuste au chiffre reellement realise. S'en tenir a ce
     * qui etait ecrit au moment du clic ratait les records battus juste apres
     * la coche, et en laissait afficher qui n'avaient plus lieu d'etre.
     */
    async updateSet(entryId, setId, patch) {
      const workout = get().workout;
      const target = workout
        ? findEntry(workout, entryId)?.sets.find((s) => s.id === setId)
        : undefined;
      if (!target) return;

      if (target.done && ('weightKg' in patch || 'reps' in patch)) {
        await rewritePrs(entryId, (entry) => {
          const s = entry.sets.find((x) => x.id === setId);
          if (!s) return;
          Object.assign(s, patch);
          // L'e1rm fige a la validation suit la correction : sinon la seance
          // garde une force estimee qui ne correspond a aucune ligne ecrite.
          if (s.weightKg !== null && s.reps !== null) s.e1rm = e1rmValue(s.weightKg, s.reps);
          else delete s.e1rm;
        });
        return;
      }

      await mutateWorkout((draft) => {
        const s = findEntry(draft, entryId)?.sets.find((x) => x.id === setId);
        if (s) Object.assign(s, patch);
      });
    },

    async setSetType(entryId, setId, type) {
      // Passer une serie en echauffement la sort des records, et l'en sortir
      // l'y remet : le type decide autant que les chiffres.
      await rewritePrs(entryId, (entry) => {
        const target = entry.sets.find((s) => s.id === setId);
        if (target) target.type = type;
      });
    },

    async toggleSetDone(entryId, setId) {
      const workout = get().workout;
      if (!workout) return null;

      const entry = findEntry(workout, entryId);
      const target = entry?.sets.find((s) => s.id === setId);
      if (!entry || !target) return null;

      // Devalidation : la serie sort du calcul et l'exercice se recalcule. Le
      // record qu'elle portait peut redescendre a une autre serie, ou
      // disparaitre s'il n'y en a pas d'autre.
      if (target.done) {
        await rewritePrs(entryId, (e) => {
          const s = e.sets.find((x) => x.id === setId);
          if (!s) return;
          s.done = false;
          delete s.completedAt;
          delete s.e1rm;
        });

        // Le chrono lance par CETTE serie n'a plus lieu d'etre : la serie est
        // annulee, son repos aussi. Celui d'une autre serie continue, il ne
        // nous appartient pas.
        if (restBelongsTo(get().restTimer, entryId, setId)) await get().stopRest();
        return null;
      }

      const now = Date.now();
      const prs = await rewritePrs(entryId, (e) => {
        const s = e.sets.find((x) => x.id === setId);
        if (!s) return;
        s.done = true;
        s.completedAt = now;
        if (s.weightKg !== null && s.reps !== null) s.e1rm = e1rmValue(s.weightKg, s.reps);
      });
      const kinds = prs.all.get(setId) ?? [];
      const monthKinds = prs.month.get(setId) ?? [];

      /**
       * Le chrono de recuperation part tout seul a la validation : c'est le
       * comportement attendu, l'athlete ne doit rien avoir a lancer.
       *
       * Deux exceptions, et ce sont les deux moments ou l'on ENCHAINE : apres
       * un echauffement, et entre les paliers d'une degressive. Une degressive
       * se mene jusqu'a l'echec, on retire du poids et on repart ; le seul
       * temps mort est celui qu'il faut pour alleger la barre. Lancer un
       * chrono de trois minutes la contredirait le principe meme.
       */
      const setIndex = entry.sets.findIndex((s) => s.id === setId);
      const enchaine = target.type === 'echauffement' || !endsDropGroup(entry.sets, setIndex);
      if (!enchaine && entry.restSec > 0) {
        await get().startRest(entryId, entry.restSec, setId);
      }

      if (kinds.length > 0) return { entryId, setId, kinds, month: false };
      if (monthKinds.length > 0) return { entryId, setId, kinds: monthKinds, month: true };
      return null;
    },

    async addWarmupSets(entryId) {
      const workout = get().workout;
      const entry = workout ? findEntry(workout, entryId) : undefined;
      if (!entry) return;

      const exercise = await exerciseRepo.get(entry.exerciseId);
      const firstWorking = entry.sets.find((s) => s.type !== 'echauffement');
      const reference = firstWorking?.weightKg;
      if (reference === null || reference === undefined || reference <= 0) return;

      const usesBar = exercise?.equipment === 'barre';
      const warmups = generateWarmup(reference, {
        barKg: exercise?.defaultBarWeightKg ?? 20,
        usesBar,
      });
      if (warmups.length === 0) return;

      await mutateWorkout((draft) => {
        const target = findEntry(draft, entryId);
        if (!target) return;
        // Les series d'echauffement se placent en tete, dans l'ordre de montee.
        const existing = target.sets.filter((s) => s.type !== 'echauffement');
        target.sets = [
          ...warmups.map((w) => ({
            id: newId(),
            type: 'echauffement' as SetType,
            weightKg: w.weightKg,
            reps: w.reps,
            rpe: null,
            done: false,
          })),
          ...existing,
        ];
      });
    },

    async setName(name) {
      await mutateWorkout((draft) => {
        draft.name = name;
      });
    },

    /**
     * Descriptif de la seance, ecrit AUSSI sur la routine dont elle est issue.
     *
     * Le descriptif est UNE valeur, pas deux qui se ressembleraient. La corriger
     * pendant la seance doit la corriger partout, sinon elle revient a
     * l'ancienne des qu'on retourne sur la liste, ce qui se lit comme une
     * perte. Une seance libre n'a pas de routine et ne propage rien.
     *
     * Le champ stocke reste `notes` : le renommer casserait les sauvegardes
     * JSON deja exportees, pour un gain nul.
     */
    async setDescription(description) {
      const current = get().workout;
      if (!current) return;

      await mutateWorkout((draft) => {
        draft.notes = description;
      });

      if (!current.routineId) return;
      const routine = await routineRepo.get(current.routineId);
      if (!routine) return;
      if ((routine.description ?? '') === description) return;

      await routineRepo.save({
        ...routine,
        description: description.trim() === '' ? undefined : description,
      });
    },

    /**
     * Sens inverse : la routine vient d'etre modifiee, la seance en cours suit.
     *
     * Sans condition, contrairement a une premiere version qui protegeait un
     * texte saisi pendant la seance. Puisque les deux ne font qu'un, « proteger »
     * revenait a les desynchroniser, exactement ce qu'on cherche a eviter.
     */
    async applyRoutineDescription(routineId, description) {
      const current = get().workout;
      if (!current || current.routineId !== routineId) return false;
      if (current.notes === description) return false;

      await mutateWorkout((draft) => {
        draft.notes = description;
      });
      return true;
    },

    async startRest(entryId, seconds, setId) {
      // Un nouveau chrono REMPLACE le precedent : valider une serie pendant le
      // repos d'une autre relance le compte a zero, ce qui est le comportement
      // attendu quand on enchaine.
      set({
        restTimer: { endsAt: Date.now() + seconds * 1000, totalSec: seconds, entryId, setId },
      });
      await persist();
    },

    async adjustRest(deltaSec) {
      const timer = get().restTimer;
      if (!timer) return;

      const totalSec = Math.max(0, timer.totalSec + deltaSec);

      // En pause, c'est la duree RESTANTE qu'on allonge ou qu'on raccourcit :
      // deplacer `endsAt` ne se verrait qu'a la reprise, et le chiffre affiche
      // ne bougerait pas sous le doigt.
      if (timer.pausedRemainingMs !== undefined) {
        set({
          restTimer: {
            ...timer,
            totalSec,
            pausedRemainingMs: Math.max(0, timer.pausedRemainingMs + deltaSec * 1000),
          },
        });
        await persist();
        return;
      }

      set({
        restTimer: { ...timer, endsAt: timer.endsAt + deltaSec * 1000, totalSec },
      });
      await persist();
    },

    /**
     * Met le repos en pause, ou le relance.
     *
     * On fige la duree restante plutot que l'echeance : mise en pause, une
     * echeance absolue continuerait de reculer dans le passe pendant que le
     * temps s'ecoule, et la reprise afficherait un chrono deja termine.
     */
    async toggleRestPause() {
      const timer = get().restTimer;
      if (!timer) return;

      if (timer.pausedRemainingMs !== undefined) {
        const { pausedRemainingMs, ...running } = timer;
        set({ restTimer: { ...running, endsAt: Date.now() + pausedRemainingMs } });
        await persist();
        return;
      }

      set({
        restTimer: {
          ...timer,
          // Jamais negatif : mettre en pause un chrono deja fini figerait un
          // reste negatif, que la reprise transformerait en echeance passee.
          pausedRemainingMs: Math.max(0, timer.endsAt - Date.now()),
        },
      });
      await persist();
    },

    async stopRest() {
      set({ restTimer: null });
      await persist();
    },
  };
});

/* -------------------------------------------------------------------------- */

function blankSet(weightKg: number | null, reps: number | null): WorkoutSet {
  return { id: newId(), type: 'normale', weightKg, reps, rpe: null, done: false };
}

function cloneEntry(entry: WorkoutEntry): WorkoutEntry {
  return { ...entry, sets: entry.sets.map((s) => ({ ...s })) };
}

/** Nom par defaut cale sur le moment de la journee, comme dans Strong. */
function defaultSessionName(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Séance du matin';
  if (hour < 18) return 'Séance de l’après-midi';
  return 'Séance du soir';
}

/** Nombre de series validees, utile pour les compteurs d'en-tete. */
export function doneSetCount(workout: Workout | null): number {
  if (!workout) return 0;
  return workout.entries.reduce((n, e) => n + entryWorkingSetCount(e), 0);
}
