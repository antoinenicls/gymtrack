import { describe, expect, it } from 'vitest';
import type { MuscleGroup, Routine, RoutineItem, RoutineSet } from '@/types/domain';
import { muscleNorms, sessionSetCounts } from './norms';
import { plannedReps, plannedSessions, plannedWeek } from './plannedWeek';

let counter = 0;
const nextId = () => `p-${++counter}`;

function set(partial: Partial<RoutineSet> = {}): RoutineSet {
  return { id: nextId(), type: 'normale', targetWeightKg: 60, targetReps: 8, targetRpe: null, ...partial };
}

function item(exerciseId: string, sets: RoutineSet[]): RoutineItem {
  return { id: nextId(), exerciseId, sets, restSec: 120, supersetGroup: null, notes: '', order: 0 };
}

function routine(id: string, items: RoutineItem[]): Routine {
  return { id, name: id, folderId: null, items, createdAt: 0, updatedAt: 0, lastPerformedAt: null };
}

const GROUPS: Record<string, MuscleGroup> = { pec: 'pectoraux', dos: 'dos' };
const groupOf = (id: string): MuscleGroup | undefined => GROUPS[id];

const push = routine('push', [item('pec', [set({ type: 'echauffement' }), set(), set(), set()])]);
const pull = routine('pull', [item('dos', [set(), set({ targetReps: 12 }), set({ targetReps: null })])]);

describe('plannedWeek', () => {
  it('compte les series de travail prevues, sans l echauffement', () => {
    const week = plannedWeek([push, pull], [{ routineId: 'push', times: 1 }, { routineId: 'pull', times: 1 }]);
    expect(sessionSetCounts(week)).toEqual([3, 3]);
  });

  it('garde une serie sans reps visees ni charge dans les comptes', () => {
    const bare = routine('bare', [item('dos', [set({ targetReps: null, targetWeightKg: null })])]);
    expect(sessionSetCounts(plannedWeek([bare], [{ routineId: 'bare', times: 1 }]))).toEqual([1]);
  });

  it('repete une routine faite plusieurs fois, chaque passage sur son propre jour', () => {
    const week = plannedWeek([push], [{ routineId: 'push', times: 2 }]);
    const [pec] = muscleNorms(week, groupOf, 1);
    expect(week).toHaveLength(2);
    expect(pec).toMatchObject({ setsPerWeek: 6, sessionsPerWeek: 2, setsPerSession: 3 });
  });

  it('ignore une routine supprimee depuis', () => {
    const picks = [{ routineId: 'disparue', times: 1 }, { routineId: 'push', times: 1 }];
    expect(plannedWeek([push], picks)).toHaveLength(1);
    expect(plannedSessions([push], picks)).toBe(1);
  });
});

describe('plannedReps', () => {
  it('repartit les reps visees et met de cote celles qui manquent', () => {
    const { spread, unknown } = plannedReps([pull], [{ routineId: 'pull', times: 2 }]);
    expect(spread).toEqual({ below: 0, inZone: 2, above: 2, total: 4 });
    expect(unknown).toBe(2);
  });
});
