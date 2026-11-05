/** Detail d'une seance passee, serie par serie. */

import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ChevronLeft, Trash2 } from 'lucide-react';
import type { Exercise, Workout } from '@/types/domain';
import { exerciseRepo, workoutRepo } from '@/services/repositories';
import {
  formatDuration,
  formatVolume,
  formatWeight,
  workoutAverageRpe,
  workoutVolume,
} from '@/lib/metrics';
import { TYPE_LABEL, TYPE_LETTER, TYPE_STYLE, isToFailure } from '@/lib/setTypes';
import { setGroups, setNumbers } from '@/lib/dropset';
import { DropGroup } from '@/ui/DropGroup';
import { supersetLetters, supersetRuns } from '@/lib/superset';
import { SupersetGroup, SupersetTag } from '@/ui/SupersetGroup';
import { Button, EmptyState, PrBadge, Sheet, Stat, cx } from '@/ui/primitives';

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function WorkoutDetailPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!workoutId) return;
      setWorkout((await workoutRepo.get(workoutId)) ?? null);
      setExercises(new Map((await exerciseRepo.all()).map((e) => [e.id, e])));
    })();
  }, [workoutId]);

  if (!workout) {
    return (
      <div>
        <BackBar />
        <EmptyState title="Séance introuvable">
          Elle a peut-être été supprimée depuis cet appareil.
        </EmptyState>
      </div>
    );
  }

  const rpe = workoutAverageRpe(workout);

  return (
    <div className="pb-8">
      <BackBar />

      <header className="px-4 pt-2">
        <h1 className="font-display text-[28px] font-black leading-tight tracking-[-1.2px]">
          {workout.name}
        </h1>
        <p className="mt-1 text-[14px] capitalize text-ink-2">
          {DATE_FMT.format(new Date(workout.startedAt))}
        </p>
      </header>

      <div className="mt-5 grid grid-cols-3 gap-3 px-4">
        <Stat value={formatDuration(workout.durationSec ?? 0)} label="Durée" />
        <Stat value={formatVolume(workoutVolume(workout))} label="Volume" accent="accent" />
        <Stat value={rpe !== null ? String(rpe).replace('.', ',') : '-'} label="RPE moyen" />
      </div>

      {workout.notes && (
        <p className="mx-4 mt-4 rounded-xl border-l-[3px] border-pr bg-pr-soft px-3 py-2.5 text-[14px] leading-snug text-[#92400E]">
          {workout.notes}
        </p>
      )}

      <div className="mt-6 px-4">
        {(() => {
          const runs = supersetRuns(workout.entries);
          const letters = supersetLetters(runs);
          return runs.map((run, runIndex) => {
            const letter = run.length > 1 ? letters[runIndex] ?? null : null;
            return (
              <SupersetGroup key={run[0]?.id ?? runIndex} letter={letter} count={run.length}>
                {run.map((entry, positionInRun) => (
          <section key={entry.id} className="px-1 py-3">
            <div className="mb-1.5 flex items-center gap-2">
              <SupersetTag tag={letter ? `${letter}${positionInRun + 1}` : null} />
              <Link
                to={`/exercices/${entry.exerciseId}`}
                className="font-display text-[16px] font-extrabold tracking-[-0.03em] text-accent"
              >
                {exercises.get(entry.exerciseId)?.name ?? 'Exercice supprimé'}
              </Link>
            </div>

            {entry.notes && (
              <p className="mb-1.5 text-[13px] leading-snug text-ink-2">{entry.notes}</p>
            )}

            {/* Relu par GROUPES, exactement comme en seance et dans
                l'editeur. L'historique affichait les paliers d'une degressive
                a plat, numerotes comme autant de series : une descente de deux
                paliers s'y relisait comme deux series distinctes, alors que la
                seance qui venait de l'enregistrer en comptait une. */}
            <div className="overflow-hidden rounded-xl border border-line">
              {(() => {
                const numbers = setNumbers(entry.sets);
                const groups = setGroups(entry.sets);
                let index = -1;

                return groups.map((group, groupIndex) => {
                  const rows = group.map((set) => {
                    index += 1;
                    const number = numbers[index] ?? null;
                    const failure = isToFailure(set);
                    const first = index === 0;

                    return (
                      <div
                        key={set.id}
                        className={cx(
                          'flex items-center gap-3 px-3 py-2',
                          !first && 'border-t border-line',
                          (set.prKinds?.length ?? 0) > 0
                            ? 'bg-pr-soft'
                            : (set.monthPrKinds?.length ?? 0) > 0 && 'bg-month-soft',
                        )}
                      >
                        {/* Meme pastille que pendant la seance et dans
                            l'editeur : W echauffement, D degressive, fleche
                            pour un palier, rouge pour l'echec. */}
                        <span
                          title={failure ? `${TYPE_LABEL[set.type]}, à l’échec` : TYPE_LABEL[set.type]}
                          className={cx(
                            'num flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-bold',
                            failure ? 'bg-red-50 text-red-600' : TYPE_STYLE[set.type],
                          )}
                        >
                          {number === null ? (
                            <ArrowDown size={13} strokeWidth={3} />
                          ) : group.length > 1 ? (
                            number
                          ) : (
                            TYPE_LETTER[set.type] ?? number
                          )}
                        </span>
                        <span className="num flex-1 font-display text-[15px] font-bold">
                          {formatWeight(set.weightKg ?? 0)} kg × {set.reps ?? 0}
                        </span>
                        {set.rpe !== null && (
                          <span className="num text-[13px] text-ink-2">
                            RPE {formatWeight(set.rpe)}
                          </span>
                        )}
                        {(set.prKinds?.length ?? 0) > 0 ? (
                          <PrBadge compact />
                        ) : (
                          (set.monthPrKinds?.length ?? 0) > 0 && <PrBadge compact month />
                        )}
                      </div>
                    );
                  });

                  if (group.length === 1) return <Fragment key={group[0]?.id}>{rows}</Fragment>;

                  return (
                    <div
                      key={group[0]?.id ?? groupIndex}
                      className={cx(groupIndex > 0 && 'border-t border-line')}
                    >
                      <DropGroup count={group.length} toFailure={group.some(isToFailure)}>
                        {rows}
                      </DropGroup>
                    </div>
                  );
                });
              })()}
            </div>
            {entry.restSec > 0 && entry.sets.length > 1 && (
              <p className="mt-1 text-center text-[11px] text-ink-3">
                Repos entre les séries : {formatDuration(entry.restSec)}
              </p>
            )}
          </section>
                ))}
              </SupersetGroup>
            );
          });
        })()}
      </div>

      <div className="mt-8 space-y-2 px-4">
        <Button variant="danger" full onClick={() => setConfirmDelete(true)}>
          <Trash2 size={16} strokeWidth={2.2} />
          Supprimer cette séance
        </Button>
      </div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Supprimer la séance">
        <p className="pb-4 text-[15px] leading-relaxed text-ink-2">
          Cette séance sera retirée de ton historique et de tes statistiques. Tes records sont
          recalculés sur ce qu’il reste : ceux qui venaient de cette séance redescendent à ta
          meilleure performance conservée.
        </p>
        <div className="space-y-2 pb-2">
          <Button
            variant="danger"
            full
            onClick={() => {
              void workoutRepo.remove(workout.id).then(() => navigate('/historique'));
            }}
          >
            Oui, supprimer
          </Button>
          <Button variant="secondary" full onClick={() => setConfirmDelete(false)}>
            Annuler
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function BackBar() {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-10 border-b border-line bg-white/95 px-2 py-2 backdrop-blur">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex min-h-[44px] items-center gap-1 pr-3 text-[15px] font-semibold text-accent"
      >
        <ChevronLeft size={22} strokeWidth={2.4} />
        Retour
      </button>
    </div>
  );
}
