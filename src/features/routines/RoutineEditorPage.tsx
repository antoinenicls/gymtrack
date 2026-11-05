/**
 * Edition d'une routine.
 *
 * L'ecran reprend volontairement la presentation de la seance en direct :
 * meme grille de series, meme pastille de type, meme bandeau de note. Ce que
 * le coach construit ici doit ressembler a ce que l'athlete verra, sinon il
 * prescrit a l'aveugle.
 *
 * Ce qui marque qu'on est en MODIFICATION et non en train de s'entrainer :
 * un bandeau permanent en haut, la colonne « Precedent » et la coche de
 * validation retirees (elles n'ont de sens qu'en seance), les entetes de
 * colonne libelles « Cible », et des poignees de suppression sur chaque ligne.
 */

import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUpDown, ChevronLeft, Link2, MoreHorizontal, Trash2 } from 'lucide-react';
import type {
  Exercise,
  Routine,
  RoutineFolder,
  RoutineItem,
  RoutineSet,
  SetType,
} from '@/types/domain';
import {
  exerciseRepo,
  folderRepo,
  newId,
  routineRepo,
  settingsRepo,
} from '@/services/repositories';
import ExercisePicker from '@/features/exercises/ExercisePicker';
import ExerciseDetailSheet from '@/features/exercises/ExerciseDetailSheet';
import DeleteSetButton from './DeleteSetButton';
import SetMenu from '@/features/workout/SetMenu';
import { useWorkoutStore } from '@/features/workout/workoutStore';
import RestPicker from '@/features/workout/RestPicker';
import ExerciseNote from '@/features/workout/ExerciseNote';
import ReorderSheet, { type ReorderItem } from '@/features/workout/ReorderSheet';
import { formatDuration } from '@/lib/metrics';
import { TYPE_LABEL, TYPE_LETTER, TYPE_STYLE, isToFailure } from '@/lib/setTypes';
import { supersetLetters, supersetRuns } from '@/lib/superset';
import { SupersetGroup, SupersetTag } from '@/ui/SupersetGroup';
import { RestBetweenSets } from '@/ui/RestBetweenSets';
import { DropGroup } from '@/ui/DropGroup';
import { plannedSetCount, setGroups, setNumbers } from '@/lib/dropset';
import { Banner, Button, EmptyState, Sheet, cx } from '@/ui/primitives';
import { useAutoGrow } from '@/ui/useAutoGrow';
import { useDecimalInput } from '@/ui/useDecimalInput';

export default function RoutineEditorPage() {
  const { routineId } = useParams<{ routineId: string }>();
  const navigate = useNavigate();
  // La route « /routines/nouvelle » est litterale et ne porte aucun parametre.
  const isNew = routineId === undefined || routineId === 'nouvelle';

  const applyRoutineDescription = useWorkoutStore((s) => s.applyRoutineDescription);

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  const [folders, setFolders] = useState<RoutineFolder[]>([]);
  const [showRpe, setShowRpe] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuItemId, setMenuItemId] = useState<string | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  // Fiche du mouvement, ouverte en tapant son nom dans la liste.
  const [detailed, setDetailed] = useState<Exercise | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  /**
   * Instantane de la seance telle qu'elle a ete chargee.
   *
   * Sert a savoir s'il y a quelque chose a perdre en sortant. Compare en JSON
   * plutot que suivi par un drapeau leve a chaque geste : un drapeau ment des
   * qu'on defait ce qu'on vient de faire, et il aurait fallu le poser sur la
   * vingtaine de mutations de cet ecran sans en oublier une.
   */
  const initialRef = useRef<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  useAutoGrow(descriptionRef, routine?.description ?? '');
  const [typeTarget, setTypeTarget] = useState<{ itemId: string; setId: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void (async () => {
      setExercises(new Map((await exerciseRepo.all()).map((e) => [e.id, e])));
      setFolders(await folderRepo.all());
      setShowRpe((await settingsRepo.get()).rpeEnabled);
      if (isNew) {
        const blank: Routine = {
          id: newId(),
          name: '',
          folderId: null,
          items: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastPerformedAt: null,
        };
        setRoutine(blank);
        initialRef.current = JSON.stringify(blank);
        return;
      }
      if (routineId) {
        const loaded = (await routineRepo.get(routineId)) ?? null;
        setRoutine(loaded);
        initialRef.current = loaded === null ? null : JSON.stringify(loaded);
      }
    })();
  }, [routineId, isNew]);

  if (!routine) {
    return (
      <div>
        <TopBar onBack={() => navigate(-1)} />
        <EmptyState title="Séance introuvable" />
      </div>
    );
  }

  const update = (changes: Partial<Routine>): void =>
    setRoutine((current) => (current ? { ...current, ...changes } : current));

  const updateItem = (itemId: string, changes: Partial<RoutineItem>): void =>
    update({
      items: routine.items.map((item) => (item.id === itemId ? { ...item, ...changes } : item)),
    });

  const updateSet = (itemId: string, setId: string, changes: Partial<RoutineSet>): void => {
    const item = routine.items.find((i) => i.id === itemId);
    if (!item) return;
    updateItem(itemId, {
      sets: item.sets.map((s) => (s.id === setId ? { ...s, ...changes } : s)),
    });
  };

  const addSet = (itemId: string): void => {
    const item = routine.items.find((i) => i.id === itemId);
    if (!item) return;
    // La nouvelle serie reprend la derniere serie de travail : c'est ce qu'on
    // veut neuf fois sur dix quand on empile des series identiques.
    const last = [...item.sets].reverse().find((s) => s.type !== 'echauffement');
    updateItem(itemId, {
      sets: [
        ...item.sets,
        {
          id: newId(),
          type: 'normale',
          targetWeightKg: last?.targetWeightKg ?? null,
          targetReps: last?.targetReps ?? null,
          targetRpe: last?.targetRpe ?? null,
        },
      ],
    });
  };

  const removeSet = (itemId: string, setId: string): void => {
    const item = routine.items.find((i) => i.id === itemId);
    if (!item || item.sets.length <= 1) return;
    updateItem(itemId, { sets: item.sets.filter((s) => s.id !== setId) });
  };

  const move = (itemId: string, direction: -1 | 1): void => {
    const index = routine.items.findIndex((i) => i.id === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= routine.items.length) return;
    const items = [...routine.items];
    const [moved] = items.splice(index, 1);
    if (moved) items.splice(target, 0, moved);
    update({ items: items.map((item, i) => ({ ...item, order: i })) });
  };

  /** Lie l'exercice a celui du dessus, meme geste que pendant la seance. */
  const toggleSuperset = (itemId: string): void => {
    const index = routine.items.findIndex((i) => i.id === itemId);
    const item = routine.items[index];
    const previous = routine.items[index - 1];
    if (!item || !previous) return;

    const items = [...routine.items];
    if (item.supersetGroup && item.supersetGroup === previous.supersetGroup) {
      items[index] = { ...item, supersetGroup: null };
    } else {
      const group = previous.supersetGroup ?? newId();
      items[index - 1] = { ...previous, supersetGroup: group };
      items[index] = { ...item, supersetGroup: group };
    }
    update({ items });
  };

  const save = async (): Promise<void> => {
    const description = (routine.description ?? '').trim();

    await routineRepo.save({
      ...routine,
      name: routine.name.trim() || 'Séance sans nom',
      // Champ optionnel : on ne stocke pas une chaine vide, sans quoi
      // « description effacee » et « jamais renseignee » se confondent.
      ...(description === '' ? { description: undefined } : { description }),
    });

    await applyRoutineDescription(routine.id, description);
    // REMPLACE au lieu d'empiler : une fois enregistree, la routine n'a plus
    // d'etape « modification » ou revenir. Sans ca, le retour rouvrait
    // l'editeur qu'on venait de quitter, et il fallait appuyer deux fois pour
    // atteindre ses routines.
    navigate(isNew ? '/seance' : `/routines/${routine.id}`, { replace: true });
  };

  /** Vrai des que l'ecran differe de ce qui a ete charge. */
  const dirty = initialRef.current !== null && JSON.stringify(routine) !== initialRef.current;

  /**
   * Sortie de l'editeur.
   *
   * Sans modification, on sort sans rien demander : une confirmation qui
   * s'affiche quand il n'y a rien a perdre s'apprend a etre balayee sans lire,
   * et ne protege plus rien le jour ou elle compte.
   */
  const leave = (): void => {
    if (dirty) return setLeaving(true);
    navigate(-1);
  };

  const menuItem = menuItemId ? routine.items.find((i) => i.id === menuItemId) : undefined;

  /**
   * Resume pour la feuille de reordonnancement. Le detail annonce le format
   * prescrit (nombre de series et repos) : c'est ce qui permet de juger d'un
   * coup d'oeil si l'enchainement construit tient debout.
   */
  const reorderItems: ReorderItem[] = (() => {
    const runs = supersetRuns(routine.items);
    const letters = supersetLetters(runs);
    return runs.flatMap((run, runIndex) =>
      run.map((item, positionInRun) => {
        const letter = run.length > 1 ? letters[runIndex] ?? null : null;
        return {
          id: item.id,
          name: exercises.get(item.exerciseId)?.name ?? 'Exercice supprimé',
          detail: `${plannedSetCount(item.sets)} série${plannedSetCount(item.sets) > 1 ? 's' : ''} · repos ${
            item.restSec > 0 ? formatDuration(item.restSec) : 'aucun'
          }`,
          supersetTag: letter ? `${letter}${positionInRun + 1}` : null,
        };
      }),
    );
  })();

  return (
    <div className="flex h-full flex-col">
      <TopBar onBack={leave} onSave={() => void save()} />

      <div className="scroll-area flex-1 pb-8">
        {/* Marqueur permanent du mode modification. */}
        <div className="px-4 pt-3">
          <Banner tone="accent">
            Tu construis la séance. Les charges saisies ici sont des cibles, pas des séries
            réalisées.
          </Banner>
        </div>

        <div className="px-4 pt-4">
          <input
            value={routine.name}
            onChange={(e) => update({ name: e.currentTarget.value })}
            placeholder="Nom de la séance"
            aria-label="Nom de la séance"
            className="w-full bg-transparent font-display text-[27px] font-black tracking-[-1px] placeholder:text-ink-3 focus:outline-none"
          />
          <p className="mt-1 text-[14px] text-ink-2">
            Par exemple Push A, Pull B, ou Jour bas du corps.
          </p>

          {/* Description libre. Sous le nom, parce qu'elle le precise : ce que
              vise la seance, une consigne a se rappeler. Le champ grandit avec
              le texte, une seule ligne au depart pour ne pas encombrer ceux qui
              n'en veulent pas. */}
          <textarea
            ref={descriptionRef}
            value={routine.description ?? ''}
            onChange={(e) => update({ description: e.currentTarget.value })}
            rows={1}
            placeholder="Description (facultatif)"
            aria-label="Description de la séance"
            className="mt-3 w-full resize-none overflow-hidden bg-transparent text-[15px] leading-relaxed text-ink-2 placeholder:text-ink-3 focus:outline-none"
          />

          {/* Rangement. N'apparait que si des dossiers existent : proposer un
              classement quand il n'y a rien ou classer serait du bruit. */}
          {folders.length > 0 && (
            <div className="mt-4">
              <p className="section-label mb-2">Dossier</p>
              <div className="flex flex-wrap gap-1.5">
                <FolderChip
                  active={routine.folderId === null}
                  onClick={() => update({ folderId: null })}
                >
                  Hors dossier
                </FolderChip>
                {folders.map((folder) => (
                  <FolderChip
                    key={folder.id}
                    active={routine.folderId === folder.id}
                    onClick={() => update({ folderId: folder.id })}
                  >
                    {folder.name}
                  </FolderChip>
                ))}
              </div>
            </div>
          )}
        </div>

        {routine.items.length === 0 ? (
          <EmptyState title="Séance vide">
            Ajoute les exercices que tu enchaînes habituellement, dans l’ordre où tu les fais.
          </EmptyState>
        ) : (
          /* PAS de `divide-y` : sa classe de couleur ecraserait le filet des
             supersets sur tous les elements sauf le premier. Chaque groupe
             trace sa propre separation, cf. ui/SupersetGroup. */
          <div className="mt-5">
            {(() => {
              const runs = supersetRuns(routine.items);
              const letters = supersetLetters(runs);
              return runs.map((run, runIndex) => (
                <SupersetGroup
                  key={run[0]?.id ?? runIndex}
                  letter={run.length > 1 ? letters[runIndex] ?? null : null}
                  count={run.length}
                >
                  {run.map((item, positionInRun) => {
              const index = routine.items.indexOf(item);
              const previous = routine.items[index - 1];
              const linked =
                item.supersetGroup !== null && previous?.supersetGroup === item.supersetGroup;
              const exercise = exercises.get(item.exerciseId);
              const letter = run.length > 1 ? letters[runIndex] ?? null : null;

              return (
                <article
                  key={item.id}
                  className={cx(
                    'bg-white',
                    linked ? 'border-t border-line pt-2' : 'pt-4',
                  )}
                >
                  <header className="flex items-center gap-2 px-3 pb-1">
                    <SupersetTag tag={letter ? `${letter}${positionInRun + 1}` : null} />
                    {/* Meme geste qu'en seance : le nom ouvre la fiche du
                        mouvement, sans quitter la modification en cours. */}
                    {exercise ? (
                      <button
                        type="button"
                        onClick={() => setDetailed(exercise)}
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

                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleSuperset(item.id)}
                        aria-label={linked ? 'Détacher du superset' : 'Lier en superset'}
                        aria-pressed={linked}
                        className={cx(
                          'pressable flex h-9 w-9 items-center justify-center rounded-lg',
                          linked ? 'bg-accent text-white' : 'bg-accent-soft text-accent',
                        )}
                      >
                        <Link2 size={17} strokeWidth={2.4} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setMenuItemId(item.id)}
                      aria-label="Options de l’exercice"
                      className="pressable flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent"
                    >
                      <MoreHorizontal size={18} strokeWidth={2.4} />
                    </button>
                  </header>

                  <p className="px-3 pb-1 text-[13px] text-ink-2">
                    Repos {item.restSec > 0 ? formatDuration(item.restSec) : 'aucun'}
                  </p>

                  {/* Consigne editable ICI, sous le nom, comme la note en
                      seance. Elle vivait dans le menu « … », soit trois appuis
                      pour ecrire une ligne que on lira juste a cet
                      endroit. */}
                  <ExerciseNote
                    value={item.notes}
                    onChange={(notes) => updateItem(item.id, { notes })}
                    placeholder="Coudes serrés, tempo lent en descente…"
                    addLabel="Ajouter une consigne"
                    fieldLabel="Consigne pour cet exercice"
                  />

                  {/* Grille de la seance, moins « Precedent » et la coche :
                      ces deux colonnes ne veulent rien dire hors entrainement. */}
                  <div
                    className="grid items-center gap-1.5 px-3 pb-1 pt-1.5"
                    style={{ gridTemplateColumns: GRID(showRpe) }}
                  >
                    <ColumnHead>Série</ColumnHead>
                    <ColumnHead className="pl-1 text-left">Type</ColumnHead>
                    <ColumnHead>kg cible</ColumnHead>
                    <ColumnHead>Reps</ColumnHead>
                    {showRpe && <ColumnHead>RPE</ColumnHead>}
                    <ColumnHead />
                  </div>

                  {/* Rendu par GROUPES, comme en seance : les paliers d'une
                      degressive tiennent dans un seul cadre, valent une seule
                      serie, et rien ne s'intercale entre eux. */}
                  <div>
                    {(() => {
                      const numbers = setNumbers(item.sets);
                      const groups = setGroups(item.sets);
                      let setIndex = -1;

                      return groups.map((group, groupIndex) => {
                        const before = groups[groupIndex - 1];
                        const previousSet = before?.[before.length - 1];
                        const showRest = groupIndex > 0 && previousSet?.type !== 'echauffement';
                        const firstId = group[0]?.id ?? String(groupIndex);

                        const rows = group.map((set) => {
                          setIndex += 1;
                          const number = numbers[setIndex] ?? null;
                          return (
                      <Fragment key={set.id}>
                      <div
                        className="grid items-center gap-1.5 px-3 py-1.5"
                        style={{ gridTemplateColumns: GRID(showRpe) }}
                      >
                        <button
                          type="button"
                          onClick={() => setTypeTarget({ itemId: item.id, setId: set.id })}
                          aria-label={
                            number === null
                              ? 'Palier de dégressive'
                              : `Série ${number}, type ${set.type}`
                          }
                          className={cx(
                            'pressable num flex h-9 w-9 items-center justify-center rounded-lg',
                            'font-display text-[15px] font-extrabold',
                            // Meme code couleur qu'en seance : rouge = echec.
                            isToFailure(set) ? 'bg-red-50 text-red-600' : TYPE_STYLE[set.type],
                          )}
                        >
                          {number === null ? (
                            <ArrowDown size={16} strokeWidth={3} />
                          ) : group.length > 1 ? (
                            number
                          ) : (
                            TYPE_LETTER[set.type] ?? number
                          )}
                        </button>

                        {/* Le type s'ecrit en entier, quitte a passer sur deux
                            lignes. Tronque, il donnait « Dégressive · à l… » :
                            la colonne est etroite par construction, et le mot
                            coupe etait justement celui qui distingue une
                            descente d'une descente menee a l'echec.

                            La mention d'echec descend sur sa propre ligne, ou
                            elle ne rogne plus rien, et le rouge la rattache au
                            meme code couleur que la pastille.

                            Dans un encadre de degressive, rien : l'entete du
                            cadre annonce deja « DÉGRESSIVE · 2 PALIERS · À
                            L'ÉCHEC ». Le redire a chaque palier n'apprenait
                            rien et prenait la place qui manquait aux mots, qui
                            se cassaient alors en « Dégressiv / e ». */}
                        {group.length > 1 ? (
                          <span />
                        ) : (
                          <div className="min-w-0 pl-1 leading-tight">
                            <p className="break-words text-[11.5px] text-ink-2">
                              {TYPE_LABEL[set.type]}
                            </p>
                            {/* Le type historique 'echec' le dit deja lui-meme :
                                on n'ajoute la mention que si elle vient du
                                drapeau, sinon on lirait « À l'échec · échec ». */}
                            {set.toFailure && set.type !== 'echec' && (
                              <p className="break-words text-[11px] font-semibold text-red-600">
                                à l’échec
                              </p>
                            )}
                          </div>
                        )}

                        <TargetCell
                          value={set.targetWeightKg}
                          placeholder="libre"
                          label={`Charge cible série ${setIndex + 1}`}
                          onChange={(v) => updateSet(item.id, set.id, { targetWeightKg: v })}
                          // 37,5 kg doit se prescrire aussi precisement qu'il se souleve.
                          maxDecimals={2}
                        />

                        <TargetCell
                          value={set.targetReps}
                          placeholder="-"
                          label={`Répétitions cibles série ${setIndex + 1}`}
                          onChange={(v) => updateSet(item.id, set.id, { targetReps: v })}
                          maxDecimals={0}
                        />

                        {showRpe && (
                          <TargetCell
                            value={set.targetRpe}
                            placeholder="-"
                            label={`RPE cible série ${setIndex + 1}`}
                            maxDecimals={1}
                            onChange={(v) =>
                              updateSet(item.id, set.id, {
                                // Le RPE est borne a l'echelle 1-10 : au-dela
                                // ce n'est plus une note d'effort.
                                targetRpe: v === null ? null : Math.min(10, Math.max(1, v)),
                              })
                            }
                          />
                        )}

                        <DeleteSetButton
                          label={`la série ${setIndex + 1}`}
                          disabled={item.sets.length <= 1}
                          onDelete={() => removeSet(item.id, set.id)}
                        />
                      </div>
                      </Fragment>
                          );
                        });

                        return (
                          <div key={firstId}>
                            {showRest && <RestBetweenSets seconds={item.restSec} />}
                            {group.length > 1 ? (
                              <DropGroup
                                count={group.length}
                                toFailure={group.some(isToFailure)}
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

                  <div className="px-3 pb-2 pt-2">
                    <button
                      type="button"
                      onClick={() => addSet(item.id)}
                      className="pressable pressable-wide min-h-[44px] w-full rounded-xl bg-alt font-display text-[15px] font-bold text-ink-2 active:bg-line-2"
                    >
                      + Ajouter une série
                    </button>
                  </div>
                </article>
              );
                  })}
                </SupersetGroup>
              ));
            })()}
          </div>
        )}

        <div className="mt-6 space-y-2 px-4">
          <Button variant="tinted" full onClick={() => setPickerOpen(true)}>
            Ajouter des exercices
          </Button>
          {routine.items.length > 1 && (
            <Button variant="secondary" full onClick={() => setReorderOpen(true)}>
              <ArrowUpDown size={17} strokeWidth={2.2} />
              Réorganiser les exercices
            </Button>
          )}
          {!isNew && (
            <Button variant="danger" full onClick={() => setConfirmDelete(true)}>
              Supprimer la séance
            </Button>
          )}
        </div>
      </div>

      {/* Enregistrement colle en bas : on ne doit jamais avoir a chercher
          comment sauver son travail. */}
      <div className="shrink-0 border-t border-line bg-white px-4 py-3">
        <Button full className="min-h-[52px] text-[16px]" onClick={() => void save()}>
          Enregistrer la séance
        </Button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(ids) => {
          /**
           * On RELIT la bibliotheque avant d'ajouter les lignes. La carte
           * d'exercices est chargee au montage de l'ecran : un mouvement cree
           * depuis le selecteur lui-meme n'y figure pas, et sa ligne
           * s'affichait « Exercice supprime » alors que l'exercice existait,
           * c'est la carte qui datait. Le temps de repos par defaut se lit sur
           * la carte fraiche pour la meme raison.
           */
          void (async () => {
            const fresh = new Map((await exerciseRepo.all()).map((e) => [e.id, e]));
            setExercises(fresh);
            update({
              items: [
                ...routine.items,
                ...ids.map((exerciseId, i) => ({
                  id: newId(),
                  exerciseId,
                  // Trois series normales par defaut : le format le plus courant,
                  // et il suffit d'en retirer une si besoin.
                  sets: Array.from({ length: 3 }, () => ({
                    id: newId(),
                    type: 'normale' as SetType,
                    targetWeightKg: null,
                    targetReps: 8,
                    targetRpe: null,
                  })),
                  restSec: fresh.get(exerciseId)?.defaultRestSec ?? 120,
                  supersetGroup: null,
                  notes: '',
                  order: routine.items.length + i,
                })),
              ],
            });
          })();
        }}
      />

      {typeTarget && (() => {
        const item = routine.items.find((i) => i.id === typeTarget.itemId);
        const setIndex = item?.sets.findIndex((s) => s.id === typeTarget.setId) ?? -1;
        const target = setIndex >= 0 ? item?.sets[setIndex] : undefined;
        if (!target) return null;
        return (
          <SetMenu
            current={target.type}
            toFailure={isToFailure(target)}
            dropStart={target.dropStart === true}
            canDetach={target.type === 'drop' && item?.sets[setIndex - 1]?.type === 'drop'}
            setNumber={setIndex + 1}
            onSelect={(type) => updateSet(typeTarget.itemId, typeTarget.setId, { type })}
            onToggleFailure={() => {
              const next = !isToFailure(target);
              updateSet(typeTarget.itemId, typeTarget.setId, {
                toFailure: next,
                // Meme raison qu'en seance : le type 'echec' portait seul
                // l'information, l'enlever ne peut pas le laisser en place.
                ...(!next && target.type === 'echec' ? { type: 'normale' as SetType } : {}),
              });
            }}
            onToggleDropStart={() =>
              updateSet(typeTarget.itemId, typeTarget.setId, {
                dropStart: target.dropStart !== true,
              })
            }
            onClose={() => setTypeTarget(null)}
            onDelete={() => removeSet(typeTarget.itemId, typeTarget.setId)}
            canDelete={(item?.sets.length ?? 0) > 1}
          />
        );
      })()}

      {menuItem && (
        <Sheet
          open
          onClose={() => setMenuItemId(null)}
          title={exercises.get(menuItem.exerciseId)?.name ?? 'Exercice'}
        >
          <div className="space-y-5 pb-2">
            <div>
              <p className="section-label mb-2">Temps de repos</p>
              <RestPicker
                valueSec={menuItem.restSec}
                onChange={(seconds) => updateItem(menuItem.id, { restSec: seconds })}
              />
            </div>

            {/* Ni la consigne ni le deplacement ne sont plus ici : la premiere
                s'ecrit sous le nom de l'exercice, le second dans « Réorganiser
                les exercices », ou toute la seance tient a l'ecran. Ce menu ne
                garde que ce qui n'a pas sa place dans la liste. */}

            <Button
              variant="danger"
              full
              onClick={() => {
                update({ items: routine.items.filter((i) => i.id !== menuItem.id) });
                setMenuItemId(null);
              }}
            >
              <Trash2 size={17} strokeWidth={2.2} />
              Retirer de la séance
            </Button>
          </div>
        </Sheet>
      )}

      <ReorderSheet
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        items={reorderItems}
        onMove={move}
      />

      <ExerciseDetailSheet
        exercise={detailed}
        onClose={() => setDetailed(null)}
        onChanged={(updated) => {
          setDetailed(updated);
          setExercises((prev) => new Map(prev).set(updated.id, updated));
        }}
      />

      {/* Sortie avec des modifications en cours.
          Les trois issues sont ecrites en toutes lettres, et « quitter sans
          enregistrer » n'est PAS le bouton le plus visible : c'est le seul des
          trois qui detruise du travail. */}
      <Sheet
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Modifications non enregistrées"
      >
        <p className="pb-4 text-[15px] leading-relaxed text-ink-2">
          Tu as modifié « {routine.name.trim() || 'cette séance'} » sans enregistrer. Que veux-tu
          en faire&nbsp;?
        </p>
        <div className="space-y-2 pb-2">
          <Button full onClick={() => void save()}>
            Enregistrer et quitter
          </Button>
          <Button variant="secondary" full onClick={() => setLeaving(false)}>
            Continuer la modification
          </Button>
          <Button variant="danger" full onClick={() => navigate(-1)}>
            Quitter sans enregistrer
          </Button>
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Supprimer">
        <p className="pb-4 text-[15px] leading-relaxed text-ink-2">
          La routine sera supprimée. Les séances déjà réalisées avec elle restent dans ton
          historique.
        </p>
        <div className="space-y-2 pb-2">
          <Button
            variant="danger"
            full
            // Meme raison qu'a l'enregistrement, en plus net : revenir sur
            // l'editeur d'une routine qui n'existe plus n'a aucun sens.
            onClick={() =>
              void routineRepo
                .remove(routine.id)
                .then(() => navigate('/seance', { replace: true }))
            }
          >
            Oui, supprimer
          </Button>
          <Button variant="secondary" full onClick={() => setConfirmDelete(false)}>
            Annuler
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function FolderChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'pressable min-h-[38px] rounded-pill px-3.5 text-[13px] font-semibold',
        active ? 'bg-accent text-white' : 'bg-alt text-ink-2',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Colonnes de la grille. La colonne RPE suit le meme reglage qu'en seance.
 *
 * Les cibles chiffrees sont plus etroites qu'en seance, et c'est voulu : elles
 * portent au plus trois caracteres, alors que la colonne « Type » porte des
 * mots. Chaque pixel repris ici est un pixel de plus pour « Dégressive », qui
 * se lisait « Dégress… » sur un ecran de 360 points.
 */
const GRID = (showRpe: boolean): string =>
  showRpe
    ? '34px minmax(0,1fr) 60px 48px 42px 32px'
    : '34px minmax(0,1fr) 70px 60px 36px';


/**
 * Cellule de cible. Vide veut dire « libre » : le coach n'impose pas toujours
 * une charge, et forcer un zero serait une consigne differente.
 */
function TargetCell({
  value,
  placeholder,
  label,
  onChange,
  maxDecimals,
}: {
  value: number | null;
  placeholder: string;
  label: string;
  onChange: (value: number | null) => void;
  /** 2 pour une charge, 1 pour un RPE au demi, 0 pour des repetitions. */
  maxDecimals: number;
}) {
  const field = useDecimalInput({ value, onChange, maxDecimals });
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      placeholder={placeholder}
      {...field}
      className="num h-9 w-full rounded-lg border-0 bg-alt text-center font-display text-[16px] font-bold placeholder:text-[13px] placeholder:font-medium placeholder:text-ink-3 focus:bg-accent-soft focus:outline-none"
    />
  );
}

function ColumnHead({ children, className }: { children?: React.ReactNode; className?: string }) {
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

function TopBar({ onBack, onSave }: { onBack: () => void; onSave?: () => void }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-2 py-2 backdrop-blur">
      <button
        type="button"
        onClick={onBack}
        className="pressable flex min-h-[44px] items-center gap-1 pr-3 text-[15px] font-semibold text-accent"
      >
        <ChevronLeft size={22} strokeWidth={2.4} />
        Retour
      </button>

      <p className="font-display text-[13px] font-bold uppercase tracking-[1.5px] text-ink-3">
        Modification
      </p>

      {onSave ? (
        <button
          type="button"
          onClick={onSave}
          className="pressable min-h-[44px] px-3 text-[15px] font-semibold text-accent"
        >
          Enregistrer
        </button>
      ) : (
        <span className="w-[80px]" />
      )}
    </div>
  );
}
