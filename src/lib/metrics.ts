/**
 * Metriques de seance : volume, series effectives, intensite, RPE moyen.
 *
 * Regle transverse : les series d'echauffement ne comptent nulle part. Elles
 * ne sont ni du volume de travail, ni candidates a un record. Les compter
 * gonflerait le tonnage sans qu'aucun stimulus supplementaire n'ait eu lieu,
 * et donnerait une courbe de progression fausse.
 */

import type { Workout, WorkoutEntry, WorkoutSet } from '@/types/domain';
import { e1rmValue } from './e1rm';
import { setGroups } from './dropset';

export function isWorkingSet(set: WorkoutSet): boolean {
  return set.done && set.type !== 'echauffement';
}

/** Series validees qui comptent, poids et reps renseignes. */
export function workingSets(entry: WorkoutEntry): WorkoutSet[] {
  return entry.sets.filter(
    (s) => isWorkingSet(s) && s.weightKg !== null && s.reps !== null && s.reps > 0,
  );
}

/**
 * Series REELLEMENT REALISEES, echauffement compris.
 *
 * Distinct de `workingSets`, et la distinction est le sujet : un echauffement
 * ne se chiffre pas. On monte en charge jusqu'a se sentir chaud, sans compter
 * ses repetitions, et « 0 » y veut dire « fait, sans compter » et non « rien
 * fait ». Exiger un nombre de reps revenait a effacer ces series a chaque fin
 * de seance, alors qu'elles avaient bien eu lieu.
 *
 * Sur une serie de travail en revanche, 0 rep ne veut rien dire : elle reste
 * ecartee. C'est la seule difference entre les deux listes.
 *
 * A n'utiliser que pour dire CE QUI A ETE FAIT : conserver la seance, reporter
 * sur la routine. Le volume, les records et les compteurs de series continuent
 * de passer par `workingSets`, un echauffement n'etant du travail nulle part.
 */
export function performedSets(entry: WorkoutEntry): WorkoutSet[] {
  return entry.sets.filter((s) =>
    s.done && (s.type === 'echauffement' || (s.reps !== null && s.reps > 0)),
  );
}

/**
 * Nombre de SERIES effectuees, une degressive comptant pour une.
 *
 * Distinct de `workingSets().length`, et la distinction est le sujet : les
 * paliers d'une degressive sont autant de lignes reellement soulevees, donc
 * ils comptent tous dans le tonnage et dans les repetitions, mais ils ne font
 * qu'UN effort. Les additionner gonflait le total de la seance et faussait
 * toute moyenne « series par seance ».
 */
export function entryWorkingSetCount(entry: WorkoutEntry): number {
  /**
   * On groupe sur TOUTES les series, puis on ne garde que les groupes qui
   * contiennent du travail retenu.
   *
   * Grouper directement sur les series retenues rapprocherait des lignes que
   * quelque chose separait : deux degressives de part et d'autre d'une serie
   * non validee se retrouvaient collees en un seul effort. A l'inverse, un
   * palier laisse vide au milieu d'une degressive ne doit pas la couper en
   * deux, et c'est bien ce que fait ce decoupage.
   */
  const retenues = new Set(workingSets(entry));
  return setGroups(entry.sets).filter((group) => group.some((set) => retenues.has(set))).length;
}

/** Tonnage : somme des poids x reps sur les series effectives. */
export function entryVolume(entry: WorkoutEntry): number {
  return round(
    workingSets(entry).reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0),
  );
}

export function workoutVolume(workout: Workout): number {
  return round(workout.entries.reduce((sum, e) => sum + entryVolume(e), 0));
}

export function workoutWorkingSetCount(workout: Workout): number {
  return workout.entries.reduce((sum, e) => sum + entryWorkingSetCount(e), 0);
}

export function workoutRepCount(workout: Workout): number {
  return workout.entries.reduce(
    (sum, e) => sum + workingSets(e).reduce((n, s) => n + (s.reps ?? 0), 0),
    0,
  );
}

/** RPE moyen pondere par le nombre de series. Null si jamais renseigne. */
export function workoutAverageRpe(workout: Workout): number | null {
  const values: number[] = [];
  for (const entry of workout.entries) {
    for (const set of workingSets(entry)) {
      if (set.rpe !== null) values.push(set.rpe);
    }
  }
  if (values.length === 0) return null;
  return round(values.reduce((a, b) => a + b, 0) / values.length, 1);
}

/** Meilleur E1RM atteint sur un exercice au cours de cette seance. */
export function entryBestE1rm(entry: WorkoutEntry): number {
  return workingSets(entry).reduce(
    (best, s) => Math.max(best, e1rmValue(s.weightKg ?? 0, s.reps ?? 0)),
    0,
  );
}

/** Charge maximale soulevee sur un exercice au cours de cette seance. */
export function entryBestWeight(entry: WorkoutEntry): number {
  return workingSets(entry).reduce((best, s) => Math.max(best, s.weightKg ?? 0), 0);
}

/**
 * Volume ventile par groupe musculaire. Un exercice attribue 100 % de son
 * tonnage a son groupe principal : repartir en fractions (« le developpe
 * couche, c'est 60 % pecs, 30 % triceps ») demanderait une table de
 * coefficients arbitraire dont personne ne saurait justifier les chiffres.
 */
export function volumeByMuscleGroup(
  workouts: Workout[],
  exerciseGroup: (exerciseId: string) => string | undefined,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const workout of workouts) {
    for (const entry of workout.entries) {
      const group = exerciseGroup(entry.exerciseId);
      if (!group) continue;
      totals.set(group, round((totals.get(group) ?? 0) + entryVolume(entry)));
    }
  }
  return totals;
}

/**
 * Duree ANNONCEE a l'avance, decoupee pour un affichage `Stat`.
 *
 * Au-dela de l'heure on bascule en heures : « 78 min » oblige a poser une
 * division mentale pour repondre a la seule question qu'on se pose devant une
 * seance, « est-ce que j'ai le temps ». « 1h18 » y repond tout seul.
 *
 * Le decoupage valeur / unite suit `Stat`, qui affiche l'unite en petit a cote
 * du chiffre. Passe l'heure, l'unite est DANS la valeur : separer le « h » du
 * « 1 » le detacherait des minutes qui le suivent, et « 1 h 18 » se lirait
 * comme deux nombres sans rapport.
 */
export function formatApproxDuration(seconds: number): { value: string; unit?: string } {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return { value: `~${minutes}`, unit: 'min' };

  const h = Math.floor(minutes / 60);
  const rest = minutes % 60;
  // Minutes sur deux chiffres, comme `formatDuration` : « 1h05 », jamais
  // « 1h5 », qui se lit une fraction de seconde de trop.
  return { value: rest === 0 ? `~${h}h` : `~${h}h${String(rest).padStart(2, '0')}` };
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * Chrono d'une seance EN COURS. Les secondes ne disparaissent jamais.
 *
 * Distinct de `formatDuration`, qui abrege en « 1h05 » : sur une duree figee,
 * la seconde n'apporte rien. Sur un chrono qui tourne sous les yeux, elle est
 * le seul signe que le compteur vit : un affichage qui reste sur « 1h05 »
 * pendant soixante secondes donne l'impression d'un timer bloque.
 *
 * Progression : 0:07, puis 0:45, 3:20, 42:15, et 1:05:30 au-dela de l'heure.
 */
export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');

  // Les minutes se paddent SEULEMENT en presence d'heures : « 1:5:30 » ne se
  // lit pas, alors que « 3:20 » se lit mieux que « 03:20 ».
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Tonnage lisible : 7200 kg devient « 7,2 t » au-dela de la tonne. */
export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace('.', ',')} t`;
  return `${Math.round(kg)} kg`;
}

export function formatWeight(kg: number): string {
  const rounded = Math.round(kg * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace('.', ',');
}

function round(n: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
