/**
 * Regularite sur l'annee : un carre par jour, une colonne par semaine.
 *
 * Complete le widget hebdomadaire, qui ne remonte que huit semaines : ici on
 * voit d'un coup d'oeil les trous de l'ete, les reprises, la constance.
 *
 * Dessine en SVG a viewBox fixe : la grille de 53 colonnes remplit toujours
 * la largeur de la carte, quel que soit l'ecran, sans defilement horizontal.
 */

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildYearGrid } from '@/lib/yearGrid';

const CELL = 10;
const GAP = 2.5;
const STEP = CELL + GAP;
/** Marge autour de la grille, pour que l'anneau du jour ne soit pas rogne. */
const PAD = 2;
const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'narrow' });
const AVG_FMT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export default function YearHeatmap({ startedAt }: { startedAt: number[] }) {
  const currentYear = new Date().getFullYear();
  const firstYear = useMemo(
    () => (startedAt.length > 0 ? Math.min(currentYear, ...startedAt.map((at) => new Date(at).getFullYear())) : currentYear),
    [startedAt, currentYear],
  );
  const [year, setYear] = useState(currentYear);

  const grid = useMemo(() => buildYearGrid(startedAt, year), [startedAt, year]);

  const width = grid.weeks.length * STEP - GAP + PAD * 2;
  const height = 7 * STEP - GAP + PAD * 2;

  // Moyenne sur les semaines ECOULEES : en octobre, diviser par 52 ferait
  // croire a une baisse de regime qui n'existe pas.
  const elapsedDays = grid.weeks.flat().filter((d) => d !== null && !d.isFuture).length;
  const perWeek = elapsedDays > 0 ? (grid.activeDays / elapsedDays) * 7 : 0;

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="num font-display text-[26px] font-black leading-none">
            {grid.activeDays}
            <span className="ml-1.5 text-[14px] font-semibold text-ink-2">
              jour{grid.activeDays > 1 ? 's' : ''} d’entraînement en {year}
            </span>
          </p>
          <p className="mt-1 text-[12px] text-ink-2">
            {elapsedDays === 0
              ? 'L’année n’a pas encore commencé'
              : `Soit ${AVG_FMT.format(perWeek)} par semaine en moyenne`}
          </p>
        </div>

        {firstYear < currentYear && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setYear(year - 1)}
              disabled={year <= firstYear}
              aria-label="Année précédente"
              className="pressable flex h-9 w-9 items-center justify-center rounded-xl bg-alt text-ink-2 disabled:opacity-30"
            >
              <ChevronLeft size={17} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => setYear(year + 1)}
              disabled={year >= currentYear}
              aria-label="Année suivante"
              className="pressable flex h-9 w-9 items-center justify-center rounded-xl bg-alt text-ink-2 disabled:opacity-30"
            >
              <ChevronRight size={17} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {/* Initiales des mois, posees en pourcentage de la largeur : elles
          suivent la grille quand le SVG s'etire. */}
      <div className="relative mt-4 h-3.5" aria-hidden>
        {grid.months.map(({ month, column }) => (
          <span
            key={month}
            className="absolute text-[10px] font-semibold uppercase text-ink-3"
            style={{ left: `${((PAD + column * STEP) / width) * 100}%` }}
          >
            {MONTH_FMT.format(new Date(year, month, 1))}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-1 block w-full"
        role="img"
        aria-label={`${grid.activeDays} jours d’entraînement en ${year}`}
      >
        {grid.weeks.map((week, column) =>
          week.map((day, row) => {
            if (!day) return null;
            const x = PAD + column * STEP;
            const y = PAD + row * STEP;
            return (
              <g key={day.date}>
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={2.5}
                  className={
                    day.count > 0 ? 'fill-done' : day.isFuture ? 'fill-alt' : 'fill-[#E5E5EA]'
                  }
                />
                {day.isToday && (
                  <rect
                    x={x - 1.5}
                    y={y - 1.5}
                    width={CELL + 3}
                    height={CELL + 3}
                    rx={3.5}
                    fill="none"
                    strokeWidth={1.5}
                    className="stroke-accent"
                  />
                )}
              </g>
            );
          }),
        )}
      </svg>
    </div>
  );
}
