/**
 * Bloc d'un exercice dans la seance en cours.
 *
 * Reprend la presentation de la capture : nom en accent avec ses deux boutons
 * a droite, note en bandeau surligne, tableau de series, bouton d'ajout.
 */

import { Link2, MoreHorizontal, StickyNote } from 'lucide-react';
import type { Exercise, WorkoutEntry, WorkoutSet } from '@/types/domain';
import { cx } from '@/ui/primitives';
import { SupersetTag } from '@/ui/SupersetGroup';
import { RestBetweenSets } from '@/ui/RestBetweenSets';
import { DropGroup } from '@/ui/DropGroup';
import { setGroups, setNumbers } from '@/lib/dropset';
import { isToFailure } from '@/lib/setTypes';
import ExerciseNote from './ExerciseNote';
import SetRow from './SetRow';

interface ExerciseBlockProps {
  entry: WorkoutEntry;
  exercise: Exercise | undefined;
  /** Series de la derniere seance sur cet exercice, rang par rang. */
  previousSets: WorkoutSet[];
  showRpe: boolean;
  /** Vrai si ce bloc est enchaine avec le precedent. */
  linkedToPrevious: boolean;
  /** Rang dans le superset (« A1 »), ou null hors superset. */
  supersetTag?: string | null;
  canLink: boolean;
  /** Ouvre la fiche du mouvement, depuis son nom. */
  onOpenDetail: () => void;
  onOpenMenu: () => void;
  onToggleSuperset: () => void;
  onAddSet: () => void;
  onChangeSet: (setId: string, patch: Partial<WorkoutSet>) => void;
  onOpenSetMenu: (setId: string) => void;
  onToggleSetDone: (setId: string) => void;
  onChangeNotes: (notes: string) => void;
}

export default function ExerciseBlock({
  entry,
  exercise,
  previousSets,
  showRpe,
  linkedToPrevious,
  supersetTag = null,
  canLink,
  onOpenDetail,
  onOpenMenu,
  onToggleSuperset,
  onAddSet,
  onChangeSet,
  onOpenSetMenu,
  onToggleSetDone,
  onChangeNotes,
}: ExerciseBlockProps) {
  return (
    <article
      className={cx(
        'bg-white',
        // Le filet du superset n'est PAS dessine ici : c'est le conteneur du
        // groupe qui le trace, une seule fois, sinon il se rompt entre chaque
        // bloc et l'ensemble ne se lit plus comme une unite (cf. SessionPage).
        // Un exercice enchaine se serre contre le precedent, sans separateur.
        // `border-line` sans modificateur d'opacite : le jeton porte deja son
        // alpha, et un `/60` le REMPLACE au lieu de l'attenuer : le separateur
        // interne virait au noir a 60 %.
        linkedToPrevious ? 'border-t border-line pt-2' : 'pt-4',
      )}
    >
      <header className="flex items-center gap-2 px-3 pb-1">
        {/* Rang dans le superset. Ce que le coach ecrit « A1 », et ce qui dit
            d'un coup d'oeil a quel groupe cet exercice appartient. */}
        <SupersetTag tag={supersetTag} />
        {/* Le nom OUVRE la fiche du mouvement. C'est le seul element de la
            ligne qui designe l'exercice lui-meme plutot que sa place dans la
            seance, et il est deja en couleur d'accent : il se lisait comme un
            lien sans en etre un. Sur un exercice supprime de la bibliotheque,
            il n'y a plus de fiche a montrer, donc plus de bouton. */}
        {exercise ? (
          <button
            type="button"
            onClick={onOpenDetail}
            className="min-w-0 flex-1 truncate text-left"
          >
            <h3 className="truncate font-display text-[17px] font-extrabold tracking-[-0.03em] text-accent">
              {exercise.name}
            </h3>
          </button>
        ) : (
          <h3 className="min-w-0 flex-1 truncate font-display text-[17px] font-extrabold tracking-[-0.03em] text-ink-3">
            Exercice supprimé
          </h3>
        )}

        {canLink && (
          <button
            type="button"
            onClick={onToggleSuperset}
            aria-label={linkedToPrevious ? 'Détacher du superset' : 'Lier en superset'}
            aria-pressed={linkedToPrevious}
            className={cx(
              'flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200',
              linkedToPrevious ? 'bg-accent text-white' : 'bg-accent-soft text-accent',
            )}
          >
            <Link2 size={17} strokeWidth={2.4} />
          </button>
        )}

        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Options de l’exercice"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent"
        >
          <MoreHorizontal size={18} strokeWidth={2.4} />
        </button>
      </header>

      {/* Note attachee au MOUVEMENT, pas a cette seance : reglages de machine,
          repere de prise. En lecture seule ici, discrete, et distincte du
          bandeau surligne dessous qui porte la note du jour. Elle se modifie
          depuis la fiche de l'exercice, la ou elle a ete ecrite. */}
      {exercise?.notes && (
        <p className="mx-3 mb-1.5 flex items-start gap-1.5 text-[13px] leading-relaxed text-ink-2">
          <StickyNote size={14} strokeWidth={2.2} className="mt-0.5 shrink-0 text-ink-3" />
          <span className="min-w-0">{exercise.notes}</span>
        </p>
      )}

      {/* Note du jour en bandeau surligne, comme dans la capture. */}
      <ExerciseNote
        value={entry.notes}
        onChange={onChangeNotes}
        placeholder="Ta note sur cet exercice"
      />

      {/* En-tete de colonnes */}
      <div
        className="grid items-center gap-1.5 px-3 pb-1 pt-1.5"
        style={{
          gridTemplateColumns: showRpe
            ? '34px minmax(0,1fr) 58px 50px 44px 44px'
            : '34px minmax(0,1fr) 66px 58px 44px',
        }}
      >
        <ColumnHead>Série</ColumnHead>
        <ColumnHead>Précédent</ColumnHead>
        <ColumnHead>kg</ColumnHead>
        <ColumnHead>Reps</ColumnHead>
        {showRpe && <ColumnHead>RPE</ColumnHead>}
        <ColumnHead className="text-right pr-2">✓</ColumnHead>
      </div>

      {/* Les series sont rendues par GROUPES, et non a plat.
          Un groupe vaut une serie : les paliers d'une degressive y tiennent
          ensemble, encadres, sans repos ni numero entre eux. Le repos ne se
          decide donc plus entre deux lignes mais entre deux groupes, ce qui le
          rend juste par construction. */}
      <div>
        {(() => {
          const numbers = setNumbers(entry.sets);
          const groups = setGroups(entry.sets);
          let index = -1;

          return groups.map((group, groupIndex) => {
            const previousGroup = groups[groupIndex - 1];
            const previousSet = previousGroup?.[previousGroup.length - 1];
            // On enchaine apres un echauffement : rien a recuperer d'une
            // montee en charge.
            const showRest = groupIndex > 0 && previousSet?.type !== 'echauffement';
            const isDrop = group.length > 1;
            const firstIndex = index + 1;

            const rows = group.map((set) => {
              index += 1;
              // Le « precedent » se compare a rang egal, en ignorant les
              // series d'echauffement des deux cotes pour ne pas decaler.
              const workingIndex = entry.sets
                .slice(0, index + 1)
                .filter((s) => s.type !== 'echauffement').length - 1;
              const previous =
                set.type === 'echauffement' ? null : previousSets[workingIndex] ?? null;

              return (
                <SetRow
                  key={set.id}
                  set={set}
                  index={index}
                  number={numbers[index] ?? null}
                  hideTypeLetter={isDrop}
                  previous={previous}
                  showRpe={showRpe}
                  onChange={(patch) => onChangeSet(set.id, patch)}
                  onOpenMenu={() => onOpenSetMenu(set.id)}
                  onToggleDone={() => onToggleSetDone(set.id)}
                />
              );
            });

            return (
              <div key={group[0]?.id ?? firstIndex}>
                {showRest && <RestBetweenSets seconds={entry.restSec} />}
                {isDrop ? (
                  <DropGroup
                    count={group.length}
                    toFailure={group.some(isToFailure)}
                    // Les lignes de seance portent un fond blanc : sans quoi il
                    // masquerait la teinte du groupe.
                    bodyClassName="[&>div]:bg-transparent"
                  >
                    {rows}
                  </DropGroup>
                ) : (
                  rows
                )}
              </div>
            );
          });
        })()}
      </div>

      <div className="px-3 pb-1 pt-2">
        <button
          type="button"
          onClick={onAddSet}
          className="pressable pressable-wide min-h-[44px] w-full rounded-xl bg-alt font-display text-[15px] font-bold text-ink-2 active:bg-line-2"
        >
          + Ajouter une série
        </button>
      </div>
    </article>
  );
}

function ColumnHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cx(
        'text-center text-[11px] font-bold uppercase tracking-wider text-ink-3',
        className,
      )}
    >
      {children}
    </p>
  );
}
