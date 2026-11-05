/**
 * Agregations de l'ecran Analyse.
 *
 * Tout ce fichier est PUR : des seances en entree, des chiffres en sortie,
 * aucun acces a la base ni a React. C'est ce qui rend ces calculs testables
 * sans monter d'IndexedDB, et c'est important : un chiffre faux sur cet ecran
 * ne se voit pas : il ressemble a un chiffre juste.
 *
 * Deux regles heritees de `metrics.ts` valent partout ici :
 *  - les series d'echauffement ne comptent nulle part (ni volume, ni series,
 *    ni records) ;
 *  - les semaines commencent le LUNDI, comme dans `weekly.ts`.
 *
 * Les fenetres glissantes de 7 jours seraient plus simples a calculer, mais
 * elles ne correspondent a rien de ce que l'athlete vit : on planifie sa
 * semaine du lundi au dimanche, pas « depuis mardi dernier ».
 */

import type {
  Exercise,
  MuscleGroup,
  PersonalRecord,
  PrEntry,
  PrKind,
  Workout,
} from '@/types/domain';
import {
  entryBestE1rm,
  entryBestWeight,
  entryVolume,
  entryWorkingSetCount,
  workingSets,
  workoutVolume,
} from './metrics';
import { startOfWeek } from './weekly';

const DAY_MS = 24 * 60 * 60 * 1000;

const SHORT_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

/* -------------------------------------------------------------------------- */
/* Semaines                                                                    */
/* -------------------------------------------------------------------------- */

export interface WeekStat {
  /** Lundi 00h00 de la semaine. */
  start: number;
  /** Dimanche 23h59min59s. */
  end: number;
  label: string;
  isCurrent: boolean;
  sessions: number;
  volume: number;
  /** Series effectives, echauffement exclu. */
  sets: number;
  reps: number;
  /** Somme des durees figees. 0 si aucune seance n'a ete chronometree. */
  durationSec: number;
  /** RPE moyen pondere par serie. Null si jamais renseigne cette semaine-la. */
  avgRpe: number | null;
}

/**
 * Repartit les seances en semaines calendaires consecutives, de la plus
 * ancienne a la semaine EN COURS (toujours la derniere du tableau).
 */
export function weeklyStats(
  workouts: Workout[],
  weekCount: number,
  now: Date = new Date(),
): WeekStat[] {
  const currentStart = startOfWeek(now);

  return Array.from({ length: weekCount }, (_, index) => {
    const start = new Date(currentStart);
    start.setDate(start.getDate() - (weekCount - 1 - index) * 7);
    const startMs = start.getTime();

    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const endMs = end.getTime();

    const inWeek = workouts.filter((w) => w.startedAt >= startMs && w.startedAt < endMs);

    const rpes: number[] = [];
    let sets = 0;
    let reps = 0;
    for (const workout of inWeek) {
      for (const entry of workout.entries) {
        for (const set of workingSets(entry)) {
          sets++;
          reps += set.reps ?? 0;
          if (set.rpe !== null) rpes.push(set.rpe);
        }
      }
    }

    return {
      start: startMs,
      end: endMs - 1,
      label: SHORT_DATE.format(start),
      isCurrent: index === weekCount - 1,
      sessions: inWeek.length,
      volume: round(inWeek.reduce((sum, w) => sum + workoutVolume(w), 0)),
      sets,
      reps,
      durationSec: inWeek.reduce((sum, w) => sum + (w.durationSec ?? 0), 0),
      avgRpe: rpes.length > 0 ? round(rpes.reduce((a, b) => a + b, 0) / rpes.length, 1) : null,
    };
  });
}

/**
 * Evolution en pourcentage entre la premiere et la seconde moitie d'une serie.
 *
 * Comparer la derniere valeur a la premiere serait beaucoup plus volatil : une
 * seule semaine ratee (maladie, deload, vacances) suffirait a afficher -40 %.
 * En moyennant chaque moitie, une semaine isolee pese ce qu'elle doit peser.
 *
 * Null quand la comparaison n'aurait pas de sens : moins de 4 valeurs, ou une
 * premiere moitie nulle (on ne divise pas par zero, et « +infini % » n'apprend
 * rien a personne).
 */
export function trendPercent(values: number[]): number | null {
  if (values.length < 4) return null;

  const half = Math.floor(values.length / 2);
  const older = values.slice(0, half);
  const recent = values.slice(values.length - half);

  const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;

  if (avgOlder <= 0) return null;
  return round(((avgRecent - avgOlder) / avgOlder) * 100);
}

/* -------------------------------------------------------------------------- */
/* Progression par exercice                                                    */
/* -------------------------------------------------------------------------- */

/** Metriques disponibles sur la courbe d'un exercice. */
export type ExerciseMetric = 'e1rm' | 'charge' | 'volume' | 'reps';

export const EXERCISE_METRIC_LABELS: Record<ExerciseMetric, string> = {
  e1rm: '1RM estimé',
  charge: 'Charge max',
  volume: 'Volume',
  reps: 'Répétitions',
};

export interface ExerciseSessionStat {
  at: number;
  workoutId: string;
  /** Meilleur E1RM de la seance. Compare honnetement 100x3 et 90x8. */
  e1rm: number;
  /** Charge la plus lourde manipulee. */
  charge: number;
  volume: number;
  sets: number;
  reps: number;
}

/**
 * Une valeur par SEANCE ou l'exercice a ete travaille, de la plus ancienne a
 * la plus recente. Les seances sans serie effective sont ecartees : un point a
 * zero creuserait un trou dans la courbe alors qu'il ne s'est rien passe.
 */
export function exerciseSeries(workouts: Workout[], exerciseId: string): ExerciseSessionStat[] {
  const stats: ExerciseSessionStat[] = [];

  for (const workout of workouts) {
    for (const entry of workout.entries) {
      if (entry.exerciseId !== exerciseId) continue;
      const sets = workingSets(entry);
      if (sets.length === 0) continue;

      stats.push({
        at: workout.startedAt,
        workoutId: workout.id,
        e1rm: entryBestE1rm(entry),
        charge: entryBestWeight(entry),
        volume: entryVolume(entry),
        sets: entryWorkingSetCount(entry),
        reps: sets.reduce((n, s) => n + (s.reps ?? 0), 0),
      });
    }
  }

  return stats.sort((a, b) => a.at - b.at);
}

export function metricValue(stat: ExerciseSessionStat, metric: ExerciseMetric): number {
  return stat[metric];
}

export interface TrainedExercise {
  id: string;
  /** Seances ou l'exercice porte au moins une serie effective. */
  sessions: number;
  lastAt: number;
}

/**
 * Exercices REELLEMENT travailles, du plus frequent au moins frequent.
 *
 * Le nombre de seances et la date sont rendus avec l'identifiant : ce sont eux
 * qui permettent au selecteur d'annoncer « 12 seances » avant qu'on choisisse.
 * Un exercice qui n'a qu'une seance ne tracera aucune courbe, autant que cela
 * se voie avant le tap plutot qu'apres.
 */
export function trainedExercises(workouts: Workout[]): TrainedExercise[] {
  const counts = new Map<string, { sessions: number; lastAt: number }>();

  for (const workout of workouts) {
    for (const entry of workout.entries) {
      if (workingSets(entry).length === 0) continue;
      const current = counts.get(entry.exerciseId) ?? { sessions: 0, lastAt: 0 };
      counts.set(entry.exerciseId, {
        sessions: current.sessions + 1,
        lastAt: Math.max(current.lastAt, workout.startedAt),
      });
    }
  }

  return [...counts.entries()]
    .map(([id, stat]) => ({ id, ...stat }))
    .sort((a, b) => b.sessions - a.sessions || b.lastAt - a.lastAt);
}

/* -------------------------------------------------------------------------- */
/* Charge par groupe musculaire                                                */
/* -------------------------------------------------------------------------- */

export interface MuscleLoad {
  group: MuscleGroup;
  /** Series effectives sur toute la fenetre. */
  sets: number;
  /** Series par semaine, le chiffre qui se compare aux reperes usuels. */
  setsPerWeek: number;
  volume: number;
}

/**
 * Series hebdomadaires par groupe musculaire.
 *
 * On compte les SERIES et pas seulement le tonnage : entre un squat et une
 * elevation laterale, le tonnage n'est pas comparable, alors que le nombre de
 * series effectives l'est raisonnablement. C'est aussi l'unite dans laquelle
 * les reperes d'entrainement sont exprimes.
 *
 * Comme ailleurs dans l'app, un exercice verse la totalite de sa charge a son
 * groupe principal : repartir en fractions demanderait des coefficients
 * arbitraires que personne ne saurait justifier.
 */
export function muscleLoad(
  workouts: Workout[],
  groupOf: (exerciseId: string) => MuscleGroup | undefined,
  weekCount: number,
): MuscleLoad[] {
  const totals = new Map<MuscleGroup, { sets: number; volume: number }>();

  for (const workout of workouts) {
    for (const entry of workout.entries) {
      const group = groupOf(entry.exerciseId);
      if (!group) continue;
      // Une degressive est UN effort, quel que soit son nombre de paliers.
      const sets = entryWorkingSetCount(entry);
      if (sets === 0) continue;

      const current = totals.get(group) ?? { sets: 0, volume: 0 };
      totals.set(group, {
        sets: current.sets + sets,
        volume: round(current.volume + entryVolume(entry)),
      });
    }
  }

  const weeks = Math.max(1, weekCount);
  return [...totals.entries()]
    .map(([group, { sets, volume }]) => ({
      group,
      sets,
      setsPerWeek: round(sets / weeks, 1),
      volume,
    }))
    .sort((a, b) => b.setsPerWeek - a.setsPerWeek);
}

/* -------------------------------------------------------------------------- */
/* Regularite                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Grille jour par jour des N dernieres semaines, du lundi au dimanche.
 *
 * Chaque case porte le nombre de seances du jour : deux seances le meme jour
 * existent (matin et soir), et les ecraser a « oui / non » perdrait
 * l'information.
 */
export function trainingGrid(
  workouts: Workout[],
  weekCount: number,
  now: Date = new Date(),
): Array<{ start: number; days: Array<{ at: number; count: number; isFuture: boolean }> }> {
  const currentStart = startOfWeek(now);
  const today = new Date(now);
  today.setHours(23, 59, 59, 999);

  return Array.from({ length: weekCount }, (_, index) => {
    const start = new Date(currentStart);
    start.setDate(start.getDate() - (weekCount - 1 - index) * 7);

    return {
      start: start.getTime(),
      days: Array.from({ length: 7 }, (_, dayIndex) => {
        const day = new Date(start);
        day.setDate(day.getDate() + dayIndex);
        const from = day.getTime();
        const to = from + DAY_MS;

        return {
          at: from,
          count: workouts.filter((w) => w.startedAt >= from && w.startedAt < to).length,
          isFuture: from > today.getTime(),
        };
      }),
    };
  });
}

/**
 * Nombre de jours consecutifs, en remontant, avec au moins une seance.
 *
 * Le jour EN COURS ne casse jamais la serie : annoncer « serie rompue » un
 * mardi a 9 h, avant meme la seance du soir, serait faux et decourageant.
 */
export function dailyStreak(workouts: Workout[], now: Date = new Date()): number {
  const trained = new Set(
    workouts.map((w) => {
      const date = new Date(w.startedAt);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    }),
  );

  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  let streak = 0;
  // Le jour courant est examine sans jamais interrompre : s'il est vide on
  // repart simplement sur la veille.
  if (!trained.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);

  while (trained.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* -------------------------------------------------------------------------- */
/* Exercices en sommeil                                                        */
/* -------------------------------------------------------------------------- */

export interface DormantExercise {
  exercise: Exercise;
  lastAt: number;
  days: number;
}

/**
 * Exercices deja pratiques mais laisses de cote depuis un moment.
 *
 * Volontairement limite aux exercices DEJA travailles : la bibliotheque
 * compte des dizaines de mouvements jamais faits, et les lister tous ne serait
 * pas un signal mais un reproche permanent. Ici, chaque ligne correspond a
 * quelque chose que l'athlete avait choisi de mettre a son programme.
 */
export function dormantExercises(
  workouts: Workout[],
  exercises: Map<string, Exercise>,
  sinceDays: number,
  now: number = Date.now(),
): DormantExercise[] {
  const lastSeen = new Map<string, number>();

  for (const workout of workouts) {
    for (const entry of workout.entries) {
      if (workingSets(entry).length === 0) continue;
      const previous = lastSeen.get(entry.exerciseId) ?? 0;
      if (workout.startedAt > previous) lastSeen.set(entry.exerciseId, workout.startedAt);
    }
  }

  const threshold = sinceDays * DAY_MS;
  const rows: DormantExercise[] = [];

  for (const [exerciseId, lastAt] of lastSeen) {
    const elapsed = now - lastAt;
    if (elapsed < threshold) continue;
    const exercise = exercises.get(exerciseId);
    if (!exercise) continue;
    rows.push({ exercise, lastAt, days: Math.floor(elapsed / DAY_MS) });
  }

  return rows.sort((a, b) => b.days - a.days);
}

/* -------------------------------------------------------------------------- */
/* Records                                                                     */
/* -------------------------------------------------------------------------- */

export interface RecordRow {
  exercise: Exercise;
  kind: PrKind;
  value: number;
  weightKg: number;
  reps: number;
  achievedAt: number;
}

/** Records personnels les plus recents, tous exercices confondus. */
export function recentRecords(
  records: PersonalRecord[],
  exercises: Map<string, Exercise>,
  limit: number,
): RecordRow[] {
  const rows: RecordRow[] = [];

  for (const record of records) {
    const exercise = exercises.get(record.exerciseId);
    if (!exercise) continue;

    const entries: Array<[PrKind, PrEntry | null]> = [
      ['e1rm', record.bestE1rm],
      ['charge', record.bestWeight],
      ['volume', record.bestSessionVolume],
    ];

    for (const [kind, entry] of entries) {
      if (!entry) continue;
      rows.push({
        exercise,
        kind,
        value: entry.value,
        weightKg: entry.weightKg,
        reps: entry.reps,
        achievedAt: entry.achievedAt,
      });
    }
  }

  return rows.sort((a, b) => b.achievedAt - a.achievedAt).slice(0, limit);
}

/* -------------------------------------------------------------------------- */

/**
 * Densite : tonnage souleve par minute de seance.
 *
 * Ne se calcule que sur les seances REELLEMENT chronometrees. Une seance sans
 * duree figee (import, saisie a posteriori) est ecartee plutot que comptee a
 * zero, ce qui ecraserait la moyenne sans que rien ne le signale.
 */
export function averageDensity(workouts: Workout[]): number | null {
  const timed = workouts.filter((w) => (w.durationSec ?? 0) > 0);
  if (timed.length === 0) return null;

  const volume = timed.reduce((sum, w) => sum + workoutVolume(w), 0);
  const minutes = timed.reduce((sum, w) => sum + (w.durationSec ?? 0), 0) / 60;
  if (minutes <= 0) return null;

  return round(volume / minutes);
}

/** Duree moyenne en secondes, sur les seules seances chronometrees. */
export function averageDuration(workouts: Workout[]): number | null {
  const timed = workouts.filter((w) => (w.durationSec ?? 0) > 0);
  if (timed.length === 0) return null;
  return Math.round(timed.reduce((sum, w) => sum + (w.durationSec ?? 0), 0) / timed.length);
}

function round(n: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
