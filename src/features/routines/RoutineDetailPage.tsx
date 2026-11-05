/**
 * Vue d'ensemble d'une routine, avant de la lancer.
 *
 * Volontairement en lecture seule : on y lit ce que contient la seance (nom,
 * nombre de series, muscle travaille) sans aucun champ de saisie. C'est
 * l'ecran qu'on consulte dans les vestiaires pour savoir ce qui attend, pas
 * celui ou l'on note quoi que ce soit. Taper un exercice ouvre sa fiche
 * par-dessus, sans quitter l'ecran.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Copy, Pencil, Share } from 'lucide-react';
import type { Exercise, Routine } from '@/types/domain';
import { exerciseRepo, routineRepo } from '@/services/repositories';
import { MUSCLE_GROUP_LABELS } from '@/data/seedExercises';
import { useWorkoutStore } from '@/features/workout/workoutStore';
import SessionBusySheet from '@/features/workout/SessionBusySheet';
import ExerciseDetailSheet from '@/features/exercises/ExerciseDetailSheet';
import ShareProgramSheet from '@/features/programs/ShareProgramSheet';
import { supersetLetters, supersetRuns } from '@/lib/superset';
import { SupersetGroup, SupersetTag } from '@/ui/SupersetGroup';
import { formatApproxDuration, formatDuration } from '@/lib/metrics';
import { plannedSetCount, setGroups } from '@/lib/dropset';
import { isToFailure } from '@/lib/setTypes';
import { timeAgo } from '@/lib/timeAgo';
import { Button, EmptyState, Stat, cx } from '@/ui/primitives';

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function RoutineDetailPage() {
  const { routineId } = useParams<{ routineId: string }>();
  const navigate = useNavigate();
  const startFromRoutine = useWorkoutStore((s) => s.startFromRoutine);
  /**
   * Une seance repliee rend cet ecran atteignable EN PLEIN entrainement : on
   * vient y relire ce qui suit pendant un temps de repos. Le bouton de
   * lancement doit alors expliquer au lieu d'ecraser la seance en cours.
   */
  const activeWorkout = useWorkoutStore((s) => s.workout);

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  const [busyOpen, setBusyOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Fiche du mouvement, ouverte en tapant sa ligne.
  const [detailed, setDetailed] = useState<Exercise | null>(null);

  useEffect(() => {
    void (async () => {
      if (!routineId) return;
      setRoutine((await routineRepo.get(routineId)) ?? null);
      setExercises(new Map((await exerciseRepo.all()).map((e) => [e.id, e])));
    })();
  }, [routineId]);

  if (!routine) {
    return (
      <div>
        <TopBar onBack={() => navigate(-1)} />
        <EmptyState title="Séance introuvable" />
      </div>
    );
  }

  const items = [...routine.items].sort((a, b) => a.order - b.order);
  // Series ANNONCEES : hors echauffement, et une degressive comptee pour une.
  const totalSets = items.reduce((sum, item) => sum + plannedSetCount(item.sets), 0);

  // Duree estimee : le repos domine largement le temps passe en salle, on
  // compte donc les repos entre series plus une minute de travail par serie.
  const estimatedSec = items.reduce(
    (sum, item) => sum + item.sets.length * (item.restSec + 60),
    0,
  );

  // Groupes musculaires distincts, dans l'ordre d'apparition de la seance.
  const groups: string[] = [];
  for (const item of items) {
    const group = exercises.get(item.exerciseId)?.muscleGroup;
    if (group && !groups.includes(group)) groups.push(group);
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        onBack={() => navigate(-1)}
        onEdit={() => navigate(`/routines/${routine.id}/modifier`)}
      />

      <div className="scroll-area flex-1 pb-6">
        <header className="px-4 pt-3">
          <h1 className="font-display text-[28px] font-black leading-tight tracking-[-1.2px]">
            {routine.name}
          </h1>
          <p className="mt-1 text-[14px] text-ink-2">
            {routine.lastPerformedAt
              ? `Dernière fois ${
                  timeAgo(routine.lastPerformedAt) ??
                  `le ${DATE_FMT.format(new Date(routine.lastPerformedAt))}`
                }`
              : 'Jamais réalisée pour l’instant'}
          </p>
        </header>

        <div className="mt-5 grid grid-cols-3 gap-3 px-4">
          <Stat value={String(items.length)} label="Exercices" accent="accent" />
          <Stat value={String(totalSets)} label="Séries prévues" />
          <Stat {...formatApproxDuration(estimatedSec)} label="Durée estimée" />
        </div>

        {routine.description && (
          <p className="mt-3 whitespace-pre-line px-4 text-[15px] leading-relaxed text-ink-2">
            {routine.description}
          </p>
        )}

        {groups.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 px-4">
            {groups.map((group) => (
              <span
                key={group}
                className="rounded-pill bg-accent-soft px-3 py-1.5 text-[13px] font-semibold text-accent"
              >
                {MUSCLE_GROUP_LABELS[group as keyof typeof MUSCLE_GROUP_LABELS] ?? group}
              </span>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState
            title="Séance vide"
            action={
              <Button
                variant="tinted"
                onClick={() => navigate(`/routines/${routine.id}/modifier`)}
              >
                Ajouter des exercices
              </Button>
            }
          >
            Aucun exercice n’a encore été ajouté à cette séance.
          </EmptyState>
        ) : (
          /* Meme enveloppe partagee qu'en seance et dans l'editeur, et donc
             pas de `divide-y` autour : sa couleur ecraserait le filet. */
          <div className="stagger mt-6 border-t border-line">
            {(() => {
              const runs = supersetRuns(items);
              const letters = supersetLetters(runs);
              return runs.map((run, runIndex) => {
                const letter = run.length > 1 ? letters[runIndex] ?? null : null;
                return (
                  <SupersetGroup key={run[0]?.id ?? runIndex} letter={letter} count={run.length}>
                    {run.map((item, positionInRun) => {
              const exercise = exercises.get(item.exerciseId);

              // Toute la ligne ouvre la fiche du mouvement : c'est ici, avant de
              // lancer, qu'on veut relire comment il se fait ou ce que dit sa
              // note. Un exercice supprime n'a plus de fiche a montrer.
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!exercise}
                  onClick={() => exercise && setDetailed(exercise)}
                  className={cx(
                    'block w-full bg-white px-4 py-3 text-left transition-colors active:bg-alt',
                    positionInRun > 0 && 'border-t border-line',
                  )}
                >
                  <div className="flex items-baseline gap-2">
                    <SupersetTag tag={letter ? `${letter}${positionInRun + 1}` : null} />
                    <p className="min-w-0 flex-1 truncate font-display text-[16px] font-extrabold tracking-[-0.03em]">
                      {exercise?.name ?? 'Exercice supprimé'}
                    </p>
                    <p className="num shrink-0 text-[14px] font-bold text-ink-2">
                      {plannedSetCount(item.sets)} × {summarizeReps(item.sets)}
                    </p>
                    {exercise && (
                      <ChevronRight size={16} className="shrink-0 self-center text-ink-3" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    {exercise ? MUSCLE_GROUP_LABELS[exercise.muscleGroup] : '-'}
                    {' · repos '}
                    {item.restSec > 0 ? formatDuration(item.restSec) : 'aucun'}
                    {/* Les descentes se comptent pour une serie : sans le dire,
                        « 2 × 8 » sur un exercice qui en contient deux de trois
                        paliers laissait croire a deux series seches. */}
                    {dropCount(item.sets) > 0 && (
                      <span className="text-accent">
                        {' · '}
                        {dropCount(item.sets)} dégressive{dropCount(item.sets) > 1 ? 's' : ''}
                      </span>
                    )}
                    {item.sets.some(isToFailure) && (
                      <span className="font-semibold text-red-600"> · à l’échec</span>
                    )}
                  </p>
                  {item.notes && (
                    <p className="mt-1 text-[13px] leading-snug text-ink-3">{item.notes}</p>
                  )}
                </button>
              );
                    })}
                  </SupersetGroup>
                );
              });
            })()}
          </div>
        )}
        {/* Duplication. Dans le corps de l'ecran et non colle en bas : c'est
            une action de rangement, elle ne doit pas disputer la place au
            bouton qu'on vient chercher. La copie s'ouvre directement dans son
            editeur, la ou se choisissent le nom et le dossier : dupliquer sert
            presque toujours a ranger la meme seance a deux endroits. */}
        <div className="mt-8 px-4">
          <Button
            variant="secondary"
            full
            onClick={() => {
              void routineRepo.duplicate(routine.id).then((copy) => {
                if (copy) navigate(`/routines/${copy.id}/modifier`, { replace: true });
              });
            }}
          >
            <Copy size={16} strokeWidth={2.2} />
            Dupliquer cette séance
          </Button>
          <Button variant="secondary" full className="mt-2" onClick={() => setSharing(true)}>
            <Share size={16} strokeWidth={2.2} />
            Partager cette séance
          </Button>
        </div>
      </div>

      {/* Bouton de lancement colle en bas : c'est la seule action qu'on vient
          reellement chercher sur cet ecran. */}
      {items.length > 0 && (
        <div className="shrink-0 border-t border-line bg-white px-4 py-3">
          <Button
            full
            className="min-h-[52px] text-[16px]"
            onClick={() => {
              if (activeWorkout) {
                setBusyOpen(true);
                return;
              }
              void startFromRoutine(routine);
              navigate('/seance');
            }}
          >
            Démarrer l’entraînement
          </Button>
        </div>
      )}

      <SessionBusySheet open={busyOpen} onClose={() => setBusyOpen(false)} />
      <ShareProgramSheet
        routines={sharing ? [routine] : []}
        onClose={() => setSharing(false)}
        onShared={() => undefined}
      />
      <ExerciseDetailSheet
        exercise={detailed}
        onClose={() => setDetailed(null)}
        onChanged={(updated) => {
          setDetailed(updated);
          setExercises((prev) => new Map(prev).set(updated.id, updated));
        }}
      />
    </div>
  );
}

/** Nombre de descentes, c'est-a-dire de groupes comptant plus d'un palier. */
function dropCount(sets: Routine['items'][number]['sets']): number {
  return setGroups(sets).filter((group) => group.length > 1).length;
}

/** Reps prevues : une valeur si toutes les series sont identiques, sinon une
 *  fourchette, ce qui evite d'afficher « 8 » pour une seance 12/10/8. */
function summarizeReps(sets: Routine['items'][number]['sets']): string {
  const reps = sets
    .filter((s) => s.type !== 'echauffement')
    .map((s) => s.targetReps)
    .filter((r): r is number => r !== null);
  if (reps.length === 0) return '?';
  const min = Math.min(...reps);
  const max = Math.max(...reps);
  return min === max ? String(min) : `${max}–${min}`;
}

function TopBar({ onBack, onEdit }: { onBack: () => void; onEdit?: () => void }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-2 py-2 backdrop-blur">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-[44px] items-center gap-1 pr-3 text-[15px] font-semibold text-accent"
      >
        <ChevronLeft size={22} strokeWidth={2.4} />
        Retour
      </button>

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-[44px] items-center gap-1.5 px-3 text-[15px] font-semibold text-accent"
        >
          <Pencil size={17} strokeWidth={2.3} />
          Modifier
        </button>
      )}
    </div>
  );
}
