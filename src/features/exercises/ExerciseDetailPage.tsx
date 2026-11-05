/**
 * Route de la fiche d'un exercice.
 *
 * Le contenu vit dans ExerciseDetail, partage avec la feuille ouverte depuis le
 * selecteur d'exercices : cette page n'apporte que la barre de retour et le
 * cadre de la route.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { EmptyState } from '@/ui/primitives';
import ExerciseDetail from './ExerciseDetail';

export default function ExerciseDetailPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const [missing, setMissing] = useState(false);

  return (
    <div className="pb-10">
      <BackBar onBack={() => navigate(-1)} />

      {exerciseId === undefined || missing ? (
        <EmptyState title="Exercice introuvable" />
      ) : (
        <div className="px-4 pt-2">
          <ExerciseDetail
            exerciseId={exerciseId}
            onMissing={() => setMissing(true)}
            onDeleted={() => navigate('/exercices')}
          />
        </div>
      )}
    </div>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="sticky top-0 z-10 border-b border-line bg-white/95 px-2 py-2 backdrop-blur">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-[44px] items-center gap-1 pr-3 text-[15px] font-semibold text-accent"
      >
        <ChevronLeft size={22} strokeWidth={2.4} />
        Retour
      </button>
    </div>
  );
}
