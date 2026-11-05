/**
 * Detection des records personnels.
 *
 * Deux records distincts, parce qu'ils ne racontent pas la meme chose :
 *  - la CHARGE max, c'est le chiffre dont on parle en salle ;
 *  - le E1RM max, c'est le vrai indicateur de force, parce qu'il compare
 *    honnetement 100 kg x 3 et 90 kg x 8.
 *
 * Une serie d'echauffement ne peut jamais declencher de record : elle est
 * exclue en amont par workingSets().
 */

import type {
  PersonalRecord,
  PrEntry,
  PrKind,
  Workout,
  WorkoutEntry,
  WorkoutSet,
} from '@/types/domain';
import { e1rmValue } from './e1rm';
import { entryVolume, workingSets } from './metrics';

export function emptyRecord(exerciseId: string): PersonalRecord {
  return { exerciseId, bestE1rm: null, bestWeight: null, bestSessionVolume: null };
}

export interface PrCheck {
  kinds: PrKind[];
  /** Le record mis a jour, a persister si kinds n'est pas vide. */
  next: PersonalRecord;
}

/**
 * Compare une serie validee au record existant.
 *
 * Strictement superieur : egaler son record n'est pas le battre. Afficher un
 * badge PR a chaque fois qu'on refait la meme charge le viderait de son sens.
 */
export function checkSetForPr(
  set: WorkoutSet,
  current: PersonalRecord,
  workoutId: string,
  achievedAt: number,
): PrCheck {
  const weightKg = set.weightKg ?? 0;
  const reps = set.reps ?? 0;

  if (set.type === 'echauffement' || weightKg <= 0 || reps <= 0) {
    return { kinds: [], next: current };
  }

  const kinds: PrKind[] = [];
  const next: PersonalRecord = { ...current };
  const e1rm = e1rmValue(weightKg, reps);

  if (e1rm > 0 && (current.bestE1rm === null || e1rm > current.bestE1rm.value)) {
    kinds.push('e1rm');
    next.bestE1rm = entry(e1rm, weightKg, reps, achievedAt, workoutId);
  }

  if (current.bestWeight === null || weightKg > current.bestWeight.weightKg) {
    kinds.push('charge');
    next.bestWeight = entry(weightKg, weightKg, reps, achievedAt, workoutId);
  }

  return { kinds, next };
}

export interface EntryReplay {
  /** Records battus, par identifiant de serie. Absent = aucun badge. */
  kindsBySetId: Map<string, PrKind[]>;
  /** Record de l'exercice une fois toutes ces series prises en compte. */
  next: PersonalRecord;
}

/**
 * Rejoue les series validees d'un exercice par-dessus un record de depart.
 *
 * Un badge PR ne peut pas se decider une fois pour toutes au moment ou la case
 * est cochee : il depend de ce qui est ECRIT dans la ligne, et l'athlete
 * corrige tres souvent ses reps juste apres avoir coche. On repart donc du
 * record d'AVANT la seance et on rejoue, exactement comme `rebuildRecords`
 * rejoue l'historique complet.
 *
 * Rejouer et non corriger au coup par coup : les series se conditionnent entre
 * elles. Retomber de 105 a 95 kg sur la deuxieme serie ne rend pas seulement
 * son badge caduc, cela peut rendre son record a la premiere.
 *
 * `fallbackAt` date les series sans horodatage de validation, celles des
 * seances anterieures a ce champ.
 */
export function replayEntryPrs(
  entry: WorkoutEntry,
  baseline: PersonalRecord,
  workoutId: string,
  fallbackAt: number,
): EntryReplay {
  const kindsBySetId = new Map<string, PrKind[]>();
  let current = baseline;

  for (const set of workingSets(entry)) {
    const check = checkSetForPr(set, current, workoutId, set.completedAt ?? fallbackAt);
    if (check.kinds.length > 0) kindsBySetId.set(set.id, check.kinds);
    current = check.next;
  }

  return { kindsBySetId, next: current };
}

/** Un record sans aucune ligne chiffree n'a pas lieu d'etre conserve. */
export function isEmptyRecord(record: PersonalRecord): boolean {
  return (
    record.bestE1rm === null && record.bestWeight === null && record.bestSessionVolume === null
  );
}

/** Record de volume sur une seance, evalue en fin d'exercice et non par serie. */
export function checkSessionVolumeForPr(
  volumeKg: number,
  current: PersonalRecord,
  workoutId: string,
  achievedAt: number,
): PrCheck {
  if (volumeKg <= 0) return { kinds: [], next: current };
  if (current.bestSessionVolume !== null && volumeKg <= current.bestSessionVolume.value) {
    return { kinds: [], next: current };
  }
  return {
    kinds: ['volume'],
    next: { ...current, bestSessionVolume: entry(volumeKg, 0, 0, achievedAt, workoutId) },
  };
}

/**
 * Recalcule TOUS les records en rejouant l'historique dans l'ordre.
 *
 * Un record ne se contente pas de monter. Supprimer la seance qui le portait
 * doit le faire redescendre a la meilleure performance qui reste, et supprimer
 * la derniere doit le faire disparaitre.
 *
 * Sans ce recalcul, le magasin des records gardait des chiffres qui ne
 * renvoyaient plus a rien : « charge max 140 kg », etablie lors d'une seance
 * absente de l'historique. Impossible a verifier, impossible a expliquer, et
 * impossible a corriger autrement qu'en effacant toutes ses donnees.
 *
 * REJOUER plutot que retrancher : un record se decide sur tout ce qui le
 * precede, et rien dans `PersonalRecord` ne dit quelle performance venait
 * juste derriere. Seul un parcours chronologique complet peut donc trouver le
 * remplacant, et il donne au passage la bonne date, celle du jour ou la
 * performance a reellement eu lieu.
 */
export function rebuildRecords(workouts: Workout[]): PersonalRecord[] {
  const records = new Map<string, PersonalRecord>();
  const chronological = [...workouts].sort((a, b) => a.startedAt - b.startedAt);

  for (const workout of chronological) {
    for (const entry of workout.entries) {
      const base = records.get(entry.exerciseId) ?? emptyRecord(entry.exerciseId);
      let current = replayEntryPrs(entry, base, workout.id, workout.startedAt).next;

      current = checkSessionVolumeForPr(
        entryVolume(entry),
        current,
        workout.id,
        workout.startedAt,
      ).next;

      records.set(entry.exerciseId, current);
    }
  }

  // Un exercice dont il ne reste aucune serie chiffree n'a plus de record du
  // tout : on ne renvoie pas une coquille vide qui reafficherait une ligne.
  return [...records.values()].filter((r) => !isEmptyRecord(r));
}

/** Premier instant du mois civil (heure locale) qui contient `at`. */
export function monthStart(at: number): number {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

/**
 * Records du mois civil en cours, sur les seances terminees AVANT `at`.
 *
 * Le pendant mensuel de `rebuildRecords`, pour le badge « PR du mois ». Apres
 * une stagnation, on redescend en charge et le record absolu devient hors de
 * portee pour des semaines : battre sa meilleure prestation du mois est alors
 * le seul signal de progres qui reste, et il compte pour le mental.
 *
 * Un exercice ABSENT de ce resultat n'a pas encore ete fait ce mois-ci. Il ne
 * doit alors recevoir aucun badge mensuel : sans reference, la premiere seance
 * du mois battrait « son record » a chaque serie et le badge ne voudrait plus
 * rien dire.
 */
export function monthRecords(workouts: Workout[], at: number): PersonalRecord[] {
  const from = monthStart(at);
  return rebuildRecords(workouts.filter((w) => w.startedAt >= from && w.startedAt < at));
}

/**
 * Badges « PR du mois » d'un exercice, par identifiant de serie.
 *
 * Un record absolu est forcement aussi un record du mois : on ne garde ici que
 * les series qui battent le mois SANS battre l'absolu, pour qu'une serie ne
 * porte jamais deux badges et que le dore reste reserve au vrai record.
 */
export function replayMonthPrs(
  entry: WorkoutEntry,
  monthBaseline: PersonalRecord | undefined,
  allTime: Map<string, PrKind[]>,
  workoutId: string,
  fallbackAt: number,
): Map<string, PrKind[]> {
  const result = new Map<string, PrKind[]>();
  if (!monthBaseline) return result;
  const replay = replayEntryPrs(entry, monthBaseline, workoutId, fallbackAt);
  for (const [setId, kinds] of replay.kindsBySetId) {
    if (!allTime.has(setId)) result.set(setId, kinds);
  }
  return result;
}

export function prLabel(kind: PrKind): string {
  switch (kind) {
    case 'e1rm':
      return 'Record de force';
    case 'charge':
      return 'Charge max';
    case 'volume':
      return 'Record de volume';
  }
}

function entry(
  value: number,
  weightKg: number,
  reps: number,
  achievedAt: number,
  workoutId: string,
): PrEntry {
  return { value, weightKg, reps, achievedAt, workoutId };
}
