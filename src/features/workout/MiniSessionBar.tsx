/**
 * Barre de la seance repliee, collee au-dessus des onglets.
 *
 * La seance en cours occupe tout l'ecran Seance, ce qui rendait inaccessible
 * tout le reste : impossible d'aller relire une seance programmee pendant un
 * temps de repos sans terminer ou annuler l'entrainement. La replier la reduit
 * a cette barre, presente sur TOUS les onglets, et un tap la rouvre en grand
 * exactement dans l'etat ou on l'a laissee (rien n'est demonte cote donnees :
 * la seance vit dans le magasin, pas dans l'ecran).
 *
 * Elle vit dans le shell et non dans l'ecran Seance, pour la meme raison que
 * `RestTimerBar` : c'est un element persistant de l'application, pas une
 * portion d'ecran.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp } from 'lucide-react';
import { doneSetCount, useWorkoutStore } from './workoutStore';
import { formatElapsed } from '@/lib/metrics';

export default function MiniSessionBar() {
  const workout = useWorkoutStore((s) => s.workout);
  const minimized = useWorkoutStore((s) => s.minimized);
  const setMinimized = useWorkoutStore((s) => s.setMinimized);
  const navigate = useNavigate();

  const startedAt = workout?.startedAt ?? null;
  const [elapsed, setElapsed] = useState(0);

  // Meme calcul que le chrono de l'en-tete de seance : derive de `startedAt`
  // et jamais decremente, pour rester juste apres une mise en veille.
  useEffect(() => {
    if (startedAt === null) return;
    const tick = (): void => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  if (!workout || !minimized) return null;

  const sets = doneSetCount(workout);

  return (
    <button
      type="button"
      onClick={() => {
        setMinimized(false);
        navigate('/seance');
      }}
      className="pressable pressable-wide animate-slide-up flex w-full items-center gap-3 border-t border-line bg-white/95 px-3 py-2 text-left backdrop-blur"
    >
      {/* Chevron VERS LE HAUT : la barre remonte occuper l'ecran. C'est le
          geste inverse de celui qui l'a repliee, avec la meme icone retournee,
          et le seul repere qui dise qu'il reste quelque chose a rouvrir. */}
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <ChevronUp size={20} strokeWidth={2.6} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[15px] font-extrabold tracking-[-0.02em]">
          {workout.name}
        </span>
        <span className="block truncate text-[12px] text-ink-3">
          Séance en cours · {sets} série{sets > 1 ? 's' : ''}
        </span>
      </span>

      <span className="num shrink-0 font-display text-[16px] font-black tabular-nums">
        {formatElapsed(elapsed)}
      </span>
    </button>
  );
}
