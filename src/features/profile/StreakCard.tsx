/**
 * En-tete du profil : la flamme de regularite et le total des seances.
 *
 * Remplace la carte « Mes entraînements » : un avatar et un titre faisaient
 * croire a un compte, alors que tout vit sur l'appareil. On cherchait a la
 * toucher, rien ne se passait. L'en-tete montre desormais ce qui appartient
 * vraiment a l'athlete : ses chiffres.
 *
 * Trois etats de flamme :
 *  - allumee : la semaine en cours est deja tenue, elle vacille ;
 *  - en attente : la serie court, mais cette semaine reste a tenir. Couleurs
 *    passees, pour donner envie de la rallumer sans annoncer une perte ;
 *  - eteinte : aucune serie en cours, gris.
 */

import { useId } from 'react';
import type { WeekStreak } from '@/lib/weekly';
import { cx } from '@/ui/primitives';

type FlameState = 'lit' | 'pending' | 'out';

export default function StreakCard({
  streak,
  totalWorkouts,
}: {
  streak: WeekStreak;
  totalWorkouts: number;
}) {
  const state: FlameState = streak.thisWeekDone
    ? 'lit'
    : streak.current > 0
      ? 'pending'
      : 'out';

  return (
    <section className="card overflow-hidden">
      <div className="flex items-stretch">
        {/* La flamme. Le halo chaud ne s'allume qu'avec elle. */}
        <div
          className={cx(
            'relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden p-4',
            state === 'lit' && 'bg-gradient-to-br from-orange-50 via-amber-50/60 to-white',
          )}
        >
          <Flame state={state} />
          <div className="min-w-0">
            <p
              className={cx(
                'num font-display text-[34px] font-black leading-none tracking-[-1px]',
                state === 'lit' ? 'text-orange-600' : state === 'pending' ? 'text-ink' : 'text-ink-3',
              )}
            >
              {streak.current}
            </p>
            <p className="mt-1 text-[12px] leading-tight text-ink-2">
              semaine{streak.current > 1 ? 's' : ''}
              <br />
              d’affilée
            </p>
          </div>
        </div>

        <div className="my-4 w-px shrink-0 bg-line" aria-hidden />

        <div className="flex shrink-0 flex-col justify-center px-5 py-4 text-right">
          <p className="num font-display text-[34px] font-black leading-none tracking-[-1px]">
            {totalWorkouts}
          </p>
          <p className="mt-1 text-[12px] leading-tight text-ink-2">
            séance{totalWorkouts > 1 ? 's' : ''}
            <br />
            au total
          </p>
        </div>
      </div>

      <p className="border-t border-line px-4 py-2.5 text-[13px] leading-snug text-ink-2">
        {statusLine(streak, totalWorkouts)}
      </p>
    </section>
  );
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? 's' : ''}`;
}

/** Une phrase, qui dit toujours ce qu'il faut faire ou ce qui a ete fait. */
function statusLine(streak: WeekStreak, totalWorkouts: number): string {
  const rule =
    streak.target > 1
      ? `Une semaine compte dès ${streak.target} séances, ton objectif.`
      : 'Une séance dans la semaine suffit à la faire compter.';

  if (streak.thisWeekDone) {
    if (streak.current >= streak.best && streak.current > 1) {
      return 'Semaine tenue. C’est ta plus longue série, continue.';
    }
    if (streak.best > streak.current) {
      return `Semaine tenue, la flamme brûle. Ton record : ${plural(streak.best, 'semaine')}.`;
    }
    return 'Semaine tenue, la flamme est allumée.';
  }

  if (streak.current > 0) {
    return `Encore ${plural(streak.remaining, 'séance')} cette semaine pour garder la flamme.`;
  }

  if (totalWorkouts === 0) return `Ta première semaine tenue allume la flamme. ${rule}`;
  return `${plural(streak.remaining, 'séance')} cette semaine pour rallumer la flamme. ${rule}`;
}

/**
 * La flamme, dessinee a la main : un corps et un coeur, chacun en degrade.
 * Les identifiants de degrade passent par useId, sans quoi deux flammes sur
 * la meme page se voleraient leurs couleurs.
 */
function Flame({ state }: { state: FlameState }) {
  const id = useId().replace(/:/g, '');
  const outer = `flame-outer-${id}`;
  const inner = `flame-inner-${id}`;

  const colors =
    state === 'out'
      ? { outer: ['#D4D4D8', '#E4E4E7'], inner: ['#F4F4F5', '#FAFAFA'] }
      : { outer: ['#EA580C', '#FBBF24'], inner: ['#FDE68A', '#FFFBEB'] };

  return (
    <span className="relative flex h-14 w-12 shrink-0 items-end justify-center">
      {state === 'lit' && (
        <span
          className="absolute bottom-1 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full bg-orange-400/35 blur-xl"
          aria-hidden
        />
      )}
      <svg
        viewBox="0 0 32 40"
        className={cx(
          'relative h-14 w-12 origin-bottom',
          state === 'lit' && 'animate-flame drop-shadow-[0_4px_8px_rgba(234,88,12,0.35)]',
          state === 'pending' && 'opacity-45 saturate-50',
        )}
        aria-hidden
      >
        <defs>
          <linearGradient id={outer} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={colors.outer[0]} />
            <stop offset="100%" stopColor={colors.outer[1]} />
          </linearGradient>
          <linearGradient id={inner} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={colors.inner[0]} />
            <stop offset="100%" stopColor={colors.inner[1]} />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${outer})`}
          d="M16 1.5c.6 6.2 5.6 9.6 8.7 14.4 3.4 5.2 3.9 11.4.6 16.3C22.9 35.8 19.6 38.5 16 38.5S8.6 36.3 6 32.3C2.6 27 3.4 20.6 6.6 15.8c.8 2.6 2.2 4.4 4.2 5.4-.6-4.7.4-9.3 2.4-12.6 1.1-1.9 2.2-4.2 2.8-7.1z"
        />
        <path
          fill={`url(#${inner})`}
          d="M16.4 19.5c.5 3.4 3.4 5.2 4.6 8.4 1.4 3.6-.1 7.8-4.4 8.6-.2 0-.4.1-.6.1-3.5 0-5.8-2.6-5.4-6 .2-1.8 1-3.2 2.1-4.4.2 1.4.9 2.4 1.9 3-.1-3.4.6-6.5 1.8-9.7z"
        />
      </svg>
    </span>
  );
}
