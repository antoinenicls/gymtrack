/**
 * Graphiques en SVG ecrit a la main.
 *
 * Choix explicite du brief : pas de librairie de charts. Le rendu reste net
 * a toutes les densites d'ecran, pese zero kilo-octet de dependance et
 * fonctionne hors ligne sans reserve.
 */

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cx } from './primitives';

export interface Point {
  x: number;
  y: number;
  label?: string;
}

const PAD = { top: 12, right: 10, bottom: 22, left: 34 };

/**
 * Courbe avec aire sous la ligne.
 *
 * Le trace se dessine a l'apparition (`pathLength={1}` normalise la longueur
 * du chemin, ce qui evite d'aller la mesurer en JavaScript apres le montage).
 *
 * Un appui sur le graphique epingle le point le plus proche et affiche sa
 * valeur : sur un telephone, il n'y a pas de survol, et une courbe sans
 * chiffres lisibles ne dit que « ca monte », ce qui ne suffit pas pour
 * decider de charger la barre.
 */
export function LineChart({
  points,
  height = 170,
  unit = '',
  className,
  formatValue,
  formatPoint,
  animate = true,
}: {
  points: Point[];
  height?: number;
  unit?: string;
  className?: string;
  /** Mise en forme des graduations. Par defaut, un arrondi compact. */
  formatValue?: (value: number) => string;
  /** Contenu de la bulle au toucher. Par defaut, la valeur seule. */
  formatPoint?: (point: Point) => string;
  animate?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 320;

  const geometry = useMemo(() => {
    if (points.length === 0) return null;

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    // Une courbe plate ne doit pas diviser par zero ni coller au bord haut.
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanY = maxY - minY || Math.max(1, maxY * 0.1);
    const spanX = maxX - minX || 1;

    const plotW = width - PAD.left - PAD.right;
    const plotH = height - PAD.top - PAD.bottom;

    const toX = (x: number): number => PAD.left + ((x - minX) / spanX) * plotW;
    const toY = (y: number): number => PAD.top + plotH - ((y - minY) / spanY) * plotH;

    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x)},${toY(p.y)}`).join(' ');

    return {
      minX,
      maxX,
      minY,
      spanY,
      plotH,
      toX,
      toY,
      path,
      area: `${path} L${toX(maxX)},${PAD.top + plotH} L${toX(minX)},${PAD.top + plotH} Z`,
      ticks: [minY, minY + spanY / 2, minY + spanY],
    };
  }, [points, height]);

  if (geometry === null) return <EmptyChart height={height} />;

  const tick = formatValue ?? formatTick;
  const active = activeIndex !== null ? points[activeIndex] : undefined;

  /**
   * Point le plus proche du doigt, en coordonnees relatives.
   *
   * On repasse par la largeur reelle du conteneur plutot que par les unites du
   * viewBox : le SVG est etire (`preserveAspectRatio="none"`), donc un pixel
   * d'ecran ne vaut pas une unite de viewBox.
   */
  const pick = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;

    const ratio = (event.clientX - box.left) / box.width;
    const target = geometry.minX + ratio * (geometry.maxX - geometry.minX);

    let best = 0;
    let bestDistance = Infinity;
    points.forEach((p, index) => {
      const distance = Math.abs(p.x - target);
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    setActiveIndex(best);
  };

  return (
    <div
      className="relative touch-pan-y select-none"
      onPointerDown={pick}
      onPointerMove={(event) => {
        if (event.buttons > 0 || event.pointerType === 'touch') pick(event);
      }}
      onPointerLeave={() => setActiveIndex(null)}
      onPointerUp={() => setActiveIndex(null)}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={cx('w-full', className)}
        role="img"
        aria-label="Graphique d’évolution"
        preserveAspectRatio="none"
      >
        {geometry.ticks.map((value) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={geometry.toY(value)}
              y2={geometry.toY(value)}
              stroke="rgba(0,0,0,.07)"
              strokeWidth={1}
            />
            <text x={2} y={geometry.toY(value) + 3.5} fontSize={9} fill="#B0B0B8">
              {tick(value)}
              {unit}
            </text>
          </g>
        ))}

        <path d={geometry.area} fill="rgba(10,132,255,.09)" className={cx(animate && 'animate-fade-in')} />
        <path
          d={geometry.path}
          fill="none"
          stroke="#0A84FF"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          className={cx(animate && 'animate-draw')}
        />

        {activeIndex !== null && active && (
          <line
            x1={geometry.toX(active.x)}
            x2={geometry.toX(active.x)}
            y1={PAD.top}
            y2={PAD.top + geometry.plotH}
            stroke="#0A84FF"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {points.map((p, i) => (
          <circle
            key={i}
            cx={geometry.toX(p.x)}
            cy={geometry.toY(p.y)}
            r={i === activeIndex ? 4 : 2.6}
            fill={i === activeIndex ? '#0A84FF' : '#fff'}
            stroke="#0A84FF"
            strokeWidth={1.6}
          />
        ))}
      </svg>

      {/* Bulle en HTML et non en <text> : le SVG etire deformerait les
          caracteres horizontalement. Un pourcentage se moque de l'etirement. */}
      {active && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 animate-scale-in"
          style={{
            left: `${clamp((geometry.toX(active.x) / width) * 100, 14, 86)}%`,
          }}
        >
          <span className="num whitespace-nowrap rounded-pill bg-ink px-2.5 py-1 text-[12px] font-bold text-white shadow-sm">
            {formatPoint ? formatPoint(active) : `${tick(active.y)}${unit}`}
          </span>
        </div>
      )}
    </div>
  );
}

/** Histogramme horizontal, pour le volume par groupe musculaire. */
export function BarList({
  items,
  formatValue,
}: {
  items: Array<{ label: string; value: number }>;
  formatValue: (value: number) => string;
}) {
  if (items.length === 0) return <EmptyChart height={120} />;
  const max = Math.max(...items.map((i) => i.value)) || 1;

  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={item.label} className="animate-item-in" style={{ animationDelay: `${index * 40}ms` }}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-[14px] font-medium">{item.label}</span>
            <span className="num shrink-0 text-[13px] font-bold text-ink-2">
              {formatValue(item.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-pill bg-alt">
            <div
              className="h-full rounded-pill bg-accent transition-[width] duration-500 ease-ease"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Barres situees par rapport a une ZONE de reference plutot qu'au maximum
 * observe.
 *
 * Une barre relative au plus gros poste ne dit rien d'utile : le groupe le
 * plus travaille est toujours a 100 %, meme si tout le programme est trop
 * leger. Ici l'echelle est absolue et la zone visee reste dessinee en fond,
 * donc chaque barre se lit seule : en dessous, dedans, au-dessus.
 */
export function TargetBarList({
  items,
  zone,
  formatValue,
}: {
  items: Array<{ label: string; value: number; hint?: string }>;
  zone: { from: number; to: number };
  formatValue: (value: number) => string;
}) {
  if (items.length === 0) return <EmptyChart height={120} />;

  const scale = Math.max(zone.to * 1.15, ...items.map((i) => i.value * 1.05));
  const pct = (value: number): number => Math.min(100, (value / scale) * 100);

  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const below = item.value < zone.from;
        const above = item.value > zone.to;
        return (
          <li
            key={item.label}
            className="animate-item-in"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-[14px] font-medium">{item.label}</span>
              <span
                className={cx(
                  'num shrink-0 text-[13px] font-bold',
                  below ? 'text-ink-3' : above ? 'text-pr' : 'text-done',
                )}
              >
                {formatValue(item.value)}
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-pill bg-alt">
              <div
                className="absolute inset-y-0 bg-done-soft"
                style={{ left: `${pct(zone.from)}%`, width: `${pct(zone.to) - pct(zone.from)}%` }}
              />
              <div
                className={cx(
                  'absolute inset-y-0 left-0 rounded-pill transition-[width] duration-500 ease-ease',
                  below ? 'bg-ink-3' : above ? 'bg-pr' : 'bg-done',
                )}
                style={{ width: `${Math.max(2, pct(item.value))}%` }}
              />
            </div>
            {item.hint && <p className="mt-1 text-[12px] text-ink-3">{item.hint}</p>}
          </li>
        );
      })}
    </ul>
  );
}

/** Colonnes verticales, pour le nombre de seances par semaine. */
export function ColumnChart({
  items,
  height = 130,
  goal,
}: {
  items: Array<{ label: string; value: number; highlight?: boolean }>;
  height?: number;
  /** Repere horizontal, par exemple l'objectif hebdomadaire. */
  goal?: number;
}) {
  if (items.length === 0) return <EmptyChart height={height} />;
  const max = Math.max(...items.map((i) => i.value), goal ?? 0) || 1;
  const barZone = height - 34;
  const labelStep = Math.max(1, Math.ceil(items.length / 6));

  return (
    <div className="relative" style={{ height }}>
      {goal !== undefined && goal > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/50"
          style={{ bottom: `${16 + (goal / max) * barZone}px` }}
        >
          <span className="num absolute right-0 -top-4 text-[10px] font-bold text-accent">
            objectif {goal}
          </span>
        </div>
      )}
      <div className="flex h-full items-end gap-1.5">
        {items.map((item, index) => (
          // min-w-0 est indispensable : sans lui, une colonne refuse de
          // retrecir sous la largeur de son libelle, et douze semaines font
          // sortir l'histogramme de l'ecran.
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="num text-[11px] font-bold text-ink-2">{item.value || ''}</span>
            <div
              className={cx(
                'w-full rounded-t-md transition-[height] duration-500 ease-ease',
                item.highlight ? 'bg-accent' : 'bg-accent/45',
              )}
              style={{
                height: `${Math.max(2, (item.value / max) * barZone)}px`,
                transitionDelay: `${index * 25}ms`,
              }}
            />
            {/* Une date sur N : a douze colonnes, les libelles se chevauchent
                et aucun n'est lisible. On garde des reperes espaces, dont le
                dernier, qui est celui qu'on cherche en premier. */}
            <span className="truncate text-[10px] text-ink-3">
              {index % labelStep === 0 || index === items.length - 1 ? item.label : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Calendrier des jours travailles, une ligne par semaine.
 *
 * Lu d'un coup d'oeil, il montre ce qu'aucune moyenne ne montre : les trous.
 * Trois seances par semaine tassees sur trois jours d'affilee puis quatre
 * jours de rien, ce n'est pas la meme chose qu'un jour sur deux.
 */
export function TrainingHeatmap({
  weeks,
  formatDay,
}: {
  weeks: Array<{ start: number; days: Array<{ at: number; count: number; isFuture: boolean }> }>;
  formatDay: (at: number) => string;
}) {
  if (weeks.length === 0) return <EmptyChart height={120} />;

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
          <span key={index} className="text-center text-[10px] font-bold text-ink-3">
            {day}
          </span>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week) => (
          <div key={week.start} className="grid grid-cols-7 gap-1">
            {week.days.map((day) => (
              <div
                key={day.at}
                title={`${formatDay(day.at)} · ${day.count} séance${day.count > 1 ? 's' : ''}`}
                className={cx(
                  'aspect-square rounded-md transition-colors duration-300',
                  day.isFuture
                    ? 'bg-alt/50'
                    : day.count === 0
                      ? 'bg-alt'
                      : day.count === 1
                        ? 'bg-accent/55'
                        : 'bg-accent',
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyChart({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-alt/60 text-[13px] text-ink-3"
      style={{ height }}
    >
      Pas encore assez de données.
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatTick(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(Math.round(value));
}
