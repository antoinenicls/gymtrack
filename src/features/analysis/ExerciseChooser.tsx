/**
 * Choix de l'exercice analyse.
 *
 * Une rangee de pastilles qui defilait horizontalement tenait lieu de
 * selecteur. Elle plafonnait a douze mouvements, imposait de faire glisser
 * pour lire, et ne permettait pas d'atteindre directement celui qu'on a en
 * tete. Ici : un bouton qui ouvre une feuille, une recherche, des filtres par
 * muscle.
 *
 * Distinct du selecteur de la seance, et volontairement : celui-ci choisit UN
 * exercice, ne propose pas d'en creer (un mouvement sans historique n'a rien a
 * montrer sur une courbe), et ne liste que ceux REELLEMENT travailles.
 */

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import type { Exercise, MuscleGroup } from '@/types/domain';
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from '@/data/seedExercises';
import type { TrainedExercise } from '@/lib/analytics';
import { normalizeText } from '@/lib/text';
import { Chip, Sheet, cx } from '@/ui/primitives';

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });

export interface ChoosableExercise extends TrainedExercise {
  exercise: Exercise;
}

export default function ExerciseChooser({
  items,
  selectedId,
  onSelect,
}: {
  /** Deja tries : les plus travailles en premier. */
  items: ChoosableExercise[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'tous'>('tous');

  // Rouvrir sur les criteres du dernier passage donnerait une liste amputee
  // sans qu'on se souvienne pourquoi.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setGroup('tous');
  }, [open]);

  const current = items.find((item) => item.id === selectedId) ?? items[0];

  const groups = useMemo(() => {
    const present = new Set(items.map((item) => item.exercise.muscleGroup));
    return MUSCLE_GROUP_ORDER.filter((g) => present.has(g));
  }, [items]);

  const filtered = useMemo(() => {
    const needle = normalizeText(query);
    return items.filter((item) => {
      if (group !== 'tous' && item.exercise.muscleGroup !== group) return false;
      return needle === '' || normalizeText(item.exercise.name).includes(needle);
    });
  }, [items, query, group]);

  if (!current) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable pressable-wide mb-2 flex min-h-[52px] w-full items-center gap-3 rounded-xl bg-alt px-3.5 py-2.5 text-left active:bg-line-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-bold">{current.exercise.name}</span>
          <span className="block text-[13px] text-ink-2">{sessionLabel(current)}</span>
        </span>
        <ChevronDown size={18} strokeWidth={2.4} className="shrink-0 text-ink-3" />
      </button>

      {/* `tall` pour la meme raison qu'au selecteur de la seance : une feuille
          qui porte une recherche ne doit pas changer de hauteur quand la liste
          se filtre, sinon le champ descend sous le clavier. */}
      <Sheet open={open} onClose={() => setOpen(false)} title="Choisir un exercice" tall>
        {/* Meme construction que le selecteur de la seance : voir le commentaire
            detaille dans ExercisePicker pour le pourquoi du z-10 et des marges
            negatives, qui evitent que les lignes defilent par-dessus. */}
        <div className="sticky -top-3 z-10 -mx-4 -mt-3 bg-white px-4 pb-3 pt-3">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="Rechercher un exercice"
              aria-label="Rechercher un exercice"
              className="w-full rounded-xl bg-alt py-3 pl-10 pr-3 text-[16px] focus:bg-accent-soft focus:outline-none"
            />
          </div>

          {groups.length > 1 && (
            <div className="scroll-area -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1">
              <Chip active={group === 'tous'} onClick={() => setGroup('tous')}>
                Tous
              </Chip>
              {groups.map((g) => (
                <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
                  {MUSCLE_GROUP_LABELS[g]}
                </Chip>
              ))}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-[15px] text-ink-2">Aucun exercice ne correspond.</p>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((item) => {
              const isSelected = item.id === current.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      setOpen(false);
                    }}
                    aria-pressed={isSelected}
                    className="pressable pressable-wide flex min-h-[56px] w-full items-center gap-3 py-2 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={cx(
                          'block truncate text-[16px] font-semibold',
                          isSelected && 'text-accent',
                        )}
                      >
                        {item.exercise.name}
                      </span>
                      <span className="block text-[13px] text-ink-2">
                        {MUSCLE_GROUP_LABELS[item.exercise.muscleGroup]} · {sessionLabel(item)}
                      </span>
                    </span>
                    {isSelected && (
                      <Check size={18} strokeWidth={2.8} className="shrink-0 text-accent" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>
    </>
  );
}

/**
 * « 12 séances · dernière le 14/07 ».
 *
 * Le compte est annonce AVANT le choix : sous deux seances aucune courbe ne se
 * dessine, et decouvrir un graphique vide apres avoir tape est une perte de
 * temps que la liste peut eviter.
 */
function sessionLabel(item: ChoosableExercise): string {
  const seances = `${item.sessions} séance${item.sessions > 1 ? 's' : ''}`;
  return item.sessions < 2
    ? `${seances} · pas encore de courbe`
    : `${seances} · dernière le ${DATE_FMT.format(item.lastAt)}`;
}

