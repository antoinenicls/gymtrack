/**
 * Ecran Seance : lanceur quand rien n'est en cours, log en direct sinon.
 *
 * La structure du mode « en cours » suit la capture Strong fournie par
 * l'utilisateur. Seules les couleurs et la typographie viennent de la landing.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  Disc,
  FolderInput,
  FolderPlus,
  Copy,
  ListChecks,
  MoreHorizontal,
  Plus,
  Share,
  Trash2,
} from 'lucide-react';
import type {
  Exercise,
  Routine,
  RoutineFolder,
  Settings,
  Workout,
  WorkoutSet,
} from '@/types/domain';
import {
  exerciseRepo,
  folderRepo,
  routineRepo,
  settingsRepo,
  workoutRepo,
} from '@/services/repositories';
import { useExerciseRevision } from '@/services/useExerciseRevision';
import { useWorkoutStore } from './workoutStore';
import { prFeedback, tapFeedback } from '@/services/feedback';
import { entryWorkingSetCount, formatElapsed, workingSets, workoutVolume } from '@/lib/metrics';
import { setGroups } from '@/lib/dropset';
import { isToFailure } from '@/lib/setTypes';
import { timeAgo } from '@/lib/timeAgo';
import { Banner, Button, EmptyState, PageTitle, Sheet, cx } from '@/ui/primitives';
import { useAutoGrow } from '@/ui/useAutoGrow';
import ExerciseBlock from './ExerciseBlock';
import ExercisePicker from '@/features/exercises/ExercisePicker';
import ExerciseDetailSheet from '@/features/exercises/ExerciseDetailSheet';
import { supersetLetters, supersetRuns } from '@/lib/superset';
import { SupersetGroup } from '@/ui/SupersetGroup';
import PlateCalculator from './PlateCalculator';
import ExerciseMenu from './ExerciseMenu';
import ReorderSheet, { type ReorderItem } from './ReorderSheet';
import FinishSummary from './FinishSummary';
import ImportProgramSheet from '@/features/programs/ImportProgramSheet';
import ShareProgramSheet from '@/features/programs/ShareProgramSheet';
import SetMenu from './SetMenu';
import SessionBusySheet from './SessionBusySheet';

export default function SessionPage() {
  const workout = useWorkoutStore((s) => s.workout);
  /**
   * Seance repliee : l'ecran repasse au lanceur, la seance n'est plus qu'une
   * barre en bas (cf. MiniSessionBar). Le lanceur apprend au passage qu'un
   * entrainement tourne, pour ne pas proposer d'en ecraser un.
   */
  const minimized = useWorkoutStore((s) => s.minimized);
  /**
   * Le recapitulatif de fin vit ICI et non dans LiveWorkout.
   *
   * finish() met la seance a null, ce qui demonte LiveWorkout dans la foulee :
   * un etat local y serait detruit avant d'avoir pu s'afficher, et le bouton
   * « Terminer » semblait ne rien faire. Bug reellement vecu.
   */
  const [finished, setFinished] = useState<Workout | null>(null);

  /**
   * Jeton de rafraichissement de la liste des seances enregistrees.
   *
   * Le lanceur est deja monte quand le recapitulatif s'affiche : `finish()`
   * met la seance a null, donc `SessionLauncher` se monte et charge ses
   * routines AVANT que l'athlete n'ait touche au recapitulatif. Tout ce qu'il
   * y fait ensuite (enregistrer la seance improvisee, reporter les
   * changements dans une routine existante) restait donc invisible derriere,
   * et « Mes séances » affichait encore « Aucune séance enregistrée » alors
   * que la routine venait d'etre ecrite. On relit a la fermeture.
   */
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <>
      {workout && !minimized ? (
        <LiveWorkout workout={workout} onFinished={setFinished} />
      ) : (
        <SessionLauncher refreshToken={refreshToken} activeWorkout={workout} />
      )}
      {finished && (
        <FinishSummary
          workout={finished}
          onClose={() => {
            setFinished(null);
            setRefreshToken((n) => n + 1);
          }}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Lanceur                                                                     */
/* -------------------------------------------------------------------------- */

function SessionLauncher({
  refreshToken,
  activeWorkout,
}: {
  refreshToken: number;
  /** Seance repliee, s'il y en a une. Elle interdit d'en lancer une autre. */
  activeWorkout: Workout | null;
}) {
  const navigate = useNavigate();
  const startEmpty = useWorkoutStore((s) => s.startEmpty);
  const startFromRoutine = useWorkoutStore((s) => s.startFromRoutine);
  const setMinimized = useWorkoutStore((s) => s.setMinimized);
  /** Ouverte quand on tape « Lancer » alors qu'une seance tourne deja. */
  const [busyOpen, setBusyOpen] = useState(false);

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [folders, setFolders] = useState<RoutineFolder[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  /** Seances en cours de partage (feuille ouverte tant que non vide). */
  const [sharing, setSharing] = useState<Routine[]>([]);
  const [folderSheet, setFolderSheet] = useState<RoutineFolder | 'nouveau' | null>(null);
  /** Menu des actions secondaires sur la liste des seances. */
  const [listMenu, setListMenu] = useState(false);
  /**
   * Dossiers replies, memorises dans les reglages.
   *
   * Un dossier neuf s'ouvre : on range pour s'y retrouver, pas pour cacher.
   * Mais un dossier qu'on a REPLIE le reste, en changeant d'onglet comme en
   * rouvrant l'app, sinon le rangement se defait a chaque retour et le geste
   * est a refaire indefiniment.
   */
  const [collapsed, setCollapsed] = useState<string[]>([]);
  /**
   * Mode selection, active explicitement. Hors de ce mode un tap ouvre la
   * seance : c'est le geste de tous les jours, il ne doit pas passer derriere
   * une case a cocher.
   */
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'supprimer' | 'deplacer' | null>(null);
  /**
   * Mode rangement, lui aussi explicite. Il remplace « Lancer » par une paire
   * de fleches : les deux ne peuvent pas cohabiter sur la carte sans que la
   * ligne deborde, et lancer une seance par erreur en voulant la monter d'un
   * cran serait le pire des deux echanges.
   */
  const [ordering, setOrdering] = useState(false);

  /**
   * Tout arrive ENSEMBLE, en une seule fournee.
   *
   * Les dossiers et leur etat replie se posent dans le meme rendu : charges
   * separement, la liste s'affichait un instant toute depliee avant de se
   * refermer sous les yeux.
   */
  const load = useCallback(() => {
    void (async () => {
      const [loadedRoutines, loadedFolders, settings] = await Promise.all([
        routineRepo.all(),
        folderRepo.all(),
        settingsRepo.get(),
      ]);
      setRoutines(loadedRoutines);
      setFolders(loadedFolders);
      // On oublie au passage les dossiers supprimes depuis : leur identifiant
      // ne designe plus rien et n'a pas a survivre dans les reglages.
      setCollapsed(
        (settings.collapsedFolders ?? []).filter((id) => loadedFolders.some((f) => f.id === id)),
      );
    })();
  }, []);

  /** Replie ou deplie un dossier, et s'en souvient. */
  const toggleFolder = (folderId: string): void => {
    setCollapsed((current) => {
      const next = current.includes(folderId)
        ? current.filter((id) => id !== folderId)
        : [...current, folderId];
      void settingsRepo.patch({ collapsedFolders: next });
      return next;
    });
  };

  // `refreshToken` en dependance : c'est ce qui fait relire la liste quand le
  // recapitulatif de fin de seance se ferme, sans remonter tout l'ecran.
  useEffect(load, [load, refreshToken]);

  const toggleSelected = (id: string): void =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const leaveSelection = (): void => {
    setSelecting(false);
    setSelected([]);
    setBulkAction(null);
  };

  const deleteSelected = async (): Promise<void> => {
    for (const id of selected) await routineRepo.remove(id);
    leaveSelection();
    load();
  };

  /**
   * Copie toute la selection. On QUITTE le mode selection ensuite, mais sans
   * rien selectionner d'autre : les copies apparaissent dans la liste, pretes
   * a etre rangees, et laisser les originales cochees ferait douter de ce sur
   * quoi porterait le geste suivant.
   */
  const duplicateSelected = async (): Promise<void> => {
    for (const id of selected) await routineRepo.duplicate(id);
    leaveSelection();
    load();
  };

  /** Range toute la selection dans un dossier, ou l'en sort si `null`. */
  const moveSelected = async (folderId: string | null): Promise<void> => {
    for (const id of selected) {
      const routine = routines.find((r) => r.id === id);
      if (routine) await routineRepo.save({ ...routine, folderId });
    }
    leaveSelection();
    load();
  };

  /**
   * Deplace un element d'un cran dans SA liste, puis fige toute la liste.
   *
   * On reecrit le groupe entier et pas seulement les deux voisins echanges :
   * les routines jamais rangees n'ont aucun rang, en numeroter deux au milieu
   * des autres produirait un ordre incoherent des le premier geste.
   */
  const moveFolder = async (index: number, direction: -1 | 1): Promise<void> => {
    const next = [...folders];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(index + direction, 0, moved);
    await folderRepo.reorder(next.map((f) => f.id));
    load();
  };

  const moveRoutine = async (
    group: Routine[],
    index: number,
    direction: -1 | 1,
  ): Promise<void> => {
    const next = [...group];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(index + direction, 0, moved);
    await routineRepo.reorder(next.map((r) => r.id));
    load();
  };

  const loose = routines.filter((r) => r.folderId === null || !folders.some((f) => f.id === r.folderId));

  const renderRoutine = (routine: Routine, index: number, group: Routine[]) => {
    const isSelected = selected.includes(routine.id);

    const infos = (
      <>
        <span className="block truncate font-display text-[16px] font-extrabold tracking-[-0.03em]">
          {routine.name}
        </span>
        {routine.description && (
          <span className="mt-0.5 block truncate text-[13px] text-ink-2">
            {routine.description}
          </span>
        )}
        <span className="mt-0.5 block text-[13px] text-ink-3">
          {routine.items.length} exercice{routine.items.length > 1 ? 's' : ''}
          {/* « fait hier » plutot que « dernière fois le 12/05 » : dans une
              liste, ce qu'on cherche est laquelle est la plus fraiche, et le
              relatif repond sans faire compter les jours depuis aujourd'hui.
              Au-dela d'une semaine il ne dit plus rien d'utile et la date
              reprend la main (cf. timeAgo). */}
          {routine.lastPerformedAt
            ? ` · fait ${
                timeAgo(routine.lastPerformedAt) ??
                `le ${new Date(routine.lastPerformedAt).toLocaleDateString('fr-FR')}`
              }`
            : ''}
        </span>
      </>
    );

    /**
     * En selection, la carte ENTIERE est le bouton, case a cocher comprise.
     * Elle etait posee a cote du bouton et non dedans : viser la case, geste
     * le plus naturel, ne faisait donc rien du tout.
     */
    if (selecting) {
      return (
        <li key={routine.id}>
          <button
            type="button"
            onClick={() => toggleSelected(routine.id)}
            aria-pressed={isSelected}
            className={cx(
              'pressable pressable-wide card flex w-full items-center gap-3 p-3 text-left',
              isSelected && 'border-accent bg-accent-soft/50',
            )}
          >
            <span
              className={cx(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-200',
                isSelected
                  ? 'border-accent bg-accent text-white'
                  : 'border-line-2 bg-white text-transparent',
              )}
            >
              <Check size={15} strokeWidth={3} />
            </span>
            <span className="min-w-0 flex-1">{infos}</span>
          </button>
        </li>
      );
    }

    if (ordering) {
      return (
        <li key={routine.id}>
          <div className="card flex items-center gap-3 p-3">
            <span className="min-w-0 flex-1">{infos}</span>
            <MoveArrows
              label={routine.name}
              isFirst={index === 0}
              isLast={index === group.length - 1}
              onMove={(direction) => void moveRoutine(group, index, direction)}
            />
          </div>
        </li>
      );
    }

    return (
      <li key={routine.id}>
        <div className="card flex items-center gap-3 p-3 transition-colors duration-200">
          <button
            type="button"
            onClick={() => navigate(`/routines/${routine.id}`)}
            className="min-w-0 flex-1 text-left"
          >
            {infos}
          </button>
          <Button
            onClick={() =>
              activeWorkout ? setBusyOpen(true) : void startFromRoutine(routine)
            }
            className="px-4"
          >
            Lancer
          </Button>
        </div>
      </li>
    );
  };

  return (
    <div className={cx('pb-6', selecting && 'pb-32')}>
      <PageTitle
        sub={
          activeWorkout
            ? 'Ton entraînement continue en bas de l’écran. Consulte ou modifie ce que tu veux, puis reprends-le.'
            : 'Lance une séance vide, ou reprends une séance enregistrée.'
        }
      >
        Séance
      </PageTitle>

      {/* Avec une seance repliee, l'action principale de cet ecran n'est plus
          d'en demarrer une : c'est de retourner a celle qui tourne. « Démarrer
          une séance vide » disparait plutot que de rester en trompe-l'oeil,
          puisqu'il ne pourrait de toute facon qu'ouvrir un refus. */}
      <div className="px-4 pt-3">
        {activeWorkout ? (
          <>
            <Button
              full
              onClick={() => setMinimized(false)}
              className="min-h-[52px] text-[16px]"
            >
              Reprendre la séance en cours
            </Button>
            <p className="mt-2 truncate px-1 text-[13px] text-ink-3">{activeWorkout.name}</p>
          </>
        ) : (
          <Button full onClick={() => void startEmpty()} className="min-h-[52px] text-[16px]">
            Démarrer une séance vide
          </Button>
        )}
      </div>

      <div className="mt-8 px-4">
        {/* Une seule action mise en avant, le reste dans un menu.
            Trois boutons de meme poids se disputaient une ligne qu'ils ne
            tenaient pas : a 320 px, la place manquait pour trois libelles, et
            aucun des trois arrangements essayes n'etait ni lisible ni beau.
            Ils n'ont de toute facon pas la meme importance. Creer une seance
            se fait souvent, ranger un dossier et trier a plusieurs se font une
            fois de temps en temps. */}
        <div className="mb-3">
          {ordering ? (
            <div className="flex min-h-[44px] items-center gap-x-1">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-2">
                Range tes dossiers et tes séances
              </span>
              <Button variant="accent" className="px-2" onClick={() => setOrdering(false)}>
                Terminé
              </Button>
            </div>
          ) : selecting ? (
            <div className="flex min-h-[44px] items-center gap-x-1">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-2">
                {selected.length === 0
                  ? 'Touche les séances à traiter'
                  : `${selected.length} sélectionnée${selected.length > 1 ? 's' : ''}`}
              </span>
              <Button variant="accent" className="px-2" onClick={leaveSelection}>
                Terminé
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 flex-1 truncate font-display text-[19px] font-extrabold tracking-[-0.03em]">
                Mes séances
              </h2>
              {/* Teinte et non plein : le bouton plein de cet ecran, c'est
                  « Démarrer une séance vide ». Trois pavés bleus empilés se
                  disputaient l'oeil sans qu'aucun ne dise plus lequel compte. */}
              <Button
                variant="tinted"
                className="h-9 min-h-0 shrink-0 gap-1 px-3.5 text-[14px]"
                onClick={() => navigate('/routines/nouvelle')}
              >
                <Plus size={16} strokeWidth={2.6} />
                Créer
              </Button>
              <button
                type="button"
                onClick={() => setListMenu(true)}
                aria-label="Autres actions sur mes séances"
                className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-alt text-ink-2 active:bg-line-2"
              >
                <MoreHorizontal size={18} strokeWidth={2.4} />
              </button>
            </div>
          )}
        </div>

        {routines.length === 0 && folders.length === 0 ? (
          <EmptyState
            title="Aucune séance enregistrée"
            action={
              <Button variant="tinted" onClick={() => setImportOpen(true)}>
                Importer un programme reçu
              </Button>
            }
          >
            Une séance enregistrée, c’est ton modèle : tu la construis une fois, et tu la
            relances en un tap sans avoir à retrouver tes exercices.
          </EmptyState>
        ) : (
          <div className="space-y-5">
            {folders.map((folder, folderIndex) => {
              const inside = routines.filter((r) => r.folderId === folder.id);
              const isCollapsed = collapsed.includes(folder.id);

              return (
                <section key={folder.id}>
                  <div className="mb-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleFolder(folder.id)}
                      aria-expanded={!isCollapsed}
                      className="pressable flex min-h-[40px] min-w-0 flex-1 items-center gap-1.5 text-left"
                    >
                      <ChevronRight
                        size={17}
                        strokeWidth={2.6}
                        className={cx(
                          'shrink-0 text-ink-3 transition-transform duration-200 ease-ease',
                          !isCollapsed && 'rotate-90',
                        )}
                      />
                      <span className="truncate font-display text-[15px] font-extrabold tracking-[-0.02em]">
                        {folder.name}
                      </span>
                      <span className="num shrink-0 text-[13px] text-ink-3">{inside.length}</span>
                    </button>

                    {ordering ? (
                      <MoveArrows
                        label={`le dossier ${folder.name}`}
                        isFirst={folderIndex === 0}
                        isLast={folderIndex === folders.length - 1}
                        onMove={(direction) => void moveFolder(folderIndex, direction)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFolderSheet(folder)}
                        aria-label={`Options du dossier ${folder.name}`}
                        className="pressable flex h-9 w-9 items-center justify-center rounded-lg text-ink-3"
                      >
                        <MoreHorizontal size={18} strokeWidth={2.4} />
                      </button>
                    )}
                  </div>

                  {!isCollapsed &&
                    (inside.length === 0 ? (
                      <p className="px-1 pb-1 text-[13px] text-ink-3">
                        Dossier vide. Range une séance ici depuis sa page de modification.
                      </p>
                    ) : (
                      <ul className="stagger space-y-2">{inside.map(renderRoutine)}</ul>
                    ))}
                </section>
              );
            })}

            {loose.length > 0 && (
              <section>
                {folders.length > 0 && (
                  <p className="mb-2 px-1 font-display text-[13px] font-bold uppercase tracking-[1.5px] text-ink-3">
                    Hors dossier
                  </p>
                )}
                <ul className="stagger space-y-2">{loose.map(renderRoutine)}</ul>
              </section>
            )}
          </div>
        )}

        {(routines.length > 0 || folders.length > 0) && (
          <Button variant="tinted" full className="mt-4" onClick={() => setImportOpen(true)}>
            Importer un programme reçu
          </Button>
        )}
      </div>

      {/* Barre d'actions de la selection, collee au-dessus des onglets. Elle
          n'apparait qu'avec une selection non vide : des boutons inertes
          laisseraient croire a un blocage. */}
      {selecting && selected.length > 0 && (
        <div
          className="fixed inset-x-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 56px)' }}
        >
          {/* Icone AU-DESSUS du libelle, et non a cote.
              A trois actions, la disposition en ligne ne tenait plus : trois
              libelles de 15 px plus leurs icones et leurs marges depassaient
              la largeur de l'ecran, et « Supprimer » se retrouvait coupe. Une
              colonne par action rend a chacune toute la largeur de sa case, et
              donne au passage une cible plus haute donc plus facile a viser. */}
          <div className="flex gap-2">
            <BulkAction
              icon={<Share size={18} strokeWidth={2.2} />}
              label="Partager"
              onClick={() => setSharing(routines.filter((r) => selected.includes(r.id)))}
            />
            {/* Dupliquer AVANT deplacer, dans l'ordre ou l'on s'en sert : on
                duplique pour ranger la copie ailleurs. */}
            <BulkAction
              icon={<Copy size={18} strokeWidth={2.2} />}
              label="Dupliquer"
              onClick={() => void duplicateSelected()}
            />
            <BulkAction
              icon={<FolderInput size={18} strokeWidth={2.2} />}
              label="Déplacer"
              onClick={() => setBulkAction('deplacer')}
            />
            <BulkAction
              icon={<Trash2 size={18} strokeWidth={2.2} />}
              label="Supprimer"
              tone="danger"
              onClick={() => setBulkAction('supprimer')}
            />
          </div>
        </div>
      )}

      {/* Choix du dossier de destination. « Hors dossier » est propose au meme
          rang que les autres : sortir des seances d'un dossier est un
          rangement comme un autre, pas une annulation. */}
      <Sheet
        open={bulkAction === 'deplacer'}
        onClose={() => setBulkAction(null)}
        title="Déplacer vers"
      >
        <div className="space-y-2 pb-2">
          <Button variant="secondary" full onClick={() => void moveSelected(null)}>
            Hors dossier
          </Button>
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant="secondary"
              full
              onClick={() => void moveSelected(folder.id)}
            >
              {folder.name}
            </Button>
          ))}
          {folders.length === 0 && (
            <p className="text-[14px] leading-relaxed text-ink-2">
              Tu n’as pas encore de dossier. Crée-en un depuis le menu « … », en haut de tes
              séances.
            </p>
          )}
        </div>
      </Sheet>

      <Sheet
        open={bulkAction === 'supprimer'}
        onClose={() => setBulkAction(null)}
        title="Supprimer les séances"
      >
        <div className="space-y-2 pb-2">
          <p className="text-[15px] leading-relaxed text-ink-2">
            {selected.length} séance{selected.length > 1 ? 's' : ''} enregistrée
            {selected.length > 1 ? 's' : ''} {selected.length > 1 ? 'seront' : 'sera'} supprimée
            {selected.length > 1 ? 's' : ''}.
          </p>
          <p className="text-[14px] leading-relaxed text-ink-2">
            Les séances déjà réalisées avec {selected.length > 1 ? 'elles' : 'elle'} restent dans
            ton historique : c’est le modèle qui disparaît, pas ce que tu as soulevé.
          </p>
          <Button variant="danger" full onClick={() => void deleteSelected()}>
            Oui, supprimer {selected.length} séance{selected.length > 1 ? 's' : ''}
          </Button>
          <Button variant="secondary" full onClick={() => setBulkAction(null)}>
            Annuler
          </Button>
        </div>
      </Sheet>

      <Sheet open={listMenu} onClose={() => setListMenu(false)} title="Organiser">
        <ul className="space-y-2 pb-2">
          <li>
            <MenuRow
              icon={<FolderPlus size={19} strokeWidth={2.3} />}
              label="Nouveau dossier"
              hint="Pour ranger tes séances par cycle ou par jour."
              onClick={() => {
                setListMenu(false);
                setFolderSheet('nouveau');
              }}
            />
          </li>
          {routines.length > 0 && (
            <li>
              <MenuRow
                icon={<ListChecks size={19} strokeWidth={2.3} />}
                label="Sélectionner des séances"
                hint="Pour en partager, déplacer ou supprimer plusieurs d’un coup."
                onClick={() => {
                  setListMenu(false);
                  setSelecting(true);
                }}
              />
            </li>
          )}
          {routines.length > 0 && (
            <li>
              <MenuRow
                icon={<Share size={19} strokeWidth={2.3} />}
                label="Partager des séances"
                hint="Envoie-les à un ami : il les importe dans son GymTrack."
                onClick={() => {
                  setListMenu(false);
                  setSelecting(true);
                }}
              />
            </li>
          )}
          {(folders.length > 1 || routines.length > 1) && (
            <li>
              <MenuRow
                icon={<ArrowUpDown size={19} strokeWidth={2.3} />}
                label="Changer l’ordre"
                hint="Pour ranger tes dossiers, et tes séances dans chaque dossier."
                onClick={() => {
                  setListMenu(false);
                  setOrdering(true);
                }}
              />
            </li>
          )}
        </ul>
      </Sheet>

      <SessionBusySheet open={busyOpen} onClose={() => setBusyOpen(false)} />

      <ImportProgramSheet open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />

      <ShareProgramSheet
        routines={sharing}
        onClose={() => setSharing([])}
        onShared={leaveSelection}
      />

      <FolderSheet
        target={folderSheet}
        onClose={() => setFolderSheet(null)}
        onChanged={load}
      />
    </div>
  );
}

/**
 * Action de la barre de selection : une icone, un libelle dessous.
 *
 * Ecrite ici plutot qu'avec la primitive `Button` a laquelle on passerait des
 * classes : entre deux utilitaires de meme propriete, c'est l'ordre dans la
 * feuille de style GENEREE qui tranche, pas l'ordre des classes sur
 * l'element. Un `px-2` ajoute au `px-5` de la primitive ne l'aurait donc pas
 * remplace de facon fiable, exactement comme le rappelle le commentaire des
 * variantes de couleur.
 */
function BulkAction({
  icon,
  label,
  tone = 'neutral',
  onClick,
}: {
  icon: ReactNode;
  label: string;
  tone?: 'neutral' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'pressable flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1',
        'font-display text-[12px] font-bold leading-none',
        tone === 'danger'
          ? 'bg-red-50 text-red-600 active:bg-red-100'
          : 'border-[1.5px] border-black/15 bg-white text-ink active:bg-alt',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/**
 * Paire de fleches empilees, pour deplacer une ligne d'un cran.
 *
 * Fleches et non glisser-deposer : la liste vit dans une page qui defile, et
 * un appui long qui tantot fait defiler tantot saisit la carte est le genre de
 * geste qu'on rate une fois sur trois avec le telephone dans une main.
 */
function MoveArrows({
  label,
  isFirst,
  isLast,
  onMove,
}: {
  label: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex shrink-0 flex-col">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={isFirst}
        aria-label={`Monter ${label}`}
        className="pressable flex h-8 w-9 items-center justify-center rounded-t-lg bg-alt text-ink-2 disabled:opacity-30"
      >
        <ArrowUp size={15} strokeWidth={2.6} />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={isLast}
        aria-label={`Descendre ${label}`}
        className="pressable mt-px flex h-8 w-9 items-center justify-center rounded-b-lg bg-alt text-ink-2 disabled:opacity-30"
      >
        <ArrowDown size={15} strokeWidth={2.6} />
      </button>
    </div>
  );
}

/** Ligne d'un menu : une icone, ce que fait l'action, et pourquoi. */
function MenuRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable pressable-wide flex w-full items-center gap-3 rounded-xl border border-line px-3 py-3 text-left active:bg-alt"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{label}</span>
        <span className="block text-[12px] leading-snug text-ink-2">{hint}</span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-ink-3" />
    </button>
  );
}

/** Creation, renommage et suppression d'un dossier. */
function FolderSheet({
  target,
  onClose,
  onChanged,
}: {
  target: RoutineFolder | 'nouveau' | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const isNew = target === 'nouveau';
  const folder = target !== null && target !== 'nouveau' ? target : null;
  const [name, setName] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setName(folder?.name ?? '');
    setConfirming(false);
  }, [folder]);

  if (target === null) return null;

  const submit = async (): Promise<void> => {
    if (isNew) await folderRepo.create(name);
    else if (folder) await folderRepo.save({ ...folder, name: name.trim() || folder.name });
    onChanged();
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={isNew ? 'Nouveau dossier' : 'Modifier le dossier'}>
      <div className="space-y-4 pb-2">
        <input
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Bloc 1, Prise de masse, Hiver…"
          aria-label="Nom du dossier"
          /* Focus automatique SEULEMENT a la creation : la feuille s'ouvre
             alors pour taper un nom, le clavier est attendu. Sur les options
             d'un dossier existant, on vient le plus souvent le ranger ou le
             supprimer : un clavier qui surgit masque la moitie de l'ecran et
             oblige a le refermer avant d'atteindre les boutons. */
          autoFocus={isNew}
          className="w-full rounded-xl bg-alt px-4 py-3 text-[16px] focus:bg-accent-soft focus:outline-none"
        />

        <Button full disabled={isNew && name.trim() === ''} onClick={() => void submit()}>
          {isNew ? 'Créer le dossier' : 'Enregistrer'}
        </Button>

        {folder && (
          /* Suppression en DEUX temps. Le bouton rouge etait a un pouce du
             champ de renommage : un tap malheureux effacait le dossier sans
             qu'on puisse revenir en arriere. */
          <>
            {confirming ? (
              <div className="space-y-2">
                <p className="text-[15px] leading-relaxed text-ink-2">
                  Supprimer le dossier <strong className="font-semibold text-ink">{folder.name}</strong> ?
                </p>
                <p className="text-[14px] leading-relaxed text-ink-2">
                  Les séances rangées dedans ne sont PAS supprimées : elles ressortent simplement
                  du dossier et se retrouvent à la racine.
                </p>
                <Button
                  variant="danger"
                  full
                  onClick={() => {
                    void folderRepo.remove(folder.id).then(() => {
                      setConfirming(false);
                      onChanged();
                      onClose();
                    });
                  }}
                >
                  Oui, supprimer le dossier
                </Button>
                <Button variant="secondary" full onClick={() => setConfirming(false)}>
                  Annuler
                </Button>
              </div>
            ) : (
              <>
                <Button variant="danger" full onClick={() => setConfirming(true)}>
                  Supprimer le dossier
                </Button>
                <p className="text-[13px] leading-relaxed text-ink-3">
                  Les séances rangées dedans ne sont pas supprimées : elles ressortent simplement
                  du dossier.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Seance en cours                                                             */
/* -------------------------------------------------------------------------- */

function LiveWorkout({
  workout,
  onFinished,
}: {
  workout: Workout;
  onFinished: (workout: Workout | null) => void;
}) {
  const store = useWorkoutStore();
  const exerciseRevision = useExerciseRevision();
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  const [previous, setPrevious] = useState<Map<string, WorkoutSet[]>>(new Map());
  const [settings, setSettings] = useState<Settings | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [plateOpen, setPlateOpen] = useState(false);
  const [menuEntryId, setMenuEntryId] = useState<string | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  // Fiche du mouvement, ouverte en tapant son nom dans la seance.
  const [detailed, setDetailed] = useState<Exercise | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [prMessage, setPrMessage] = useState<string | null>(null);
  // Serie dont on est en train de choisir le type.
  const [typeTarget, setTypeTarget] = useState<{ entryId: string; setId: string } | null>(null);

  // Le ref existait deja mais ne servait a rien : le champ restait haut d'une
  // ligne, et une description un peu longue ne se lisait que par sa fin.
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  useAutoGrow(descriptionRef, workout.notes);

  useEffect(() => {
    void settingsRepo.get().then(setSettings);
  }, []);

  // Chrono global : derive de startedAt, jamais decremente, pour rester juste
  // apres une mise en veille de l'ecran.
  useEffect(() => {
    const tick = (): void => setElapsed(Math.floor((Date.now() - workout.startedAt) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [workout.startedAt]);

  const exerciseIds = workout.entries.map((e) => e.exerciseId).join(',');

  /**
   * Fiches des mouvements, relues a chaque revision de la bibliotheque.
   *
   * C'est ce qui fait vivre le bandeau de note pendant la seance : on ouvre la
   * fiche d'un exercice depuis son nom, on y corrige le reglage de la machine,
   * on referme, et le bloc l'affiche. Sans cette dependance, la carte gardait
   * le texte charge au lancement de la seance jusqu'a ce qu'on en sorte.
   */
  useEffect(() => {
    void (async () => {
      const ids = [...new Set(exerciseIds.split(',').filter(Boolean))];
      const loaded = await Promise.all(ids.map((id) => exerciseRepo.get(id)));
      setExercises(new Map(loaded.filter((e): e is Exercise => !!e).map((e) => [e.id, e])));
    })();
  }, [exerciseIds, exerciseRevision]);

  /**
   * Derniere prestation sur chaque mouvement, pour la colonne « Precedent ».
   *
   * Effet SEPARE du precedent, et sans la revision en dependance : il parcourt
   * tout l'historique pour chaque exercice, et rien de ce qu'on ecrit sur une
   * fiche ne peut changer ce qui a ete souleve la fois d'avant.
   */
  useEffect(() => {
    void (async () => {
      const ids = [...new Set(exerciseIds.split(',').filter(Boolean))];
      const previousMap = new Map<string, WorkoutSet[]>();
      for (const id of ids) {
        const last = await workoutRepo.lastEntryFor(id);
        const entry = last?.workout.entries[last.entryIndex];
        if (entry) previousMap.set(id, workingSets(entry));
      }
      setPrevious(previousMap);
    })();
  }, [exerciseIds]);

  const handleToggleDone = useCallback(
    async (entryId: string, setId: string) => {
      const flash = await store.toggleSetDone(entryId, setId);
      if (flash) {
        prFeedback();
        const both = flash.kinds.includes('e1rm') && flash.kinds.includes('charge');
        setPrMessage(
          flash.month
            ? both
              ? 'Records du mois battus : force et charge.'
              : flash.kinds.includes('e1rm')
                ? 'Record de force du mois battu.'
                : 'Record de charge du mois battu.'
            : both
              ? 'Record de force et de charge battus.'
              : flash.kinds.includes('e1rm')
                ? 'Record de force battu.'
                : 'Record de charge battu.',
        );
        window.setTimeout(() => setPrMessage(null), 4000);
      } else {
        tapFeedback();
      }
    },
    [store],
  );

  const volume = useMemo(() => workoutVolume(workout), [workout]);
  const doneSets = useMemo(
    () => workout.entries.reduce((n, e) => n + entryWorkingSetCount(e), 0),
    [workout],
  );

  /**
   * Resume de la seance pour la feuille de reordonnancement.
   *
   * Le detail annonce les series FAITES sur le total : c'est ce qui dit si un
   * exercice est deja entame, donc s'il a encore un sens de le repousser plus
   * loin dans la seance.
   */
  const reorderItems = useMemo<ReorderItem[]>(() => {
    const runs = supersetRuns(workout.entries);
    const letters = supersetLetters(runs);
    return runs.flatMap((run, runIndex) =>
      run.map((entry, positionInRun) => {
        // Paliers d'une degressive comptes pour un, des deux cotes du « / ».
        const total = setGroups(entry.sets.filter((s) => s.type !== 'echauffement')).length;
        const done = entryWorkingSetCount(entry);
        const letter = run.length > 1 ? letters[runIndex] ?? null : null;
        return {
          id: entry.id,
          name: exercises.get(entry.exerciseId)?.name ?? 'Exercice supprimé',
          detail: `${done} / ${total} série${total > 1 ? 's' : ''} faite${done > 1 ? 's' : ''}`,
          supersetTag: letter ? `${letter}${positionInRun + 1}` : null,
        };
      }),
    );
  }, [workout.entries, exercises]);

  const showRpe = settings?.rpeEnabled ?? true;

  return (
    <div className="flex h-full flex-col">
      {/* Barre haute : chrono a gauche, Terminer a droite. */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-white/95 px-3 py-2 backdrop-blur">
        {/* Replier. En premiere position, la ou iOS place le retour : c'est le
            geste « je sors d'ici sans rien fermer », et il doit se distinguer
            du « Terminer » vert a l'autre bout de la barre, qui lui clot
            l'entrainement. La seance redescend en barre au-dessus des onglets,
            d'ou le chevron vers le bas. */}
        <button
          type="button"
          onClick={() => store.setMinimized(true)}
          aria-label="Réduire la séance"
          className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-alt text-ink-2 active:bg-line-2"
        >
          <ChevronDown size={22} strokeWidth={2.4} />
        </button>

        <button
          type="button"
          onClick={() => setPlateOpen(true)}
          aria-label="Calculateur de disques"
          className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-alt text-ink-2 active:bg-line-2"
        >
          {/* Disque vu de face, avec son trou central : c'est litteralement ce
              que l'athlete va charger sur la barre. Un chrono, herite de la
              capture Strong ou ce bouton servait au repos, ne disait rien de
              la fonction. */}
          <Disc size={21} strokeWidth={2.1} />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="num font-display text-[15px] font-black tabular-nums">
            {formatElapsed(elapsed)}
          </p>
          <p className="text-[11px] text-ink-3">
            {doneSets} série{doneSets > 1 ? 's' : ''}
            {volume > 0 ? ` · ${Math.round(volume)} kg` : ''}
          </p>
        </div>

        <Button
          variant="success"
          onClick={() => void store.finish().then(onFinished)}
          className="shrink-0 px-4"
        >
          Terminer
        </Button>
      </header>

      <div className="scroll-area flex-1 pb-8">
        {/* Titre + duree + description, comme dans la capture. */}
        <div className="px-4 pb-2 pt-4">
          <input
            value={workout.name}
            onChange={(e) => void store.setName(e.currentTarget.value)}
            aria-label="Nom de la séance"
            className="w-full bg-transparent font-display text-[27px] font-black leading-tight tracking-[-1px] focus:outline-none"
          />
          <textarea
            ref={descriptionRef}
            value={workout.notes}
            onChange={(e) => void store.setDescription(e.currentTarget.value)}
            rows={1}
            placeholder="Description"
            aria-label="Description de la séance"
            className="mt-1 w-full resize-none overflow-hidden bg-transparent text-[15px] text-ink-2 placeholder:text-ink-3 focus:outline-none"
          />
        </div>

        {prMessage && (
          <div className="px-4 pb-2">
            <Banner tone="pr">{prMessage}</Banner>
          </div>
        )}

        {workout.entries.length === 0 ? (
          <EmptyState title="Séance vide">
            Ajoute ton premier exercice pour commencer à enregistrer tes séries.
          </EmptyState>
        ) : (
          /**
           * PAS de `divide-y` ici, et c'est un piege reellement vecu : la
           * classe de couleur generee par Tailwind
           * (`.divide-line > :not([hidden]) ~ :not([hidden])`) impose une
           * `border-color` sur TOUTES les bordures de chaque enfant sauf le
           * premier, avec une specificite superieure a `border-accent`. Le
           * filet du superset virait donc au gris sur tous les blocs sauf le
           * premier. Chaque unite trace elle-meme son trait de separation.
           */
          <div>
            {(() => {
              const runs = supersetRuns(workout.entries);
              const letters = supersetLetters(runs);
              return runs.map((run, runIndex) => {
              const first = run[0];
              if (!first) return null;
              const isSuperset = run.length > 1;
              const letter = letters[runIndex];

              const blocks = run.map((entry, positionInRun) => {
                const index = workout.entries.indexOf(entry);
                return (
                  <ExerciseBlock
                    key={entry.id}
                    entry={entry}
                    exercise={exercises.get(entry.exerciseId)}
                    previousSets={previous.get(entry.exerciseId) ?? []}
                    showRpe={showRpe}
                    // Rang dans le superset : « A1 », « A2 »… la notation des
                    // programmes ecrits. Rien pour un exercice seul.
                    supersetTag={letter ? `${letter}${positionInRun + 1}` : null}
                    linkedToPrevious={isSuperset && entry !== first}
                    canLink={index > 0}
                    onOpenDetail={() => setDetailed(exercises.get(entry.exerciseId) ?? null)}
                    onOpenMenu={() => setMenuEntryId(entry.id)}
                    onToggleSuperset={() => void store.toggleSuperset(entry.id)}
                    onAddSet={() => void store.addSet(entry.id)}
                    onChangeSet={(setId, patch) => void store.updateSet(entry.id, setId, patch)}
                    onOpenSetMenu={(setId) => setTypeTarget({ entryId: entry.id, setId })}
                    onToggleSetDone={(setId) => void handleToggleDone(entry.id, setId)}
                    onChangeNotes={(notes) => void store.setEntryNotes(entry.id, notes)}
                  />
                );
              });

              /**
               * L'enveloppe est partagee avec l'editeur de routine, la fiche
               * d'une routine et l'historique : un superset doit se lire
               * pareil partout, sinon le repere se reapprend a chaque ecran.
               */
              return (
                <SupersetGroup
                  key={first.id}
                  letter={isSuperset ? letter ?? null : null}
                  count={run.length}
                >
                  {blocks}
                </SupersetGroup>
              );
              });
            })()}
          </div>
        )}

        <div className="space-y-2 px-4 pt-5">
          <Button variant="tinted" full onClick={() => setPickerOpen(true)}>
            Ajouter des exercices
          </Button>
          {/* A partir de deux exercices seulement : proposer de reordonner une
              liste d'un seul element serait une porte qui ne mene nulle part. */}
          {workout.entries.length > 1 && (
            <Button variant="secondary" full onClick={() => setReorderOpen(true)}>
              <ArrowUpDown size={17} strokeWidth={2.2} />
              Réorganiser les exercices
            </Button>
          )}
          <Button variant="danger" full onClick={() => setCancelOpen(true)}>
            Annuler la séance
          </Button>
        </div>
      </div>


      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(ids) => void store.addExercises(ids)}
      />

      {settings && (
        <PlateCalculator
          open={plateOpen}
          onClose={() => setPlateOpen(false)}
          initialWeightKg={0}
          barWeightsKg={settings.barWeightsKg}
          availablePlatesKg={settings.availablePlatesKg}
        />
      )}

      <ExerciseMenu
        entryId={menuEntryId}
        workout={workout}
        exercises={exercises}
        onClose={() => setMenuEntryId(null)}
      />

      <ReorderSheet
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        items={reorderItems}
        onMove={(id, direction) => void store.reorderEntry(id, direction)}
      />

      <ExerciseDetailSheet
        exercise={detailed}
        onClose={() => setDetailed(null)}
        onChanged={(updated) => {
          setDetailed(updated);
          setExercises((prev) => new Map(prev).set(updated.id, updated));
        }}
      />

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Annuler la séance">
        <p className="pb-4 text-[15px] leading-relaxed text-ink-2">
          Tout ce que tu as enregistré depuis le début de cette séance sera perdu, y compris les
          séries déjà validées. Cette action est définitive.
        </p>
        <div className="space-y-2 pb-2">
          <Button
            variant="danger"
            full
            onClick={() => {
              void store.cancel();
              setCancelOpen(false);
            }}
          >
            Oui, annuler la séance
          </Button>
          <Button variant="secondary" full onClick={() => setCancelOpen(false)}>
            Continuer la séance
          </Button>
        </div>
      </Sheet>

      {typeTarget && (() => {
        const entry = workout.entries.find((e) => e.id === typeTarget.entryId);
        const index = entry?.sets.findIndex((s) => s.id === typeTarget.setId) ?? -1;
        const target = index >= 0 ? entry?.sets[index] : undefined;
        if (!target) return null;
        return (
          <SetMenu
            current={target.type}
            toFailure={isToFailure(target)}
            dropStart={target.dropStart === true}
            // La question ne se pose que si la serie du dessus est elle aussi
            // une degressive : ailleurs, rien ne peut se rattacher.
            canDetach={target.type === 'drop' && entry?.sets[index - 1]?.type === 'drop'}
            setNumber={index + 1}
            onSelect={(type) => void store.setSetType(typeTarget.entryId, typeTarget.setId, type)}
            onToggleFailure={() => {
              /**
               * Retirer l'echec sur une serie du TYPE historique 'echec' la
               * ramene a une serie normale : le type portait a lui seul
               * l'information, la vider ne peut pas laisser le type en place.
               */
              const next = !isToFailure(target);
              if (!next && target.type === 'echec') {
                void store.setSetType(typeTarget.entryId, typeTarget.setId, 'normale');
              }
              void store.updateSet(typeTarget.entryId, typeTarget.setId, { toFailure: next });
            }}
            onToggleDropStart={() =>
              void store.updateSet(typeTarget.entryId, typeTarget.setId, {
                dropStart: target.dropStart !== true,
              })
            }
            onClose={() => setTypeTarget(null)}
            onInsertBefore={() =>
              void store.insertSetBefore(typeTarget.entryId, typeTarget.setId)
            }
            onDelete={() => void store.removeSet(typeTarget.entryId, typeTarget.setId)}
            // Un exercice sans aucune serie n'a plus de sens : c'est l'exercice
            // entier qu'on retire alors, depuis son propre menu.
            canDelete={(entry?.sets.length ?? 0) > 1}
            confirmDelete={target.done}
          />
        );
      })()}

    </div>
  );
}
