/**
 * Widget de recuperation, colle en bas au-dessus de la tab bar.
 *
 * Persistant : il reste visible ou que l'athlete scrolle, parce que c'est
 * l'information qu'il consulte le plus souvent entre deux series.
 */

import { Pause, X } from 'lucide-react';
import { useWorkoutStore } from './workoutStore';
import { useRestTimer } from './useRestTimer';
import { formatDuration } from '@/lib/metrics';
import { cx } from '@/ui/primitives';

export default function RestTimerBar() {
  const { active, paused, remainingSec, totalSec, progress } = useRestTimer();
  const adjustRest = useWorkoutStore((s) => s.adjustRest);
  const toggleRestPause = useWorkoutStore((s) => s.toggleRestPause);
  const stopRest = useWorkoutStore((s) => s.stopRest);

  if (!active) return null;

  // Les dix dernieres secondes passent en accent : l'athlete doit se remettre
  // en place avant la fin, pas au signal. En pause, rien ne presse.
  const ending = !paused && remainingSec <= 10;

  return (
    <div className="animate-slide-up border-t border-line bg-white/95 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void adjustRest(-15)}
          aria-label="Retirer 15 secondes"
          className="pressable flex h-11 w-11 items-center justify-center rounded-xl bg-alt text-ink-2 active:bg-line-2"
        >
          {/* Le montant est ecrit noir sur blanc : une icone seule ne dit pas
              de combien on ajuste. */}
          <span className="num font-display text-[13px] font-extrabold leading-none">
            &minus;15
          </span>
        </button>

        {/* Le chiffre EST le bouton de pause. Un quatrieme bouton dans la
            rangee aurait retreci les trois autres, et le temps est la plus
            grande cible de la barre : c'est celle qu'on vise le plus vite
            entre deux series, sans regarder. */}
        <button
          type="button"
          onClick={() => void toggleRestPause()}
          aria-label={paused ? 'Reprendre le repos' : 'Mettre le repos en pause'}
          aria-pressed={paused}
          className="pressable relative flex-1 overflow-hidden rounded-xl bg-alt"
        >
          {/* Barre de progression : lecture peripherique, sans lire le chiffre. */}
          <div
            className={cx(
              'absolute inset-y-0 left-0 transition-[width] duration-300 ease-linear',
              paused ? 'bg-line-2' : ending ? 'bg-accent-border' : 'bg-done-soft',
            )}
            style={{ width: `${progress * 100}%` }}
          />
          <p
            className={cx(
              'num relative flex items-center justify-center gap-2 py-2.5',
              'font-display text-[22px] font-black tabular-nums',
              paused ? 'text-ink-2' : ending ? 'text-accent' : 'text-ink',
            )}
          >
            {/* En pause, l'icone accompagne le chiffre au lieu de le masquer :
                savoir COMBIEN il reste compte autant que savoir que c'est
                arrete. */}
            {paused && <Pause size={18} strokeWidth={3} fill="currentColor" />}
            {formatDuration(remainingSec)}
            {/* Duree de depart, en petit derriere le temps restant.
                « 0:45 » seul ne dit pas si le repos etait de 90 secondes ou de
                trois minutes, et l'information disparaissait completement une
                fois le chrono ecoule. Elle suit les +15 / -15 : c'est bien la
                duree en vigueur, pas celle qui avait ete lancee. */}
            <span className="text-[13px] font-bold text-ink-3">
              /&nbsp;{formatDuration(totalSec)}
            </span>
          </p>
        </button>

        <button
          type="button"
          onClick={() => void adjustRest(15)}
          aria-label="Ajouter 15 secondes"
          className="pressable flex h-11 w-11 items-center justify-center rounded-xl bg-alt text-ink-2 active:bg-line-2"
        >
          <span className="num font-display text-[13px] font-extrabold leading-none">+15</span>
        </button>

        <button
          type="button"
          onClick={() => void stopRest()}
          aria-label="Arrêter le repos"
          className="pressable flex h-11 w-11 items-center justify-center rounded-xl bg-alt text-ink-2 active:bg-line-2"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
