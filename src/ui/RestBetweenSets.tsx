import { Timer } from 'lucide-react';
import { formatDuration } from '@/lib/metrics';

/**
 * Temps de repos, glisse ENTRE deux series.
 *
 * Il n'etait visible que sur l'entete de l'exercice, dans deux vues sur
 * quatre. Or c'est entre deux series qu'on se demande combien de temps
 * souffler, pas au moment de lire le nom du mouvement.
 *
 * Discret par construction : la ligne se repete a chaque intervalle, elle doit
 * donc se laisser sauter par l'oeil. Un repos nul n'affiche rien du tout,
 * plutot qu'un « 0:00 » qui obligerait a le lire pour comprendre qu'il n'y a
 * rien a lire.
 */
export function RestBetweenSets({ seconds }: { seconds: number }) {
  if (seconds <= 0) return null;

  return (
    <div className="flex items-center justify-center gap-1 py-0.5 text-[11px] text-ink-3">
      <Timer size={11} strokeWidth={2.2} />
      <span className="num">{formatDuration(seconds)}</span>
    </div>
  );
}
