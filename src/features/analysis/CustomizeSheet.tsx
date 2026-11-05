/**
 * Rangement de l'ecran Analyse : ce qu'on garde, et dans quel ordre.
 *
 * Reordonnancement par FLECHES et non par glisser-deposer. Un glisser-deposer
 * a l'interieur d'une feuille qui defile demande de distinguer « je deplace
 * une carte » de « je fais defiler la liste ». C'est l'ambiguite qui
 * rendait la suppression d'une serie penible. Deux fleches ne se devinent
 * pas : elles se voient.
 */

import { ArrowDown, ArrowUp, Eye, EyeOff } from 'lucide-react';
import type { Settings } from '@/types/domain';
import { Button, Sheet, cx } from '@/ui/primitives';
import { DEFAULT_HIDDEN, hiddenIds, type AnalysisCardDef } from './cards';

export default function CustomizeSheet({
  open,
  onClose,
  cards,
  settings,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  /** Toutes les cartes pertinentes, masquees comprises. */
  cards: AnalysisCardDef[];
  settings: Settings;
  onChange: (patch: Partial<Settings> | ((prev: Settings) => Partial<Settings>)) => void;
}) {
  const hidden = hiddenIds(settings);

  /**
   * L'ordre affiche ici fait foi et devient l'ordre enregistre.
   *
   * On repart de la liste TELLE QU'ELLE EST RENDUE, cartes masquees
   * comprises : enregistrer un ordre partiel ferait remonter les cartes
   * masquees en tete le jour ou on les reaffiche.
   */
  const order = cards.map((card) => card.id);

  /**
   * Les deux gestes partent de `prev` et non des props.
   *
   * Lire les reglages recus en props, c'est lire leur valeur au dernier rendu.
   * Deux appuis plus rapproches qu'un redessin de l'ecran Analyse partagent
   * alors le meme etat de depart, calculent le meme patch, et l'un des deux ne
   * fait rien : masquer puis reafficher laissait la carte masquee. Bug
   * reellement vecu, et invisible sur une machine rapide.
   */
  const move = (index: number, direction: -1 | 1): void => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;

    onChange((prev) => {
      // L'ordre enregistre fait foi quand il decrit les memes cartes que
      // celles affichees ; sinon la liste rendue reste la seule reference.
      const stored = prev.analysisOrder;
      const base =
        stored && stored.length === order.length && order.every((id) => stored.includes(id))
          ? [...stored]
          : [...order];

      const moved = base[index];
      const swapped = base[target];
      if (moved === undefined || swapped === undefined) return {};
      base[index] = swapped;
      base[target] = moved;

      return { analysisOrder: base };
    });
  };

  const toggle = (id: string): void => {
    onChange((prev) => {
      const next = new Set(hiddenIds(prev));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // L'ordre est enregistre en meme temps : c'est ce qui fait qu'une carte
      // masquee par defaut, une fois affichee, le reste.
      return { analysisHidden: [...next], analysisOrder: prev.analysisOrder ?? order };
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Personnaliser l’analyse"
      footer={
        <Button
          full
          variant="secondary"
          onClick={() => onChange({ analysisHidden: DEFAULT_HIDDEN, analysisOrder: [] })}
        >
          Rétablir l’affichage par défaut
        </Button>
      }
    >
      <ul className="space-y-2 pb-2">
        {cards.map((card, index) => {
          const isHidden = hidden.has(card.id);

          // Carte masquee : on TEINTE chaque element plutot que de poser une
          // opacite sur toute la ligne. Un fondu uniforme eclaircit un titre
          // presque noir sans jamais le rendre gris, et l'etat se devinait au
          // lieu de se lire. Ici le titre passe en gris franc, la pastille de
          // l'oeil perd sa couleur d'accent, et le fond de la ligne s'efface.
          return (
            <li
              key={card.id}
              className={cx(
                'flex items-center gap-2 rounded-xl border p-2.5 transition-colors duration-200',
                isHidden ? 'border-line bg-alt/60' : 'border-line bg-white',
              )}
            >
              <button
                type="button"
                onClick={() => toggle(card.id)}
                aria-pressed={!isHidden}
                aria-label={isHidden ? `Afficher ${card.title}` : `Masquer ${card.title}`}
                className={cx(
                  'pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                  isHidden ? 'bg-line text-ink-3' : 'bg-accent-soft text-accent',
                )}
              >
                {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={cx(
                    'text-[15px] font-semibold transition-colors duration-200',
                    isHidden ? 'text-ink-3' : 'text-ink',
                  )}
                >
                  {card.title}
                </p>
                <p
                  className={cx(
                    'text-[12px] leading-snug transition-colors duration-200',
                    isHidden ? 'text-ink-3' : 'text-ink-2',
                  )}
                >
                  {card.description}
                </p>
              </div>

              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Monter ${card.title}`}
                  className="pressable flex h-8 w-9 items-center justify-center rounded-t-lg bg-alt text-ink-2 disabled:opacity-30"
                >
                  <ArrowUp size={15} strokeWidth={2.6} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === cards.length - 1}
                  aria-label={`Descendre ${card.title}`}
                  className="pressable mt-px flex h-8 w-9 items-center justify-center rounded-b-lg bg-alt text-ink-2 disabled:opacity-30"
                >
                  <ArrowDown size={15} strokeWidth={2.6} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
