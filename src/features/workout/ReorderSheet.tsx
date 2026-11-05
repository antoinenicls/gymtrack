/**
 * Remise en ordre des exercices d'une seance, en cours comme en modification.
 *
 * Une LISTE COMPACTE, pas les blocs de la seance. Deplacer un exercice depuis
 * son menu « … » demandait trois appuis et cachait l'essentiel : on ne voyait
 * pas ou le mouvement atterrissait par rapport aux autres. Ici toute la seance
 * tient a l'ecran, et chaque appui montre le resultat immediatement.
 *
 * Fleches et non glisser-deposer, pour la meme raison que dans « Personnaliser
 * l'analyse » : un glisser dans une feuille qui defile oblige a distinguer
 * « je deplace » de « je fais defiler ». Deux fleches ne se devinent pas.
 */

import { ArrowDown, ArrowUp } from 'lucide-react';
import { Sheet, cx } from '@/ui/primitives';
import { SupersetTag } from '@/ui/SupersetGroup';

export interface ReorderItem {
  id: string;
  name: string;
  /** Ligne secondaire : nombre de series, repos… */
  detail: string;
  /** Rang dans le superset (« A1 »), ou null hors superset. */
  supersetTag: string | null;
}

export default function ReorderSheet({
  open,
  onClose,
  items,
  onMove,
}: {
  open: boolean;
  onClose: () => void;
  /** Dans l'ordre affiche a l'ecran. */
  items: ReorderItem[];
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Ordre des exercices">
      <ul className="space-y-2 pb-2">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-xl border border-line bg-white p-2.5"
          >
            {/* Le rang est le repere qui manquait : il dit ou on en est dans la
                seance, et il change sous le doigt a chaque deplacement. */}
            <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-alt font-display text-[15px] font-extrabold text-ink-2">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                {/* Le rang de superset suit l'exercice : casser un enchainement
                    en le deplacant doit se voir ici, pas se decouvrir apres. */}
                <SupersetTag tag={item.supersetTag} />
                <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{item.name}</p>
              </div>
              <p className="text-[12px] leading-snug text-ink-2">{item.detail}</p>
            </div>

            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => onMove(item.id, -1)}
                disabled={index === 0}
                aria-label={`Monter ${item.name}`}
                className={cx(
                  'pressable flex h-8 w-9 items-center justify-center rounded-t-lg',
                  'bg-alt text-ink-2 disabled:opacity-30',
                )}
              >
                <ArrowUp size={15} strokeWidth={2.6} />
              </button>
              <button
                type="button"
                onClick={() => onMove(item.id, 1)}
                disabled={index === items.length - 1}
                aria-label={`Descendre ${item.name}`}
                className={cx(
                  'pressable mt-px flex h-8 w-9 items-center justify-center rounded-b-lg',
                  'bg-alt text-ink-2 disabled:opacity-30',
                )}
              >
                <ArrowDown size={15} strokeWidth={2.6} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
