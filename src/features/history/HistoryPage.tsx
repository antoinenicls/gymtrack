/** Historique chronologique, avec recherche par exercice ou par nom de séance. */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, Search, Trash2 } from 'lucide-react';
import type { Exercise, Workout } from '@/types/domain';
import { exerciseRepo, workoutRepo } from '@/services/repositories';
import { entryWorkingSetCount, formatDuration, formatVolume, workoutVolume } from '@/lib/metrics';
import { buildHistoryCsv } from '@/lib/exports';
import { datedFilename, downloadTextFile } from '@/lib/download';
import { Button, EmptyState, PageTitle, PrBadge, Sheet, cx } from '@/ui/primitives';

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  const [query, setQuery] = useState('');
  /**
   * Mode selection. Il s'ACTIVE explicitement plutot que d'exister en
   * permanence : hors de ce mode, un tap ouvre la seance, ce qui est le geste
   * de tous les jours. Faire cohabiter les deux sans bascule obligerait a viser
   * une petite case a cocher a chaque consultation.
   */
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void (async () => {
      setWorkouts(await workoutRepo.all());
      setExercises(new Map((await exerciseRepo.all()).map((e) => [e.id, e])));
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    if (needle === '') return workouts;
    return workouts.filter((workout) => {
      if (normalize(workout.name).includes(needle)) return true;
      return workout.entries.some((entry) =>
        normalize(exercises.get(entry.exerciseId)?.name ?? '').includes(needle),
      );
    });
  }, [workouts, query, exercises]);

  const toggle = (id: string): void =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const leaveSelection = (): void => {
    setSelecting(false);
    setSelected([]);
  };

  /**
   * Ne porte que sur ce qui est A L'ECRAN. Avec une recherche active, « tout
   * selectionner » ne doit pas ramasser des seances que l'utilisateur ne voit
   * pas : il en supprimerait sans les avoir jamais eues sous les yeux.
   */
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((w) => selected.includes(w.id));

  const toggleAllVisible = (): void => {
    const visibleIds = filtered.map((w) => w.id);
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])],
    );
  };

  const exportSelection = (): void => {
    downloadTextFile(
      buildHistoryCsv(
        workouts.filter((w) => selected.includes(w.id)),
        exercises,
      ),
      datedFilename('gymtrack-selection'),
    );
  };

  const deleteSelection = async (): Promise<void> => {
    // En un seul appel : `remove` rejouerait l'historique pour recalculer les
    // records a chaque tour de boucle.
    await workoutRepo.removeMany(selected);
    setConfirmDelete(false);
    leaveSelection();
    setWorkouts(await workoutRepo.all());
  };

  return (
    <div className={cx('pb-6', selecting && 'pb-28')}>
      <PageTitle sub={`${workouts.length} séance${workouts.length > 1 ? 's' : ''} enregistrée${workouts.length > 1 ? 's' : ''}`}>
        Historique
      </PageTitle>

      <div className="flex items-center gap-2 px-4 pt-2">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Rechercher une séance ou un exercice"
            aria-label="Rechercher"
            className="w-full rounded-xl bg-alt py-3 pl-10 pr-3 text-[16px] focus:bg-accent-soft focus:outline-none"
          />
        </div>
        {workouts.length > 0 && (
          <Button
            variant="ghost"
            className="shrink-0 px-2 text-accent"
            onClick={() => (selecting ? leaveSelection() : setSelecting(true))}
          >
            {selecting ? 'Annuler' : 'Sélectionner'}
          </Button>
        )}
      </div>

      {selecting && filtered.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <p className="text-[14px] font-semibold text-ink-2">
            {selected.length === 0
              ? 'Touche les séances à traiter'
              : `${selected.length} séance${selected.length > 1 ? 's' : ''} sélectionnée${selected.length > 1 ? 's' : ''}`}
          </p>
          <button
            type="button"
            onClick={toggleAllVisible}
            className="shrink-0 text-[14px] font-semibold text-accent"
          >
            {allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title={query ? 'Aucun résultat' : 'Pas encore de séance'}>
          {query
            ? 'Essaie un autre nom d’exercice ou de séance.'
            : 'Tes séances terminées apparaîtront ici, avec le détail de chaque série.'}
        </EmptyState>
      ) : (
        <ul className="stagger mt-3 space-y-2 px-4">
          {filtered.map((workout) => {
            const sets = workout.entries.reduce((n, e) => n + entryWorkingSetCount(e), 0);
            const hasPr = workout.entries.some((e) =>
              e.sets.some((s) => (s.prKinds?.length ?? 0) > 0),
            );
            const hasMonthPr = workout.entries.some((e) =>
              e.sets.some((s) => (s.monthPrKinds?.length ?? 0) > 0),
            );
            const isSelected = selected.includes(workout.id);

            const content = (
              <>
                {selecting && (
                  <span
                    className={cx(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-200',
                      isSelected
                        ? 'border-accent bg-accent text-white'
                        : 'border-line-2 bg-white text-transparent',
                    )}
                  >
                    <Check size={15} strokeWidth={3} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[16px] font-extrabold tracking-[-0.03em]">
                        {workout.name}
                      </span>
                      <span className="mt-0.5 block text-[13px] capitalize text-ink-2">
                        {DATE_FMT.format(new Date(workout.startedAt))}
                      </span>
                    </span>
                    {hasPr ? <PrBadge /> : hasMonthPr && <PrBadge month />}
                  </span>

                  <span className="num mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
                    <span>{formatDuration(workout.durationSec ?? 0)}</span>
                    <span>{formatVolume(workoutVolume(workout))}</span>
                    <span>
                      {sets} série{sets > 1 ? 's' : ''}
                    </span>
                    <span>
                      {workout.entries.length} exercice{workout.entries.length > 1 ? 's' : ''}
                    </span>
                  </span>
                </span>
              </>
            );

            return (
              <li key={workout.id}>
                {/* En selection, la carte COCHE au lieu d'ouvrir : deux gestes
                    differents sur la meme cible seraient une source d'erreur,
                    et une suppression par megarde ne se rattrape pas. */}
                {selecting ? (
                  <button
                    type="button"
                    onClick={() => toggle(workout.id)}
                    aria-pressed={isSelected}
                    className={cx(
                      'pressable pressable-wide card flex w-full gap-3 p-3.5 text-left',
                      isSelected && 'border-accent bg-accent-soft/50',
                    )}
                  >
                    {content}
                  </button>
                ) : (
                  <Link
                    to={`/historique/${workout.id}`}
                    className="pressable pressable-wide card flex gap-3 p-3.5"
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Barre d'actions, collee au-dessus de la barre d'onglets. Elle
          n'apparait qu'avec une selection non vide : des boutons inertes
          laisseraient croire a un blocage. */}
      {selecting && selected.length > 0 && (
        <div
          className="fixed inset-x-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 56px)' }}
        >
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={exportSelection}>
              <Download size={17} strokeWidth={2.2} />
              Exporter
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={17} strokeWidth={2.2} />
              Supprimer
            </Button>
          </div>
        </div>
      )}

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Supprimer les séances"
      >
        <div className="pb-2">
          <p className="text-[15px] leading-relaxed text-ink-2">
            {selected.length} séance{selected.length > 1 ? 's' : ''} et{' '}
            {selected.length > 1 ? 'leurs séries seront retirées' : 'ses séries seront retirées'} de
            ton historique et de tes statistiques. Tes records sont recalculés sur ce qu’il reste :
            ceux qui venaient de {selected.length > 1 ? 'ces séances' : 'cette séance'} redescendent
            à ta meilleure performance conservée.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-3">
            C’est définitif. Tu peux exporter la sélection avant, si tu veux en garder une trace.
          </p>

          <div className="mt-5 space-y-2">
            <Button variant="danger" full onClick={() => void deleteSelection()}>
              Oui, supprimer {selected.length} séance{selected.length > 1 ? 's' : ''}
            </Button>
            <Button variant="secondary" full onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
