/**
 * Menu d'une serie : son type, et sa suppression.
 *
 * Il s'ouvre en touchant la PASTILLE de la serie, celle qui porte son numero.
 * C'est deja le geste appris pour poser un echauffement, et la pastille
 * designe sans ambiguite la ligne concernee, ce qu'aucun bouton en bout de
 * ligne ne fait aussi clairement quand quatre series se suivent.
 *
 * Remplace le glissement de droite a gauche : un geste qu'il fallait deviner,
 * qui n'affichait rien tant qu'on ne l'avait pas commence, et qui supprimait
 * au-dela d'un certain elan. Ici l'action est ecrite, on la lit avant de la
 * declencher, et une serie deja validee demande une confirmation.
 */

import { BetweenHorizontalStart, Check, CornerDownRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { SetType } from '@/types/domain';
import { cx } from '@/ui/primitives';

interface Option {
  type: Exclude<SetType, 'normale' | 'myo'>;
  letter: string;
  label: string;
  hint: string;
  tone: string;
}

const OPTIONS: Option[] = [
  {
    type: 'echauffement',
    letter: 'W',
    label: 'Échauffement',
    hint: 'Ne compte ni dans le volume ni dans les records.',
    tone: 'bg-pr-soft text-pr',
  },
  {
    type: 'drop',
    letter: 'D',
    label: 'Dégressive',
    hint: 'Charge allégée enchaînée sans repos.',
    tone: 'bg-accent-soft text-accent',
  },
];

export default function SetMenu({
  current,
  toFailure,
  dropStart,
  canDetach,
  setNumber,
  onSelect,
  onToggleFailure,
  onToggleDropStart,
  onClose,
  onInsertBefore,
  onDelete,
  canDelete = true,
  /** Une serie deja validee porte un resultat : on demande confirmation. */
  confirmDelete = false,
}: {
  current: SetType;
  /** Menee a l'echec, independamment du type. */
  toFailure: boolean;
  /** Ouvre une nouvelle descente au lieu de prolonger celle du dessus. */
  dropStart: boolean;
  /** Vrai seulement si la serie du dessus est elle aussi une degressive. */
  canDetach: boolean;
  setNumber: number;
  onSelect: (type: SetType) => void;
  onToggleFailure: () => void;
  onToggleDropStart: () => void;
  onClose: () => void;
  /** Absent = le menu ne propose pas d'insertion. */
  onInsertBefore?: () => void;
  /** Absent = le menu ne propose pas de suppression. */
  onDelete?: () => void;
  canDelete?: boolean;
  confirmDelete?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  // Portail sur le body, pour la meme raison que Sheet : sinon la barre
  // d'onglets se peint par-dessus sur Safari iOS.
  return createPortal(
    <div
      className="fixed left-0 right-0 top-0 z-[110] flex items-center justify-center px-8"
      style={{ height: 'var(--vh)' }}
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/25 animate-fade-in"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Série ${setNumber}`}
        className="relative w-full max-w-[320px] overflow-hidden rounded-[20px] bg-white animate-scale-in"
      >
        <p className="border-b border-line px-4 py-3 text-center font-display text-[15px] font-extrabold">
          Série {setNumber}
        </p>

        <ul className="divide-y divide-line">
          {OPTIONS.map((option) => {
            const active = current === option.type;
            return (
              <li key={option.type}>
                <button
                  type="button"
                  onClick={() => {
                    // Retaper le type actif revient a une serie normale.
                    onSelect(active ? 'normale' : option.type);
                    onClose();
                  }}
                  className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left active:bg-alt"
                >
                  <span
                    className={cx(
                      'num flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-[15px] font-extrabold',
                      option.tone,
                    )}
                  >
                    {option.letter}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{option.label}</span>
                    <span className="block text-[12px] leading-snug text-ink-2">{option.hint}</span>
                  </span>
                  {active && <Check size={18} strokeWidth={2.6} className="shrink-0 text-accent" />}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Separation de deux descentes qui s'enchainent.
            N'apparait QUE si la serie du dessus est elle aussi une degressive,
            parce que c'est le seul cas ou la question se pose. Deux descentes
            de deux paliers sont positionnellement identiques a une descente de
            quatre : aucune regle ne peut trancher, seule l'intention le peut,
            et c'est ici qu'on la recueille. */}
        {canDetach && (
          <button
            type="button"
            onClick={onToggleDropStart}
            aria-pressed={dropStart}
            className="flex min-h-[60px] w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left active:bg-alt"
          >
            <span
              className={cx(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                dropStart ? 'bg-accent text-white' : 'bg-alt text-ink-3',
              )}
            >
              <CornerDownRight size={17} strokeWidth={2.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Nouvelle dégressive</span>
              <span className="block text-[12px] leading-snug text-ink-2">
                {dropStart
                  ? 'Commence une descente à part, avec un repos avant elle.'
                  : 'Prolonge la descente du dessus. Touche pour en commencer une autre.'}
              </span>
            </span>
            {dropStart && <Check size={18} strokeWidth={2.6} className="shrink-0 text-accent" />}
          </button>
        )}

        {/* « À l'échec » N'EST PLUS un type mais une bascule.
            Il l'etait, donc il excluait « dégressive » : impossible de dire
            qu'une descente etait menee jusqu'a l'echec, alors que c'est
            precisement ce qu'on fait d'une degressive. Les deux se cumulent
            desormais. */}
        <button
          type="button"
          onClick={onToggleFailure}
          aria-pressed={toFailure}
          className="flex min-h-[60px] w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left active:bg-alt"
        >
          <span
            className={cx(
              'num flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-[15px] font-extrabold',
              toFailure ? 'bg-red-50 text-red-600' : 'bg-alt text-ink-3',
            )}
          >
            F
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">À l’échec</span>
            <span className="block text-[12px] leading-snug text-ink-2">
              Menée jusqu’à ne plus pouvoir conclure une répétition. Se cumule avec le type.
            </span>
          </span>
          {toFailure && <Check size={18} strokeWidth={2.6} className="shrink-0 text-accent" />}
        </button>

        <p className="border-t border-line px-4 py-2.5 text-center text-[12px] leading-snug text-ink-3">
          {current === 'normale'
            ? 'Série normale pour l’instant.'
            : 'Touche à nouveau le type actif pour revenir à une série normale.'}
        </p>

        {/* Insertion au milieu de la liste.
            Elle vit ICI, et nulle part sur l'ecran de seance : un bouton entre
            chaque ligne aurait double la hauteur du tableau pour un geste rare.
            La pastille ouvre deja ce menu, et le menu designe deja la ligne
            concernee, donc « au-dessus de celle-ci » se lit sans ambiguite.
            Un seul sens : le bout de liste reste au bouton d'ajout. */}
        {onInsertBefore && (
          <button
            type="button"
            onClick={() => {
              onInsertBefore();
              onClose();
            }}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 border-t border-line font-display text-[15px] font-bold text-accent active:bg-accent-soft"
          >
            <BetweenHorizontalStart size={17} strokeWidth={2.2} />
            Insérer une série au-dessus
          </button>
        )}

        {onDelete && (
          <div className="border-t border-line">
            {confirming ? (
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="min-h-[52px] flex-1 border-r border-line font-display text-[15px] font-bold text-ink-2 active:bg-alt"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    onClose();
                  }}
                  className="min-h-[52px] flex-1 font-display text-[15px] font-bold text-red-600 active:bg-red-50"
                >
                  Supprimer
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!canDelete}
                onClick={() => {
                  if (confirmDelete) return setConfirming(true);
                  onDelete();
                  onClose();
                }}
                className={cx(
                  'flex min-h-[52px] w-full items-center justify-center gap-2',
                  'font-display text-[15px] font-bold text-red-600 active:bg-red-50',
                  'disabled:text-ink-3 disabled:active:bg-transparent',
                )}
              >
                <Trash2 size={17} strokeWidth={2.2} />
                {canDelete ? 'Supprimer la série' : 'Dernière série de l’exercice'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
