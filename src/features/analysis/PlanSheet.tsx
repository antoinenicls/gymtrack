/**
 * Composition de la semaine type analysee en mode programme.
 *
 * Les routines sont presentees dans leurs dossiers, parce qu'un dossier est
 * le plus souvent un programme : « Choisir ce dossier » compose la semaine
 * d'un geste, et cocher ou decocher une seance l'ajuste ensuite. Une seance
 * faite deux fois par semaine se compte deux fois, sinon la frequence par
 * muscle et le volume hebdomadaire seraient sous-estimes de moitie.
 */

import { Check, Minus, Plus } from 'lucide-react';
import type { PlanPick, Routine, RoutineFolder } from '@/types/domain';
import { routineSetCount } from '@/lib/plannedWeek';
import { Button, Sheet, cx } from '@/ui/primitives';

/** Au-dela, ce n'est plus une semaine. */
const MAX_TIMES = 7;

export default function PlanSheet({
  open,
  onClose,
  routines,
  folders,
  picks,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  routines: Routine[];
  folders: RoutineFolder[];
  picks: PlanPick[];
  /** Recoit la selection a jour : voir `patchSettings` pour la raison. */
  onChange: (update: (prev: PlanPick[]) => PlanPick[]) => void;
}) {
  const timesOf = (routineId: string): number =>
    picks.find((pick) => pick.routineId === routineId)?.times ?? 0;

  const setTimes = (routineId: string, times: number): void => {
    onChange((prev) => {
      const rest = prev.filter((pick) => pick.routineId !== routineId);
      if (times <= 0) return rest;
      // Une seance deja retenue garde sa place, une nouvelle passe a la suite.
      const index = prev.findIndex((pick) => pick.routineId === routineId);
      const next = { routineId, times: Math.min(MAX_TIMES, times) };
      if (index < 0) return [...rest, next];
      return [...rest.slice(0, index), next, ...rest.slice(index)];
    });
  };

  const takeFolder = (inside: Routine[]): void => {
    onChange(() => inside.map((routine) => ({ routineId: routine.id, times: 1 })));
  };

  const groups = [
    ...folders.map((folder) => ({
      key: folder.id,
      name: folder.name,
      isFolder: true,
      routines: routines.filter((routine) => routine.folderId === folder.id),
    })),
    {
      key: 'hors-dossier',
      name: folders.length > 0 ? 'Hors dossier' : 'Mes séances',
      isFolder: false,
      routines: routines.filter(
        (routine) => routine.folderId === null || !folders.some((f) => f.id === routine.folderId),
      ),
    },
  ].filter((group) => group.routines.length > 0);

  const total = picks
    .filter((pick) => routines.some((routine) => routine.id === pick.routineId))
    .reduce((sum, pick) => sum + pick.times, 0);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ma semaine type"
      footer={
        <Button full onClick={onClose}>
          {total === 0
            ? 'Fermer'
            : `Analyser ${total} séance${total > 1 ? 's' : ''} par semaine`}
        </Button>
      }
    >
      {groups.length === 0 ? (
        <p className="pb-4 text-[14px] leading-relaxed text-ink-2">
          Aucune séance enregistrée. Crée d’abord les séances de ton programme dans l’onglet
          Séances, puis reviens les analyser ici.
        </p>
      ) : (
        <div className="space-y-5 pb-2">
          <p className="text-[13px] leading-relaxed text-ink-2">
            Coche les séances que tu fais dans une semaine. Une séance faite deux fois se compte
            deux fois.
          </p>

          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-2 flex min-h-[36px] items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-display text-[15px] font-extrabold tracking-[-0.02em]">
                  {group.name}
                </p>
                {group.isFolder && (
                  <button
                    type="button"
                    onClick={() => takeFolder(group.routines)}
                    className="pressable shrink-0 rounded-pill bg-accent-soft px-3 py-1.5 text-[13px] font-bold text-accent"
                  >
                    Choisir ce dossier
                  </button>
                )}
              </div>

              <ul className="space-y-2">
                {group.routines.map((routine) => {
                  const times = timesOf(routine.id);
                  const sets = routineSetCount(routine);
                  const selected = times > 0;

                  return (
                    <li
                      key={routine.id}
                      className={cx(
                        'flex items-center gap-2 rounded-xl border p-2 transition-colors duration-200',
                        selected ? 'border-accent-border bg-white' : 'border-line bg-alt/60',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setTimes(routine.id, selected ? 0 : 1)}
                        aria-pressed={selected}
                        className="pressable flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span
                          className={cx(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                            selected ? 'bg-accent text-white' : 'border-[1.5px] border-ink-3 bg-white',
                          )}
                        >
                          {selected && <Check size={16} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cx(
                              'block truncate text-[15px] font-semibold',
                              selected ? 'text-ink' : 'text-ink-2',
                            )}
                          >
                            {routine.name}
                          </span>
                          <span className="block text-[12px] text-ink-3">
                            {sets} série{sets > 1 ? 's' : ''}
                          </span>
                        </span>
                      </button>

                      {selected && (
                        <div className="flex shrink-0 items-center rounded-lg bg-alt">
                          <button
                            type="button"
                            onClick={() => setTimes(routine.id, times - 1)}
                            disabled={times <= 1}
                            aria-label={`Une fois de moins par semaine : ${routine.name}`}
                            className="pressable flex h-9 w-9 items-center justify-center text-ink-2 disabled:opacity-30"
                          >
                            <Minus size={15} strokeWidth={2.6} />
                          </button>
                          <span className="num w-7 text-center text-[14px] font-bold">
                            ×{times}
                          </span>
                          <button
                            type="button"
                            onClick={() => setTimes(routine.id, times + 1)}
                            disabled={times >= MAX_TIMES}
                            aria-label={`Une fois de plus par semaine : ${routine.name}`}
                            className="pressable flex h-9 w-9 items-center justify-center text-ink-2 disabled:opacity-30"
                          >
                            <Plus size={15} strokeWidth={2.6} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Sheet>
  );
}
