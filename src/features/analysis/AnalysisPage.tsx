/**
 * Ecran Analyse.
 *
 * La page ne CONNAIT aucune analyse : elle charge les donnees, choisit ce qui
 * est examine, puis rend les cartes que le catalogue lui donne, dans l'ordre
 * voulu par l'utilisateur. Toute la matiere vit dans `cards.tsx` et dans
 * `lib/analytics.ts`.
 *
 * Deux choses peuvent etre examinees. L'HISTORIQUE, ce qui a ete fait sur une
 * fenetre de quelques semaines. Le PROGRAMME, une semaine type composee de
 * routines, qui se juge avant meme d'etre suivie et que l'ancien programme ne
 * vient pas brouiller juste apres un changement.
 */

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import type {
  AnalysisMode,
  Exercise,
  PersonalRecord,
  PlanPick,
  Routine,
  RoutineFolder,
  Settings,
  Workout,
} from '@/types/domain';
import {
  exerciseRepo,
  folderRepo,
  recordRepo,
  routineRepo,
  settingsRepo,
  workoutRepo,
} from '@/services/repositories';
import { weeklyStats } from '@/lib/analytics';
import { pickedRoutines, plannedReps, plannedSessions, plannedWeek } from '@/lib/plannedWeek';
import { Button, EmptyState, IconButton, PageTitle, cx } from '@/ui/primitives';
import CustomizeSheet from './CustomizeSheet';
import PlanSheet from './PlanSheet';
import { sortedCards, visibleCards, type AnalysisContext } from './cards';

/** Profondeurs proposees, en semaines. */
const WINDOWS = [8, 12, 26] as const;

const DEFAULT_WEEKS = 12;

const MODES: Array<{ value: AnalysisMode; label: string }> = [
  { value: 'historique', label: 'Historique' },
  { value: 'programme', label: 'Programme' },
];

export default function AnalysisPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [folders, setFolders] = useState<RoutineFolder[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [planning, setPlanning] = useState(false);

  useEffect(() => {
    void (async () => {
      setWorkouts(await workoutRepo.all());
      setExercises(new Map((await exerciseRepo.all()).map((e) => [e.id, e])));
      setRecords(await recordRepo.all());
      setRoutines(await routineRepo.all());
      setFolders(await folderRepo.all());
      setSettings(await settingsRepo.get());
    })();
  }, []);

  /**
   * Le reglage est ecrit tout de suite : l'ecran doit survivre a un aller-retour.
   *
   * Le correctif accepte AUSSI une fonction, et ce n'est pas une commodite : un
   * appelant qui calcule son patch a partir des reglages recus en props les lit
   * tels qu'ils etaient au dernier rendu. Cet ecran redessine douze cartes a
   * chaque changement, donc deux appuis rapproches partagent le meme rendu, se
   * fondent sur le meme etat de depart et produisent le meme patch : la seconde
   * bascule est perdue. Passer par `prev` fait lire l'etat reel a chacun.
   */
  const patchSettings = (
    patch: Partial<Settings> | ((prev: Settings) => Partial<Settings>),
  ): void => {
    setSettings((current) => {
      if (!current) return current;
      const next = { ...current, ...(typeof patch === 'function' ? patch(current) : patch) };
      void settingsRepo.save(next);
      return next;
    });
  };

  const patchPlan = (update: (prev: PlanPick[]) => PlanPick[]): void => {
    patchSettings((prev) => ({ analysisPlan: update(prev.analysisPlan ?? []) }));
  };

  const mode: AnalysisMode = settings?.analysisMode ?? 'historique';
  const weekCount = settings?.analysisWeeks ?? DEFAULT_WEEKS;
  const picks = useMemo(() => settings?.analysisPlan ?? [], [settings?.analysisPlan]);

  const weeks = useMemo(() => weeklyStats(workouts, weekCount), [workouts, weekCount]);

  const context = useMemo<AnalysisContext | null>(() => {
    if (!settings) return null;

    if (mode === 'programme') {
      const planned = plannedWeek(routines, picks);
      return {
        mode,
        workouts: planned,
        allWorkouts: planned,
        exercises,
        records,
        weeks: [],
        // Une semaine type est, par definition, une semaine.
        weekCount: 1,
        settings,
        plan: {
          sessions: plannedSessions(routines, picks),
          reps: plannedReps(routines, picks),
          picked: pickedRoutines(routines, picks),
        },
      };
    }

    const from = weeks[0]?.start ?? 0;
    return {
      mode,
      workouts: workouts.filter((workout) => workout.startedAt >= from),
      allWorkouts: workouts,
      exercises,
      records,
      weeks,
      weekCount,
      settings,
    };
  }, [mode, workouts, routines, picks, exercises, records, weeks, weekCount, settings]);

  if (!settings || !context) {
    return (
      <div>
        <PageTitle>Analyse</PageTitle>
      </div>
    );
  }

  const cards = visibleCards(settings, context);
  const pickedNames = picks
    .flatMap((pick) => {
      const routine = routines.find((r) => r.id === pick.routineId);
      if (!routine || pick.times <= 0) return [];
      return [pick.times > 1 ? `${routine.name} ×${pick.times}` : routine.name];
    })
    .join(' · ');
  const sessions = context.plan?.sessions ?? 0;

  return (
    <div className="pb-10">
      <PageTitle
        sub={
          mode === 'programme'
            ? 'Ta semaine type, telle que prévue'
            : `Les ${weekCount} dernières semaines`
        }
      >
        Analyse
      </PageTitle>

      <div className="px-4 pt-1">
        <div className="flex gap-1 rounded-xl bg-alt p-1">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={option.value === mode}
              onClick={() => patchSettings({ analysisMode: option.value })}
              className={cx(
                'pressable min-h-[36px] flex-1 rounded-lg text-[13px] font-bold transition-colors',
                option.value === mode ? 'bg-white text-accent shadow-sm' : 'text-ink-2',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'historique' ? (
        <div className="flex items-center gap-2 px-4 pt-2">
          <div className="flex flex-1 gap-1 rounded-xl bg-alt p-1">
            {WINDOWS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => patchSettings({ analysisWeeks: value })}
                className={cx(
                  'pressable min-h-[36px] flex-1 rounded-lg text-[13px] font-bold transition-colors',
                  value === weekCount ? 'bg-white text-accent shadow-sm' : 'text-ink-2',
                )}
              >
                {value} sem.
              </button>
            ))}
          </div>
          {/* Absent en mode programme : il affiche toutes ses cartes, et
              ranger celles-ci reecrirait l'ordre de l'historique. */}
          <IconButton
            label="Personnaliser l’analyse"
            className="text-accent"
            onClick={() => setCustomizing(true)}
          >
            <SlidersHorizontal size={18} strokeWidth={2.4} className="shrink-0" />
          </IconButton>
        </div>
      ) : (
        sessions > 0 && (
          <div className="px-4 pt-2">
            <button
              type="button"
              onClick={() => setPlanning(true)}
              className="pressable pressable-wide flex min-h-[52px] w-full items-center gap-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-accent">
                  {sessions} séance{sessions > 1 ? 's' : ''} par semaine
                </span>
                <span className="block truncate text-[13px] text-ink-2">{pickedNames}</span>
              </span>
              <span className="shrink-0 text-[13px] font-bold text-accent">Modifier</span>
              <ChevronRight size={16} className="-ml-2 shrink-0 text-accent" />
            </button>
          </div>
        )
      )}

      {mode === 'programme' && sessions === 0 ? (
        <EmptyState
          title="Compose ta semaine type"
          action={
            <Button variant="tinted" onClick={() => setPlanning(true)}>
              Choisir mes séances
            </Button>
          }
        >
          Choisis les séances de ton programme, et vois avant même de le suivre si chaque muscle
          reçoit son volume, sa fréquence et ses répétitions.
        </EmptyState>
      ) : mode === 'historique' && workouts.length === 0 ? (
        <EmptyState title="Rien à analyser pour l’instant">
          Enregistre quelques séances, et tu verras apparaître ici tes tendances de volume, de
          fréquence et de progression, exercice par exercice.
        </EmptyState>
      ) : cards.length === 0 ? (
        <EmptyState
          title="Aucune carte affichée"
          action={
            <Button variant="tinted" onClick={() => setCustomizing(true)}>
              Choisir ce que j’affiche
            </Button>
          }
        >
          Tu as masqué toutes les analyses. Rappelle celles qui te servent.
        </EmptyState>
      ) : (
        <div className="mt-6 space-y-7 px-4">
          {cards.map((card, index) => (
            <section
              key={`${mode}-${card.id}`}
              className="animate-item-in"
              // Entree en cascade : les cartes se posent l'une apres l'autre,
              // ce qui donne un sens de lecture au lieu d'un bloc qui apparait.
              style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
            >
              <h2 className="section-label">{card.title}</h2>
              <div className="mt-2">{card.render(context)}</div>
            </section>
          ))}
        </div>
      )}

      <CustomizeSheet
        open={customizing}
        onClose={() => setCustomizing(false)}
        cards={sortedCards(settings, context)}
        settings={settings}
        onChange={patchSettings}
      />

      <PlanSheet
        open={planning}
        onClose={() => setPlanning(false)}
        routines={routines}
        folders={folders}
        picks={picks}
        onChange={patchPlan}
      />
    </div>
  );
}
