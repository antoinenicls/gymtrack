/**
 * Widget d'assiduite hebdomadaire.
 *
 * Chaque semaine est une colonne de blocs empiles, un bloc par seance, avec
 * un trait horizontal qui marque l'objectif. La lecture est immediate : les
 * colonnes qui depassent le trait sont des semaines tenues.
 *
 * Choix de forme : des blocs distincts plutot qu'une barre pleine, parce
 * qu'une seance est une unite entiere. Une barre continue laisserait croire
 * a une grandeur continue, alors qu'on ne fait pas 2,4 seances.
 */

import { cx } from '@/ui/primitives';
import type { WeekBucket } from '@/lib/weekly';

/** Au-dela, les colonnes deviennent illisibles sur un ecran de telephone. */
const MAX_BLOCKS = 8;
const BLOCK_HEIGHT = 14;
const BLOCK_GAP = 3;

export default function WeeklyGoalWidget({
  weeks,
  goal,
}: {
  weeks: WeekBucket[];
  goal: number;
}) {
  // La hauteur suit la semaine la plus chargee, sans jamais descendre sous
  // l'objectif : sinon le trait sortirait du cadre.
  const peak = Math.max(goal, ...weeks.map((w) => w.count), 1);
  const rows = Math.min(MAX_BLOCKS, peak);
  const chartHeight = rows * BLOCK_HEIGHT + (rows - 1) * BLOCK_GAP;

  // Position du trait, mesuree depuis le bas. Il se pose exactement sur le
  // bord superieur du bloc correspondant a l'objectif : une colonne qui
  // touche le trait est une semaine tenue, sans ambiguite d'un pixel.
  const goalOffset =
    goal > 0 && goal <= rows ? goal * BLOCK_HEIGHT + (goal - 1) * BLOCK_GAP : null;

  return (
    <div>
      <div className="relative flex items-end justify-between gap-1.5" style={{ height: chartHeight }}>
        {goalOffset !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-accent/45"
            style={{ bottom: goalOffset }}
            aria-hidden
          />
        )}

        {weeks.map((week) => {
          const reached = goal > 0 && week.count >= goal;
          const visible = Math.min(week.count, rows);

          return (
            <div
              key={week.start}
              className="flex flex-1 flex-col-reverse items-center"
              style={{ gap: BLOCK_GAP, height: chartHeight }}
            >
              {Array.from({ length: rows }, (_, level) => {
                const filled = level < visible;
                return (
                  <span
                    key={level}
                    className={cx(
                      'w-full rounded-[3px] transition-colors duration-300 ease-ease',
                      filled
                        ? reached
                          ? 'bg-done'
                          : 'bg-accent'
                        : week.isCurrent
                          ? 'bg-alt'
                          : 'bg-alt/60',
                    )}
                    style={{ height: BLOCK_HEIGHT }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between gap-1.5">
        {weeks.map((week) => (
          <div key={week.start} className="flex-1 text-center">
            <p
              className={cx(
                'num text-[12px] font-bold',
                week.isCurrent ? 'text-ink' : 'text-ink-2',
              )}
            >
              {week.count}
            </p>
            <p
              className={cx(
                'truncate text-[9px]',
                week.isCurrent ? 'font-semibold text-accent' : 'text-ink-3',
              )}
            >
              {week.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
