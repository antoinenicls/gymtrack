/**
 * Exports GymTrack.
 *
 * L'app est 100 % locale : ces exports sont le moyen de sortir ses donnees
 * (tableur, partage, archive).
 */

import type { Exercise, Workout } from '@/types/domain';
import {
  entryBestWeight,
  entryVolume,
  formatWeight,
  workingSets,
  entryWorkingSetCount,
} from './metrics';
import { e1rmValue } from './e1rm';

/**
 * Export CSV de l'historique complet, une ligne par serie.
 *
 * Separateur point-virgule et BOM UTF-8 : sans les deux, Excel en config
 * francaise ouvre le fichier en une seule colonne et casse les accents.
 */
export function buildHistoryCsv(workouts: Workout[], exercises: Map<string, Exercise>): string {
  const headers = [
    'date',
    'seance',
    'duree_min',
    'exercice',
    'groupe_musculaire',
    'superset',
    'serie',
    'type',
    'poids_kg',
    'reps',
    'rpe',
    'volume_kg',
    'e1rm_kg',
    'record',
    'notes_exercice',
  ];

  const rows: string[][] = [headers];
  const sorted = [...workouts].sort((a, b) => a.startedAt - b.startedAt);

  for (const workout of sorted) {
    const date = new Date(workout.startedAt).toISOString().slice(0, 10);
    const duration = workout.durationSec !== null ? Math.round(workout.durationSec / 60) : '';

    for (const entry of workout.entries) {
      const exercise = exercises.get(entry.exerciseId);
      entry.sets.forEach((set, index) => {
        const weight = set.weightKg ?? 0;
        const reps = set.reps ?? 0;
        rows.push([
          date,
          workout.name,
          String(duration),
          exercise?.name ?? 'Exercice supprimé',
          exercise?.muscleGroup ?? '',
          entry.supersetGroup ? 'oui' : 'non',
          String(index + 1),
          set.type,
          decimal(weight),
          String(reps),
          set.rpe !== null ? decimal(set.rpe) : '',
          set.type === 'echauffement' ? '0' : decimal(weight * reps),
          set.done && set.type !== 'echauffement' ? decimal(e1rmValue(weight, reps)) : '',
          set.prKinds && set.prKinds.length > 0 ? set.prKinds.join('+') : '',
          entry.notes,
        ]);
      });
    }
  }

  const body = rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
  return `﻿${body}`;
}

/** Resume par exercice, pour l'ecran de fin de seance. */
export interface WorkoutSummaryLine {
  exerciseName: string;
  sets: number;
  volumeKg: number;
  topSet: string;
  bestE1rm: number;
  hasPr: boolean;
  /** Record du mois battu sans record absolu sur l'exercice. */
  hasMonthPr: boolean;
}

export function summarizeWorkout(
  workout: Workout,
  exercises: Map<string, Exercise>,
): WorkoutSummaryLine[] {
  const lines: WorkoutSummaryLine[] = [];

  for (const entry of workout.entries) {
    const sets = workingSets(entry);
    if (sets.length === 0) continue;

    const heaviest = entryBestWeight(entry);
    const topSet = sets.find((s) => (s.weightKg ?? 0) === heaviest);

    lines.push({
      exerciseName: exercises.get(entry.exerciseId)?.name ?? 'Exercice supprimé',
      // Groupes et non lignes : le recapitulatif annoncait quatre series la ou
      // l'entete de la seance, juste au-dessus, en comptait deux.
      sets: entryWorkingSetCount(entry),
      volumeKg: entryVolume(entry),
      topSet: topSet ? `${formatWeight(topSet.weightKg ?? 0)} kg x ${topSet.reps}` : '',
      bestE1rm: sets.reduce((b, s) => Math.max(b, e1rmValue(s.weightKg ?? 0, s.reps ?? 0)), 0),
      hasPr: sets.some((s) => (s.prKinds?.length ?? 0) > 0),
      hasMonthPr: sets.some((s) => (s.monthPrKinds?.length ?? 0) > 0),
    });
  }

  return lines;
}

function decimal(n: number): string {
  // Virgule decimale : Excel francais n'interprete pas le point comme separateur.
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

function csvCell(value: string): string {
  const needsQuotes = /[";\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}
