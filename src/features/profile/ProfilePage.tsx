/** Profil : flamme de regularite, assiduite, objectif hebdomadaire, records. */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Minus, Plus, Settings } from 'lucide-react';
import type { Exercise, PersonalRecord, Settings as AppSettings, Workout } from '@/types/domain';
import { exerciseRepo, recordRepo, settingsRepo, workoutRepo } from '@/services/repositories';
import { bucketByWeek, daysTrainedThisWeek, weekStreak } from '@/lib/weekly';
import { entryWorkingSetCount, formatVolume, formatWeight, workoutVolume } from '@/lib/metrics';
import { Card, EmptyState, PageTitle, SectionLabel, Stat, cx } from '@/ui/primitives';
import WeeklyGoalWidget from './WeeklyGoalWidget';
import YearHeatmap from './YearHeatmap';
import StreakCard from './StreakCard';
import FeedbackLink from '@/features/feedback/FeedbackLink';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKS_SHOWN = 8;
const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const DAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
/** Sept jours dans une semaine : au-dela, l'objectif ne veut plus rien dire. */
const MAX_GOAL = 7;

export default function ProfilePage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    void (async () => {
      setWorkouts(await workoutRepo.all());
      setRecords(await recordRepo.all());
      setExercises(new Map((await exerciseRepo.all()).map((e) => [e.id, e])));
      setSettings(await settingsRepo.get());
    })();
  }, []);

  const startedAt = useMemo(() => workouts.map((w) => w.startedAt), [workouts]);
  const weeks = useMemo(() => bucketByWeek(startedAt, WEEKS_SHOWN), [startedAt]);
  const days = useMemo(() => daysTrainedThisWeek(startedAt), [startedAt]);

  // Ecrete aussi a la lecture : un reglage enregistre avant ce plafond (l'ancien
  // maximum etait 14) doit se rattraper tout seul, sans migration.
  const goal = Math.min(MAX_GOAL, settings?.weeklyGoal ?? 0);
  const thisWeek = weeks[weeks.length - 1];
  // Sur tout l'historique, et non sur les huit semaines du graphique : une
  // flamme plafonnee a 8 mentirait des la neuvieme semaine.
  const streak = useMemo(() => weekStreak(startedAt, goal), [startedAt, goal]);

  const last7 = workouts.filter((w) => w.startedAt > Date.now() - WEEK_MS);
  const weekVolume = last7.reduce((sum, w) => sum + workoutVolume(w), 0);
  const weekSets = last7.reduce(
    (n, w) => n + w.entries.reduce((m, e) => m + entryWorkingSetCount(e), 0),
    0,
  );

  const setGoal = (next: number): void => {
    if (!settings) return;
    // Plafond a 7 : une semaine ne compte pas plus de sept jours, et l'objectif
    // se lit « combien de jours par semaine », pas « combien de seances ».
    const clamped = Math.max(0, Math.min(MAX_GOAL, next));
    const updated = { ...settings, weeklyGoal: clamped };
    setSettings(updated);
    void settingsRepo.save(updated);
  };

  const topRecords = useMemo(
    () =>
      records
        .filter((r) => r.bestE1rm !== null)
        .sort((a, b) => (b.bestE1rm?.value ?? 0) - (a.bestE1rm?.value ?? 0))
        .slice(0, 8),
    [records],
  );

  return (
    <div className="pb-8">
      <div className="flex items-start justify-between px-4 pt-1">
        <PageTitle sub="Ce que disent tes chiffres">Profil</PageTitle>
        <Link
          to="/profil/reglages"
          aria-label="Réglages"
          className="pressable mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-alt text-ink-2"
        >
          <Settings size={20} strokeWidth={2.2} />
        </Link>
      </div>

      {/* La flamme et le total. Il n'y a pas de compte : la carte qui
          l'evoquait (avatar, « Mes entraînements ») donnait envie de la
          toucher sans que rien ne se passe. On montre les chiffres. */}
      <div className="mt-3 px-4">
        <StreakCard streak={streak} totalWorkouts={workouts.length} />
      </div>

      {/* Objectif hebdomadaire. */}
      <section className="mt-6 px-4">
        <SectionLabel>Objectif hebdomadaire</SectionLabel>

        <Card className="mt-2 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="num font-display text-[26px] font-black leading-none">
                {thisWeek?.count ?? 0}
                <span className="text-[16px] text-ink-3">
                  {goal > 0 ? ` / ${goal}` : ''}
                </span>
              </p>
              <p className="mt-1 text-[12px] text-ink-2">
                {goal === 0
                  ? 'Aucun objectif fixé'
                  : (thisWeek?.count ?? 0) >= goal
                    ? 'Objectif atteint cette semaine'
                    : `Encore ${goal - (thisWeek?.count ?? 0)} cette semaine`}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setGoal(goal - 1)}
                disabled={goal <= 0}
                aria-label="Diminuer l’objectif"
                className="pressable flex h-10 w-10 items-center justify-center rounded-xl bg-alt text-ink-2 disabled:opacity-30"
              >
                <Minus size={17} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setGoal(goal + 1)}
                disabled={goal >= MAX_GOAL}
                aria-label="Augmenter l’objectif"
                className="pressable flex h-10 w-10 items-center justify-center rounded-xl bg-alt text-ink-2 disabled:opacity-30"
              >
                <Plus size={17} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Jours de la semaine en cours. */}
          <div className="mt-4 flex gap-1.5">
            {days.map((trained, index) => (
              <div key={index} className="flex-1 text-center">
                <span
                  className={cx(
                    'block h-1.5 rounded-pill transition-colors duration-300 ease-ease',
                    trained ? 'bg-done' : 'bg-alt',
                  )}
                />
                <span
                  className={cx(
                    'mt-1 block text-[10px] font-semibold',
                    trained ? 'text-done' : 'text-ink-3',
                  )}
                >
                  {DAY_INITIALS[index]}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <WeeklyGoalWidget weeks={weeks} goal={goal} />
          </div>

        </Card>
      </section>

      {/* Regularite sur l'annee, jour par jour. */}
      <section className="mt-6 px-4">
        <SectionLabel>Régularité</SectionLabel>
        <Card className="mt-2 p-4">
          <YearHeatmap startedAt={startedAt} />
        </Card>
      </section>

      {/* Volume des 7 derniers jours. */}
      <div className="mt-6 grid grid-cols-3 gap-3 px-4">
        <Stat value={formatVolume(weekVolume)} label="Volume 7 jours" accent="accent" />
        <Stat value={String(last7.length)} label="Séances 7 jours" />
        <Stat value={String(weekSets)} label="Séries 7 jours" />
      </div>

      <section className="mt-8 px-4">
        <SectionLabel>Records</SectionLabel>
        {topRecords.length === 0 ? (
          <EmptyState title="Pas encore de record">
            Dès ta première série validée, tes records apparaîtront ici et se mettront à jour tout
            seuls.
          </EmptyState>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
            {topRecords.map((record) => {
              const exercise = exercises.get(record.exerciseId);
              const best = record.bestE1rm;
              if (!best) return null;
              return (
                <li key={record.exerciseId}>
                  <Link
                    to={`/exercices/${record.exerciseId}`}
                    className="pressable pressable-wide flex min-h-[56px] items-center gap-3 px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">
                        {exercise?.name ?? 'Exercice supprimé'}
                      </span>
                      <span className="num block text-[13px] text-ink-2">
                        {formatWeight(best.weightKg)} kg × {best.reps} ·{' '}
                        {DATE_FMT.format(new Date(best.achievedAt))}
                      </span>
                    </span>
                    <span className="num shrink-0 font-display text-[16px] font-black text-pr">
                      {formatWeight(best.value)}
                      <span className="ml-0.5 text-[12px] text-ink-3">kg</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-ink-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {topRecords.length > 0 && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
            Le chiffre en ambre est ton 1RM estimé, calculé avec la formule de Brzycki. Il compare
            honnêtement une série lourde et courte à une série plus légère et longue.
          </p>
        )}
      </section>

      <section className="mt-8 px-4">
        <FeedbackLink />
      </section>
    </div>
  );
}
