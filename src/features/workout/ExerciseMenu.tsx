/**
 * Menu « … » d'un exercice pendant la seance.
 *
 * Contient aussi la suggestion de surcharge progressive : c'est le moment
 * naturel pour la lire, une fois l'exercice termine et avant de passer au
 * suivant.
 */

import { useMemo } from 'react';
import { Flame, Trash2 } from 'lucide-react';
import type { Exercise, Workout } from '@/types/domain';
import { useWorkoutStore } from './workoutStore';
import { suggestProgression } from '@/lib/progression';
import { Banner, Button, Sheet } from '@/ui/primitives';
import RestPicker from './RestPicker';

export default function ExerciseMenu({
  entryId,
  workout,
  exercises,
  onClose,
}: {
  entryId: string | null;
  workout: Workout;
  exercises: Map<string, Exercise>;
  onClose: () => void;
}) {
  const store = useWorkoutStore();
  const entry = entryId ? workout.entries.find((e) => e.id === entryId) : undefined;
  const exercise = entry ? exercises.get(entry.exerciseId) : undefined;

  const suggestion = useMemo(
    () =>
      entry
        ? suggestProgression({
            entry,
            targetSets: null,
            targetReps: null,
            usesBar: exercise?.equipment === 'barre',
          })
        : null,
    [entry, exercise],
  );

  if (!entry) return null;

  return (
    <Sheet open onClose={onClose} title={exercise?.name ?? 'Exercice'}>
      <div className="space-y-5 pb-2">
        {/* Surcharge progressive : la suggestion vient toujours avec le
            chiffre qui l'a declenchee. */}
        {suggestion && suggestion.kind !== 'donnees-insuffisantes' && (
          <div>
            <p className="section-label mb-2">Prochaine fois</p>
            <Banner tone={suggestion.kind === 'recul' ? 'pr' : 'accent'}>
              <strong className="block font-display text-[14px]">{suggestion.message}</strong>
              <span className="mt-1 block opacity-90">{suggestion.reason}</span>
            </Banner>
          </div>
        )}

        <div>
          <p className="section-label mb-2">Temps de repos</p>
          <RestPicker
            valueSec={entry.restSec}
            onChange={(seconds) => void store.setEntryRest(entry.id, seconds)}
          />
        </div>

        <div className="space-y-2">
          <Button
            variant="secondary"
            full
            onClick={() => {
              void store.addWarmupSets(entry.id);
              onClose();
            }}
          >
            <Flame size={17} strokeWidth={2.2} />
            Générer l’échauffement
          </Button>

          {/* Le deplacement N'EST PLUS ici. Monter un exercice depuis son
              propre menu revenait a le bouger a l'aveugle : la feuille cachait
              justement les exercices par rapport auxquels on voulait le placer.
              Tout se fait desormais dans « Réorganiser les exercices », en bas
              de la seance, ou la liste entiere tient a l'ecran. */}
          <Button
            variant="danger"
            full
            onClick={() => {
              void store.removeEntry(entry.id);
              onClose();
            }}
          >
            <Trash2 size={17} strokeWidth={2.2} />
            Retirer de la séance
          </Button>
        </div>

        <p className="text-[13px] leading-relaxed text-ink-3">
          L’échauffement se calcule à partir de ta première série effective : 50 % puis 80 %,
          arrondis à une charge réellement chargeable sur ta barre. Deux séries au maximum, pour
          ne pas y passer la séance.
        </p>
      </div>
    </Sheet>
  );
}
