/** Recapitulatif de fin de seance. */

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { Exercise, Workout } from '@/types/domain';
import { exerciseRepo, newId, routineRepo, workoutRepo } from '@/services/repositories';
import { summarizeWorkout } from '@/lib/exports';
import {
  buildRoutineFromWorkout,
  canBuildRoutine,
  diffRoutineFromWorkout,
  type RoutineDiff,
} from '@/lib/routineSync';
import { formatDuration, formatVolume, workoutAverageRpe, workoutVolume } from '@/lib/metrics';
import { Banner, Button, PrBadge, Sheet, Stat } from '@/ui/primitives';
import { EFFORT_LABEL, formatEffortValue } from '@/lib/effort';
import { useEffortScale } from '@/services/useEffortScale';

export default function FinishSummary({
  workout,
  onClose,
}: {
  workout: Workout;
  onClose: () => void;
}) {
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  /** Ecart entre ce qui etait prevu et ce qui a ete fait, si la seance vient
   *  d'une routine. */
  const [diff, setDiff] = useState<RoutineDiff | null>(null);
  const effortScale = useEffortScale();
  const [synced, setSynced] = useState(false);
  /** Seance improvisee qu'on peut encore proposer d'enregistrer. */
  const [saveable, setSaveable] = useState(
    workout.routineId === null && canBuildRoutine(workout),
  );
  const [routineName, setRoutineName] = useState(workout.name);
  const [saved, setSaved] = useState(false);
  /** Confirmation en deux temps de l'annulation. */
  const [discarding, setDiscarding] = useState(false);

  /**
   * Efface la seance qu'on vient d'enregistrer.
   *
   * Trois choses a defaire, et dans cet ordre. La seance elle-meme, dont la
   * suppression recalcule les records au passage : un record porte par une
   * seance qui n'existe plus est un fantome. Puis « derniere fois le… » de la
   * routine, que la fin d'entrainement avait posee au jour meme.
   */
  const discard = async (): Promise<void> => {
    await workoutRepo.remove(workout.id);
    if (workout.routineId) await routineRepo.refreshLastPerformed(workout.routineId);
    onClose();
  };

  const saveAsRoutine = async (): Promise<void> => {
    const routine = buildRoutineFromWorkout(workout, routineName, newId);
    await routineRepo.save(routine);
    // La seance adopte la routine qu'elle vient de produire : la prochaine
    // fois, le report ci-dessous saura a quoi comparer.
    await workoutRepo.save({ ...workout, routineId: routine.id });
    setSaved(true);
  };

  useEffect(() => {
    void (async () => {
      const ids = [...new Set(workout.entries.map((e) => e.exerciseId))];
      const loaded = await Promise.all(ids.map((id) => exerciseRepo.get(id)));
      const map = new Map(loaded.filter((e): e is Exercise => !!e).map((e) => [e.id, e]));
      setExercises(map);

      // Le report ne se declenche jamais tout seul : la routine est une
      // intention, la seance un fait, et les deux ont le droit de diverger.
      if (workout.routineId) {
        const routine = await routineRepo.get(workout.routineId);
        if (routine) {
          const computed = diffRoutineFromWorkout(routine, workout, (id) => map.get(id)?.name);
          setDiff(computed.changed ? computed : null);
        }
      }
    })();
  }, [workout]);

  const lines = summarizeWorkout(workout, exercises);
  const rpe = workoutAverageRpe(workout);

  return (
    <Sheet open onClose={onClose} title="Séance terminée">
      <div className="space-y-6 pb-2">
        <div className="grid grid-cols-3 gap-3">
          <Stat value={formatDuration(workout.durationSec ?? 0)} label="Durée" />
          <Stat value={formatVolume(workoutVolume(workout))} label="Volume total" accent="accent" />
          <Stat
            value={rpe !== null ? formatEffortValue(rpe, effortScale) : '-'}
            label={`${EFFORT_LABEL[effortScale]} moyen`}
          />
        </div>

        <div>
          <p className="section-label mb-2">Le détail</p>
          <ul className="divide-y divide-line">
            {/* Cle sur le RANG et non sur le nom : au premier rendu la table
                des exercices n'est pas encore chargee, et toutes les lignes
                s'appellent alors « Exercice supprimé ». Deux enfants de meme
                cle, et React laissait un noeud orphelin : le recapitulatif
                affichait une ligne fantome en plus. Le rang, lui, est unique
                et stable. */}
            {lines.map((line, index) => (
              <li key={index} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{line.exerciseName}</p>
                  <p className="num mt-0.5 text-[13px] text-ink-2">
                    {line.sets} série{line.sets > 1 ? 's' : ''} · top {line.topSet}
                  </p>
                </div>
                {line.hasPr ? <PrBadge /> : line.hasMonthPr && <PrBadge month />}
                <p className="num shrink-0 font-display text-[15px] font-bold text-ink-2">
                  {formatVolume(line.volumeKg)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Seance improvisee : on propose d'en garder le modele.
            PROPOSE et non automatique, pour la meme raison que le report
            ci-dessous : creer une entree a chaque seance vide remplirait
            « Mes séances » de doublons que l'athlete n'a pas demandes. */}
        {saveable && (
          <div>
            <p className="section-label mb-2">Garder cette séance</p>
            {saved ? (
              <Banner tone="done">
                Enregistrée dans « Mes séances ». Tu la relanceras en un tap, avec tes exercices et
                tes charges déjà en place.
              </Banner>
            ) : (
              <>
                <p className="mb-2 text-[14px] leading-relaxed text-ink-2">
                  Tu l’as construite en direct. Enregistre-la pour la retrouver dans « Mes
                  séances » et la relancer sans avoir à rechercher tes exercices.
                </p>
                <input
                  type="text"
                  value={routineName}
                  onChange={(e) => setRoutineName(e.currentTarget.value)}
                  aria-label="Nom de la séance enregistrée"
                  placeholder="Nom de la séance"
                  className="mb-2 w-full rounded-xl bg-alt px-4 py-3 text-[15px] font-semibold focus:bg-accent-soft focus:outline-none"
                />
                <div className="space-y-2">
                  <Button full variant="secondary" onClick={() => void saveAsRoutine()}>
                    <Plus size={16} strokeWidth={2.4} />
                    Enregistrer dans mes séances
                  </Button>
                  <Button full variant="ghost" onClick={() => setSaveable(false)}>
                    Non merci
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Report vers la routine. */}
        {diff && (
          <div>
            <p className="section-label mb-2">Ta séance enregistrée a bougé</p>
            {synced ? (
              <Banner tone="done">
                Séance enregistrée mise à jour. La prochaine partira de ce que tu viens de faire.
              </Banner>
            ) : (
              <>
                <p className="mb-2 text-[14px] leading-relaxed text-ink-2">
                  Tu n’as pas fait exactement ce qui était prévu. Tu peux reporter ces changements
                  dans « {workout.name} », ou la laisser telle quelle.
                </p>
                <ul className="mb-3 space-y-1">
                  {diff.changes.map((change) => (
                    <li key={change} className="flex gap-2 text-[13px] leading-snug text-ink-2">
                      <span className="text-accent">→</span>
                      {change}
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  <Button
                    full
                    variant="secondary"
                    onClick={() => {
                      void routineRepo.save(diff.updated).then(() => setSynced(true));
                    }}
                  >
                    <RefreshCw size={16} strokeWidth={2.2} />
                    Mettre à jour la séance
                  </Button>
                  <Button full variant="ghost" onClick={() => setDiff(null)}>
                    Garder la version d’origine
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Annulation de la seance qu'on vient de terminer.
            En BAS et derriere une confirmation : c'est la seule action de cet
            ecran qui detruise quelque chose, et elle voisine des boutons qu'on
            touche a chaque fin de seance. */}
        <div className="border-t border-line pt-4">
          {discarding ? (
            <div className="space-y-2">
              <p className="text-[14px] leading-relaxed text-ink-2">
                Les {lines.length} exercice{lines.length > 1 ? 's' : ''} de cette séance et les{' '}
                records qu’elle vient d’établir seront effacés. Tes séances précédentes ne bougent
                pas.
              </p>
              <Button full variant="danger" onClick={() => void discard()}>
                Oui, annuler la séance
              </Button>
              <Button full variant="ghost" onClick={() => setDiscarding(false)}>
                Non, la garder
              </Button>
            </div>
          ) : (
            <Button full variant="ghost" onClick={() => setDiscarding(true)}>
              <Trash2 size={16} strokeWidth={2.2} />
              Annuler cette séance
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
