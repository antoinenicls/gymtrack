/** Fabriques d'objets de domaine pour les tests. */

import type { SetType, Workout, WorkoutEntry, WorkoutSet } from '@/types/domain';

let counter = 0;
const nextId = () => `id-${++counter}`;

export function makeSet(partial: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: nextId(),
    type: 'normale' as SetType,
    weightKg: 100,
    reps: 8,
    rpe: 8,
    done: true,
    ...partial,
  };
}

export function makeEntry(partial: Partial<WorkoutEntry> = {}): WorkoutEntry {
  return {
    id: nextId(),
    exerciseId: 'ex-1',
    sets: [makeSet()],
    notes: '',
    restSec: 120,
    supersetGroup: null,
    order: 0,
    ...partial,
  };
}

export function makeWorkout(partial: Partial<Workout> = {}): Workout {
  return {
    id: nextId(),
    name: 'Push A',
    routineId: null,
    startedAt: Date.parse('2026-07-19T10:00:00Z'),
    endedAt: Date.parse('2026-07-19T11:00:00Z'),
    entries: [makeEntry()],
    notes: '',
    durationSec: 3600,
    ...partial,
  };
}
