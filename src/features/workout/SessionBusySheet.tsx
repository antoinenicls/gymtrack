/**
 * Barrage : on essaie de lancer une seance alors qu'une autre tourne, repliee.
 *
 * Tant que la seance en cours prenait tout l'ecran, ce cas n'existait pas : on
 * ne pouvait pas atteindre un bouton « Lancer ». Depuis qu'elle se replie, ces
 * boutons sont a portee de pouce et un tap malheureux ecraserait sans un mot
 * tout ce qui a ete souleve depuis le debut. On explique plutot que d'ecraser,
 * et on propose le seul geste qui debloque : revenir a la seance en cours.
 */

import { useNavigate } from 'react-router-dom';
import { useWorkoutStore } from './workoutStore';
import { Button, Sheet } from '@/ui/primitives';

export default function SessionBusySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const workout = useWorkoutStore((s) => s.workout);
  const setMinimized = useWorkoutStore((s) => s.setMinimized);
  const navigate = useNavigate();

  return (
    /* Titre court : « Une séance est déjà en cours » passait a la ligne des
       320 px et venait buter contre le « Fermer » de la feuille. */
    <Sheet open={open} onClose={onClose} title="Séance déjà en cours">
      <div className="space-y-2 pb-2">
        <p className="text-[15px] leading-relaxed text-ink-2">
          {workout ? (
            <>
              <strong className="font-semibold text-ink">{workout.name}</strong> n’est pas
              terminée. Reprends-la pour la finir ou l’annuler : tu pourras lancer celle-ci
              juste après.
            </>
          ) : (
            'Reprends la séance en cours pour la finir ou l’annuler.'
          )}
        </p>
        <p className="text-[14px] leading-relaxed text-ink-2">
          Rien n’est perdu en attendant : ce que tu as déjà validé reste enregistré.
        </p>
        <Button
          full
          onClick={() => {
            setMinimized(false);
            onClose();
            navigate('/seance');
          }}
        >
          Reprendre la séance en cours
        </Button>
        <Button variant="secondary" full onClick={onClose}>
          Rester ici
        </Button>
      </div>
    </Sheet>
  );
}
