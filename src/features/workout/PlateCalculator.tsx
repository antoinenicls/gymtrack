/**
 * Calculateur de disques.
 *
 * Rendu visuel volontairement schematique : une demi-barre vue de profil avec
 * les disques empiles, parce que c'est exactement ce que l'athlete a sous les
 * yeux devant le rack. Une liste de nombres demanderait un effort de
 * traduction mentale.
 */

import { useMemo, useState } from 'react';
import { computePlates, groupPlates } from '@/lib/plates';
import { formatWeight } from '@/lib/metrics';
import { Banner, Sheet, cx } from '@/ui/primitives';

/** Hauteur relative des disques : un 25 est plus grand qu'un 1,25. */
const PLATE_HEIGHT: Record<number, number> = {
  25: 100,
  20: 92,
  15: 82,
  10: 70,
  5: 56,
  2.5: 44,
  1.25: 34,
};

const PLATE_COLOR: Record<number, string> = {
  25: 'bg-ink',
  20: 'bg-ink-2',
  15: 'bg-ink-2',
  10: 'bg-ink-3',
  5: 'bg-ink-3',
  2.5: 'bg-line-2',
  1.25: 'bg-line-2',
};

interface PlateCalculatorProps {
  open: boolean;
  onClose: () => void;
  initialWeightKg: number;
  barWeightsKg: number[];
  availablePlatesKg: number[];
}

export default function PlateCalculator({
  open,
  onClose,
  initialWeightKg,
  barWeightsKg,
  availablePlatesKg,
}: PlateCalculatorProps) {
  const [target, setTarget] = useState(String(initialWeightKg || ''));
  const [barKg, setBarKg] = useState(barWeightsKg[0] ?? 20);

  const parsed = Number(target.replace(',', '.'));
  const solution = useMemo(
    () => computePlates(Number.isFinite(parsed) ? parsed : 0, barKg, availablePlatesKg),
    [parsed, barKg, availablePlatesKg],
  );
  const grouped = groupPlates(solution.perSide);

  return (
    <Sheet open={open} onClose={onClose} title="Calculateur de disques">
      <div className="space-y-4 pb-2">
        <div>
          <label htmlFor="plate-target" className="mb-1.5 block text-[13px] font-semibold text-ink-2">
            Poids total visé
          </label>
          <input
            id="plate-target"
            type="text"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.currentTarget.value)}
            onFocus={(e) => e.currentTarget.select()}
            className="num w-full rounded-xl bg-alt px-4 py-3 text-center font-display text-[26px] font-black focus:bg-accent-soft focus:outline-none"
          />
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Barre</p>
          <div className="flex gap-2">
            {barWeightsKg.map((weight) => (
              <button
                key={weight}
                type="button"
                onClick={() => setBarKg(weight)}
                className={cx(
                  'num min-h-[44px] flex-1 rounded-xl font-display text-[15px] font-bold transition-colors duration-200',
                  barKg === weight ? 'bg-accent text-white' : 'bg-alt text-ink-2',
                )}
              >
                {formatWeight(weight)} kg
              </button>
            ))}
          </div>
        </div>

        {solution.belowBar ? (
          <Banner tone="accent">
            La cible est sous le poids de la barre à vide ({formatWeight(barKg)} kg). Il n’y a rien
            à charger.
          </Banner>
        ) : (
          <>
            {/* Schema : demi-barre + disques, du plus lourd au plus leger. */}
            <div className="rounded-xl border border-line bg-alt/60 p-4">
              <p className="mb-3 text-center text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                D’un côté
              </p>
              <div className="flex h-28 items-center justify-center gap-[3px]">
                <div className="h-2 w-8 rounded-l bg-ink-3" aria-hidden />
                {solution.perSide.length === 0 ? (
                  <p className="px-3 text-[14px] text-ink-2">Barre à vide</p>
                ) : (
                  solution.perSide.map((plate, i) => (
                    <div
                      key={`${plate}-${i}`}
                      className={cx(
                        'flex w-[18px] items-center justify-center rounded-[3px]',
                        PLATE_COLOR[plate] ?? 'bg-ink-3',
                      )}
                      style={{ height: `${PLATE_HEIGHT[plate] ?? 50}%` }}
                      title={`${formatWeight(plate)} kg`}
                    >
                      <span className="num rotate-90 whitespace-nowrap text-[9px] font-bold text-white">
                        {formatWeight(plate)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {grouped.map(({ plateKg, count }) => (
                <span
                  key={plateKg}
                  className="num rounded-pill border border-line bg-white px-3 py-1.5 text-[14px] font-bold"
                >
                  {count} × {formatWeight(plateKg)} kg
                </span>
              ))}
            </div>

            {solution.exact ? (
              <p className="num text-center text-[15px] text-ink-2">
                Total chargé :{' '}
                <span className="font-display font-black text-ink">
                  {formatWeight(solution.achievedKg)} kg
                </span>
              </p>
            ) : (
              <Banner tone="pr">
                Ce poids exact n’est pas atteignable avec tes disques. Le plus proche est{' '}
                <strong className="num">{formatWeight(solution.achievedKg)} kg</strong>, soit{' '}
                {solution.deltaKg > 0 ? '+' : ''}
                <span className="num">{formatWeight(solution.deltaKg)}</span> kg.
              </Banner>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
