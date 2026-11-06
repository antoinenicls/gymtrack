/**
 * Catalogue des cartes de l'ecran Analyse.
 *
 * Chaque carte est une entree de ce tableau : un identifiant stable, un titre,
 * une phrase qui dit ce qu'elle apprend, et son rendu. L'ecran ne fait
 * qu'ordonner et filtrer ce catalogue selon les reglages. Ajouter une analyse
 * revient donc a ajouter un objet ici, sans toucher a la page.
 *
 * L'identifiant est ECRIT A LA MAIN et ne doit jamais changer : c'est lui qui
 * est range dans les reglages de l'utilisateur. Le renommer masquerait ou
 * ferait reapparaitre des cartes au hasard des mises a jour.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from 'lucide-react';
import type { AnalysisMode, Exercise, PersonalRecord, Settings, Workout } from '@/types/domain';
import { MUSCLE_GROUP_LABELS } from '@/data/seedExercises';
import {
  EXERCISE_METRIC_LABELS,
  averageDensity,
  averageDuration,
  dailyStreak,
  dormantExercises,
  exerciseSeries,
  metricValue,
  muscleLoad,
  recentRecords,
  trainedExercises,
  trainingGrid,
  trendPercent,
  type ExerciseMetric,
  type WeekStat,
} from '@/lib/analytics';
import {
  NORMS,
  absentGroups,
  formatAdvice,
  muscleNorms,
  repsSpread,
  sessionSetCounts,
  stateOf,
  type MuscleNormRow,
  type NormRange,
  type NormState,
  type RepsSpread,
} from '@/lib/norms';
import type { PickedRoutine, PlannedReps } from '@/lib/plannedWeek';
import {
  DURATION_ASSUMPTIONS,
  REST_NORMS,
  exercisesByMuscle,
  muscleBalances,
  plannedEffort,
  restReview,
  routineInsights,
  type BalanceRow,
} from '@/lib/programInsights';
import {
  formatApproxDuration,
  formatDuration,
  formatVolume,
  formatWeight,
} from '@/lib/metrics';
import { volumeByMuscleGroup } from '@/lib/metrics';
import { EFFORT_LABEL, toScale } from '@/lib/effort';
import { BarList, ColumnChart, LineChart, TargetBarList, TrainingHeatmap } from '@/ui/charts';
import { Card, PrBadge, cx } from '@/ui/primitives';
import ExerciseChooser, { type ChoosableExercise } from './ExerciseChooser';

/**
 * Repere hebdomadaire par groupe musculaire, en series effectives.
 *
 * Cette zone et la carte « Respect des normes » partagent VOLONTAIREMENT la
 * meme source. Deux reperes differents sur le meme ecran, l'un disant 10-20 et
 * l'autre 6-12, ne se departagent pas a la lecture : celui qui consulte ne
 * saurait pas lequel croire.
 */
const SETS_ZONE = NORMS.setsPerMuscleWeek;

/** Au-dela, un exercice deja pratique merite qu'on se demande s'il revient. */
const DORMANT_DAYS = 21;

const DAY_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const SHORT_FMT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });

export interface AnalysisContext {
  mode: AnalysisMode;
  /** Seances de la fenetre analysee, ou de la semaine type en mode programme. */
  workouts: Workout[];
  /** Historique complet : records, exercices en sommeil, serie de jours. */
  allWorkouts: Workout[];
  exercises: Map<string, Exercise>;
  records: PersonalRecord[];
  weeks: WeekStat[];
  weekCount: number;
  settings: Settings;
  /** Present en mode programme seulement. */
  plan?: PlanSummary;
}

/** Ce que la semaine type dit d'elle-meme, hors des seances fictives. */
export interface PlanSummary {
  sessions: number;
  reps: PlannedReps;
  /** Les routines retenues, lues directement : repos, effort vise, duree. */
  picked: PickedRoutine[];
}

export interface AnalysisCardDef {
  id: string;
  title: string;
  /** Ce que la carte apprend. Lu dans la feuille de personnalisation. */
  description: string;
  /** Masquee tant que l'utilisateur ne l'a pas demandee. */
  hiddenByDefault?: boolean;
  /**
   * Modes ou la carte a un sens. Absent = historique seul : un record, une
   * duree ou un calendrier ne se lisent pas sur une seance qui n'a pas eu lieu.
   */
  modes?: AnalysisMode[];
  /** Faux = la carte n'a pas de sens ici, elle n'est meme pas proposee. */
  isRelevant?: (context: AnalysisContext) => boolean;
  render: (context: AnalysisContext) => ReactNode;
}

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                   */
/* -------------------------------------------------------------------------- */

export const ANALYSIS_CARDS: AnalysisCardDef[] = [
  {
    id: 'resume',
    title: 'En bref',
    description: 'Séances, tonnage, rythme hebdomadaire et série de jours en cours.',
    render: (context) => <SummaryCard context={context} />,
  },
  {
    id: 'seances',
    title: 'Séance par séance',
    description: 'Durée estimée, nombre de séries et muscles travaillés de chaque séance.',
    // Rangee en tete du catalogue : c'est la premiere chose qu'on veut savoir
    // d'un programme, et le resume qui la precede n'existe qu'en historique.
    modes: ['programme'],
    render: (context) => <SessionsCard context={context} />,
  },
  {
    id: 'volume',
    title: 'Volume par semaine',
    description: 'Le tonnage total semaine après semaine, et sa tendance.',
    render: (context) => <VolumeCard context={context} />,
  },
  {
    id: 'frequence',
    title: 'Fréquence',
    description: 'Nombre de séances par semaine, comparé à ton objectif.',
    render: (context) => <FrequencyCard context={context} />,
  },
  {
    id: 'exercice',
    title: 'Progression par exercice',
    description: 'La courbe d’un exercice au choix : 1RM estimé, charge, volume ou répétitions.',
    render: (context) => <ExerciseCard context={context} />,
  },
  {
    id: 'charge-musculaire',
    title: 'Séries par groupe musculaire',
    description: 'Ton volume hebdomadaire par muscle, situé face aux repères usuels.',
    modes: ['historique', 'programme'],
    render: (context) => <MuscleSetsCard context={context} />,
  },
  {
    id: 'normes',
    title: 'Respect des normes',
    description:
      'Volume, fréquence et répétitions confrontés aux fourchettes de programmation usuelles.',
    modes: ['historique', 'programme'],
    // Sans quelques seances, chaque ligne dirait « sous la zone » et la carte
    // ne serait qu'une liste de reproches adressee a un debutant. Un programme,
    // lui, se juge des sa premiere seance : il est complet par construction.
    isRelevant: (context) =>
      context.workouts.length >= (context.mode === 'programme' ? 1 : 3),
    render: (context) => <NormsCard context={context} />,
  },
  {
    id: 'equilibres',
    title: 'Équilibres',
    description: 'Tirage face à poussée, arrière face à avant de la jambe, haut face à bas du corps.',
    modes: ['historique', 'programme'],
    isRelevant: (context) =>
      context.workouts.length >= (context.mode === 'programme' ? 1 : 3),
    render: (context) => <BalanceCard context={context} />,
  },
  {
    id: 'regularite',
    title: 'Régularité',
    description: 'Le calendrier de tes jours d’entraînement, trous compris.',
    render: (context) => <ConsistencyCard context={context} />,
  },
  {
    id: 'records',
    title: 'Records récents',
    description: 'Les derniers records personnels, tous exercices confondus.',
    render: (context) => <RecordsCard context={context} />,
  },
  {
    id: 'repartition',
    title: 'Répartition du tonnage',
    description: 'La part de chaque groupe musculaire dans le tonnage total.',
    render: (context) => <DistributionCard context={context} />,
  },
  {
    id: 'repartition-series',
    title: 'Répartition des séries',
    description: 'La part de chaque groupe musculaire dans les séries de la semaine.',
    // Pendant du tonnage pour un programme, dont les charges ne sont pas
    // toujours renseignees : compter les series ne depend que de la structure.
    modes: ['programme'],
    render: (context) => <SetsShareCard context={context} />,
  },
  {
    id: 'repos-prevu',
    title: 'Repos prévu',
    description: 'Les repos prescrits, confrontés à la lourdeur des séries.',
    // Programme seul : une seance faite n'enregistre pas le repos reellement
    // pris (voir norms.ts), alors qu'une routine l'ecrit noir sur blanc.
    modes: ['programme'],
    render: (context) => <RestCard context={context} />,
  },
  {
    id: 'intensite-prevue',
    title: 'Intensité prévue',
    description: 'La part des séries menées à l’échec, et l’effort visé sur les autres.',
    modes: ['programme'],
    render: (context) => <PlannedEffortCard context={context} />,
  },
  {
    id: 'dormants',
    title: 'Exercices en sommeil',
    description: 'Les mouvements déjà travaillés que tu n’as plus faits depuis un moment.',
    render: (context) => <DormantCard context={context} />,
  },
  {
    id: 'intensite',
    title: 'Intensité ressentie',
    description: 'L’effort moyen ressenti (RPE ou RIR) semaine après semaine.',
    hiddenByDefault: true,
    // Sans RPE saisi, la carte n'aurait qu'une ligne plate a montrer.
    isRelevant: (context) =>
      context.settings.rpeEnabled && context.weeks.some((week) => week.avgRpe !== null),
    render: (context) => <IntensityCard context={context} />,
  },
  {
    id: 'duree',
    title: 'Durée et densité',
    description: 'Durée moyenne d’une séance, et tonnage soulevé par minute.',
    hiddenByDefault: true,
    render: (context) => <DensityCard context={context} />,
  },
];

/** Cartes masquees tant que l'utilisateur n'a rien personnalise. */
export const DEFAULT_HIDDEN: string[] = ANALYSIS_CARDS.filter((card) => card.hiddenByDefault).map(
  (card) => card.id,
);

/**
 * Cartes masquees.
 *
 * Reglage ABSENT et liste VIDE ne veulent pas dire la meme chose : le premier
 * est « je n'ai jamais rangé cet ecran », et rend les cartes secondaires
 * discretes ; le second est « je veux tout voir », un choix explicite qu'on
 * n'a pas le droit de defaire.
 */
export function hiddenIds(settings: Settings): Set<string> {
  return new Set(settings.analysisHidden ?? DEFAULT_HIDDEN);
}

/**
 * Cartes pertinentes ici, masquees comprises, dans l'ordre voulu.
 *
 * C'est ce que liste la feuille de personnalisation, qui doit montrer les
 * cartes cachees, sinon on ne pourrait jamais les rappeler.
 */
export function sortedCards(settings: Settings, context: AnalysisContext): AnalysisCardDef[] {
  const order = settings.analysisOrder ?? [];
  return ANALYSIS_CARDS.filter(
    (card) =>
      (card.modes ?? ['historique']).includes(context.mode) && (card.isRelevant?.(context) ?? true),
  ).sort(
    (a, b) => rank(a.id, order) - rank(b.id, order),
  );
}

/**
 * Cartes reellement affichees sur l'ecran.
 *
 * Le mode programme ignore les cartes masquees : il n'en propose qu'une
 * poignee, et une carte cachee en historique y disparaitrait sans qu'aucun
 * bouton de cet ecran-la ne permette de la rappeler.
 */
export function visibleCards(settings: Settings, context: AnalysisContext): AnalysisCardDef[] {
  if (context.mode === 'programme') return sortedCards(settings, context);
  const hidden = hiddenIds(settings);
  return sortedCards(settings, context).filter((card) => !hidden.has(card.id));
}

function rank(id: string, order: string[]): number {
  const index = order.indexOf(id);
  if (index >= 0) return index;
  // Une carte inconnue de l'ordre enregistre, donc ajoutee apres la derniere
  // personnalisation, se range a la suite, a sa place du catalogue.
  return order.length + ANALYSIS_CARDS.findIndex((card) => card.id === id);
}

/* -------------------------------------------------------------------------- */
/* Cartes                                                                      */
/* -------------------------------------------------------------------------- */

function SummaryCard({ context }: { context: AnalysisContext }) {
  const { workouts, weeks, weekCount, allWorkouts } = context;

  const volume = weeks.reduce((sum, week) => sum + week.volume, 0);
  const sets = weeks.reduce((sum, week) => sum + week.sets, 0);
  const streak = dailyStreak(allWorkouts);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile
        value={String(workouts.length)}
        label={`Séances sur ${weekCount} semaines`}
        accent="accent"
        trend={trendPercent(weeks.map((week) => week.sessions))}
      />
      <Tile
        value={formatVolume(volume)}
        label="Tonnage total"
        trend={trendPercent(weeks.map((week) => week.volume))}
      />
      <Tile value={String(sets)} label="Séries effectives" />
      <Tile
        value={streak > 0 ? String(streak) : '-'}
        unit={streak > 0 ? (streak > 1 ? 'jours' : 'jour') : undefined}
        label="Série de jours en cours"
        accent={streak > 0 ? 'done' : undefined}
      />
    </div>
  );
}

function VolumeCard({ context }: { context: AnalysisContext }) {
  const { weeks } = context;
  const points = weeks.map((week) => ({ x: week.start, y: week.volume }));
  const trend = trendPercent(weeks.map((week) => week.volume));

  return (
    <>
      <TrendLine
        trend={trend}
        up="Le tonnage monte : la charge de travail augmente."
        down="Le tonnage baisse. Voulu (décharge) ou subi ?"
        flat="Tonnage stable d’une moitié de période à l’autre."
      />
      <Card className="mt-2 p-3">
        <LineChart
          points={points}
          formatValue={(value) => formatVolume(value).replace(' ', '')}
          formatPoint={(point) =>
            `${SHORT_FMT.format(point.x)} · ${formatVolume(point.y)}`
          }
        />
      </Card>
    </>
  );
}

function FrequencyCard({ context }: { context: AnalysisContext }) {
  const { weeks, settings } = context;
  const done = weeks.filter((week) => !week.isCurrent);
  const reached = done.filter((week) => week.sessions >= settings.weeklyGoal).length;

  return (
    <>
      {settings.weeklyGoal > 0 && (
        <p className="mb-2 text-[13px] text-ink-2">
          Objectif atteint <span className="num font-bold text-ink">{reached}</span> semaine
          {reached > 1 ? 's' : ''} sur {done.length} terminée{done.length > 1 ? 's' : ''}.
        </p>
      )}
      <Card className="p-3">
        <ColumnChart
          items={weeks.map((week) => ({
            label: week.label,
            value: week.sessions,
            highlight: week.isCurrent,
          }))}
          goal={settings.weeklyGoal}
          height={150}
        />
      </Card>
    </>
  );
}

/**
 * Progression d'un exercice.
 *
 * Le 1RM estime est propose en premier parce que c'est la seule metrique qui
 * compare honnetement des series de formats differents : 100 kg x 3 et
 * 90 kg x 8 ne se departagent pas a la charge seule.
 */
function ExerciseCard({ context }: { context: AnalysisContext }) {
  const { allWorkouts, exercises } = context;
  const [metric, setMetric] = useState<ExerciseMetric>('e1rm');

  const candidates = useMemo(
    () =>
      trainedExercises(allWorkouts)
        .map((row) => {
          const exercise = exercises.get(row.id);
          return exercise ? { ...row, exercise } : null;
        })
        // Un exercice supprime garde ses seances dans l'historique mais n'a
        // plus de nom a afficher : il n'a rien a faire dans un selecteur.
        .filter((row): row is ChoosableExercise => row !== null),
    [allWorkouts, exercises],
  );

  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const selected = exerciseId ?? candidates[0]?.id ?? null;

  const series = useMemo(
    () => (selected ? exerciseSeries(allWorkouts, selected) : []),
    [allWorkouts, selected],
  );

  if (candidates.length === 0) {
    return <Hint>Aucun exercice n’a encore de série validée.</Hint>;
  }

  const points = series.map((stat) => ({ x: stat.at, y: metricValue(stat, metric) }));
  const trend = trendPercent(points.map((point) => point.y));
  const unit = metric === 'reps' || metric === 'volume' ? '' : ' kg';

  /**
   * Graduations sans unite ni decimale.
   *
   * « 124,2 kg » sortait du cadre par la gauche, et la decimale d'un 1RM
   * estime n'apporte rien a la lecture d'une echelle. L'unite exacte reste
   * dans la bulle, la ou on vient chercher un chiffre precis.
   */
  const axis = (value: number): string =>
    metric === 'volume' ? formatVolume(value) : String(Math.round(value));

  return (
    <>
      <ExerciseChooser items={candidates} selectedId={selected} onSelect={setExerciseId} />

      <div className="mb-2 flex gap-1 rounded-xl bg-alt p-1">
        {(Object.keys(EXERCISE_METRIC_LABELS) as ExerciseMetric[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMetric(key)}
            className={cx(
              'pressable min-h-[36px] flex-1 rounded-lg text-[12px] font-bold transition-colors',
              key === metric ? 'bg-white text-accent shadow-sm' : 'text-ink-2',
            )}
          >
            {EXERCISE_METRIC_LABELS[key]}
          </button>
        ))}
      </div>

      <Card className="p-3">
        {points.length < 2 ? (
          <Hint>
            Une seule séance enregistrée sur ce mouvement : il en faut au moins deux pour
            dessiner une progression.
          </Hint>
        ) : (
          <LineChart
            points={points}
            formatValue={axis}
            formatPoint={(point) =>
              `${SHORT_FMT.format(point.x)} · ${
                metric === 'volume' ? formatVolume(point.y) : formatWeight(point.y) + unit
              }`
            }
          />
        )}
      </Card>

      {points.length >= 4 && (
        <TrendLine
          className="mt-2"
          trend={trend}
          up={`${EXERCISE_METRIC_LABELS[metric]} en hausse sur la période.`}
          down={`${EXERCISE_METRIC_LABELS[metric]} en baisse sur la période.`}
          flat={`${EXERCISE_METRIC_LABELS[metric]} stable sur la période.`}
        />
      )}

      {selected && (
        <Link
          to={`/exercices/${selected}`}
          className="pressable mt-2 flex min-h-[44px] items-center justify-between rounded-xl bg-alt px-3 text-[14px] font-bold text-accent active:bg-line-2"
        >
          Ouvrir la fiche de l’exercice
          <ChevronRight size={18} />
        </Link>
      )}
    </>
  );
}

/**
 * Series hebdomadaires par muscle.
 *
 * Les muscles surveilles qui ne recoivent rien sont listes a zero, en bas :
 * sans eux, un programme sans ischios n'avait aucune barre qui le trahisse.
 * En mode programme, chaque barre nomme aussi ses mouvements, pour qu'un
 * muscle tenu par un seul exercice se voie.
 */
function MuscleSetsCard({ context }: { context: AnalysisContext }) {
  const { workouts, exercises, weekCount, plan } = context;

  const rows = useMemo(
    () => muscleLoad(workouts, (id) => exercises.get(id)?.muscleGroup, weekCount),
    [workouts, exercises, weekCount],
  );
  const movements = useMemo(
    () =>
      plan ? exercisesByMuscle(plan.picked, (id) => exercises.get(id)?.muscleGroup) : null,
    [plan, exercises],
  );
  const absent = absentGroups(rows.map((row) => row.group));

  const nameOf = (id: string): string => exercises.get(id)?.name ?? 'Exercice supprimé';
  const single = movements
    ? rows.filter(
        (row) => row.setsPerWeek >= SETS_ZONE.from && (movements.get(row.group)?.length ?? 0) === 1,
      )
    : [];

  return (
    <>
      <Card className="p-4">
        <TargetBarList
          items={[
            ...rows.map((row) => ({
              label: MUSCLE_GROUP_LABELS[row.group],
              value: row.setsPerWeek,
              hint: movements?.get(row.group)?.map(nameOf).join(' · '),
            })),
            ...absent.map((group) => ({
              label: MUSCLE_GROUP_LABELS[group],
              value: 0,
              hint: 'Aucune série',
            })),
          ]}
          zone={SETS_ZONE}
          formatValue={(value) => `${value.toFixed(1).replace('.', ',')} /sem`}
        />
      </Card>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        La zone verte va de {SETS_ZONE.from} à {SETS_ZONE.to} séries hebdomadaires, l’ordre de
        grandeur le plus souvent cité pour l’hypertrophie. C’est un repère, pas une règle : un
        groupe sous la zone n’est un problème que s’il fait partie de tes priorités.
      </p>
      {single.length > 0 && (
        <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
          Un seul mouvement pour {list(single.map((row) => lower(MUSCLE_GROUP_LABELS[row.group])))}.
          Varier l’angle ou l’outil répartit mieux le travail sur tout le muscle.
        </p>
      )}
    </>
  );
}

/**
 * Confrontation aux normes de programmation.
 *
 * Deux registres cohabitent et ne doivent pas se confondre a la lecture : les
 * lignes JUGEES, qui portent une couleur et un mot (« sous la zone »), et la
 * repartition des reps, SIMPLEMENT MESUREE, qui n'en porte pas. Voir norms.ts
 * pour la raison de cette retenue.
 */
function NormsCard({ context }: { context: AnalysisContext }) {
  const { workouts, exercises, weekCount, plan } = context;

  const rows = useMemo(
    () => muscleNorms(workouts, (id) => exercises.get(id)?.muscleGroup, weekCount),
    [workouts, exercises, weekCount],
  );
  // Les muscles sans aucune serie comptent dans les normes hebdomadaires,
  // ou ils sont le premier ecart a voir. Pas dans la norme par seance, qui
  // decrit un muscle QUAND il est travaille.
  const withAbsent = useMemo<MuscleNormRow[]>(
    () => [
      ...rows,
      ...absentGroups(rows.map((row) => row.group)).map((group) => ({
        group,
        setsPerWeek: 0,
        sessionsPerWeek: 0,
        setsPerSession: 0,
      })),
    ],
    [rows],
  );
  const perSession = useMemo(() => sessionSetCounts(workouts), [workouts]);
  // Les reps d'un programme se lisent dans ses routines : les seances
  // fictives pretent une rep aux series sans cible, pour qu'elles comptent.
  const reps = useMemo(() => plan?.reps.spread ?? repsSpread(workouts), [plan, workouts]);

  const medianSets = perSession.length > 0 ? median(perSession) : 0;
  const sessionsPerWeek = plan ? plan.sessions : workouts.length / Math.max(1, weekCount);
  const rhythm = sessionsPerWeek.toFixed(1).replace('.', ',').replace(/,0$/, '');

  return (
    <>
      <Card className="divide-y divide-line p-0">
        <NormLine
          label="Séries par séance"
          value={String(medianSets)}
          unit="médiane"
          range={NORMS.setsPerSession}
          state={stateOf(medianSets, NORMS.setsPerSession)}
        />
        <MuscleNormLine
          label="Séries par muscle et par semaine"
          range={NORMS.setsPerMuscleWeek}
          rows={withAbsent}
          valueOf={(row) => row.setsPerWeek}
        />
        <MuscleNormLine
          label="Séries par muscle et par séance"
          range={NORMS.setsPerMuscleSession}
          rows={rows}
          valueOf={(row) => row.setsPerSession}
        />
        <MuscleNormLine
          label="Passages par muscle et par semaine"
          range={NORMS.muscleFrequency}
          rows={withAbsent}
          valueOf={(row) => row.sessionsPerWeek}
        />
      </Card>

      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        {formatAdvice(sessionsPerWeek)} {plan ? 'Ton programme compte' : 'Tu tiens'}{' '}
        <span className="num font-bold text-ink-2">
          {plan ? rhythm : sessionsPerWeek.toFixed(1).replace('.', ',')}
        </span>{' '}
        séance{sessionsPerWeek >= 2 ? 's' : ''} par semaine{plan ? '' : ' sur la période'}.
      </p>

      {/* Repetitions : mesure seule. La fourchette du memo depend de qui
          s'entraine, donc aucune couleur de verdict ici, juste la zone visee. */}
      <p className="mb-2 mt-5 text-[13px] font-semibold text-ink-2">Répétitions</p>
      <Card className="p-4">
        <RepsBar spread={reps} />
      </Card>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        La zone visée va de {NORMS.reps.from} à {NORMS.reps.to} répétitions. Ce n’est pas une
        faute d’en sortir : les séries plus longues restent utiles là où la charge se prête mal
        au lourd.
      </p>
      {plan && plan.reps.unknown > 0 && (
        <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
          {plan.reps.unknown} série{plan.reps.unknown > 1 ? 's' : ''} sans répétitions visées{' '}
          {plan.reps.unknown > 1 ? 'comptent' : 'compte'} dans les volumes, mais pas dans cette
          répartition.
        </p>
      )}

    </>
  );
}

/** Une norme jugee : sa mesure, sa zone, et le mot qui situe l'une dans l'autre. */
function NormLine({
  label,
  value,
  unit,
  range,
  state,
  detail,
}: {
  label: string;
  value: string;
  unit: string;
  range: NormRange;
  state: NormState;
  detail?: string;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-[14px] font-medium">{label}</span>
        <span className={cx('num shrink-0 text-[15px] font-bold', STATE_COLOR[state])}>
          {value}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-[13px] text-ink-3">
          {range.from} à {range.to} · {unit}
        </span>
        <span className={cx('shrink-0 text-[13px]', STATE_COLOR[state])}>{STATE_LABEL[state]}</span>
      </div>
      {detail && <p className="mt-1 text-[13px] leading-snug text-ink-3">{detail}</p>}
    </div>
  );
}

/**
 * Norme qui s'applique muscle par muscle.
 *
 * On affiche « 6 muscles sur 8 » et non une moyenne : une moyenne dans la zone
 * peut recouvrir un dos surcharge et des mollets a l'abandon, ce qui est
 * precisement ce que la norme cherche a faire voir. Les muscles hors zone sont
 * nommes, sinon le compte ne dit pas quoi corriger.
 */
function MuscleNormLine({
  label,
  range,
  rows,
  valueOf,
}: {
  label: string;
  range: NormRange;
  rows: MuscleNormRow[];
  valueOf: (row: MuscleNormRow) => number;
}) {
  const states = rows.map((row) => stateOf(valueOf(row), range));
  const inZone = states.filter((state) => state === 'dans').length;

  const name = (index: number): string => lower(MUSCLE_GROUP_LABELS[rows[index]!.group]);
  // Un muscle sans aucune serie est nomme a part : « sous la zone » laisserait
  // croire qu'il est travaille, juste pas assez.
  const isAbsent = (index: number): boolean => rows[index]!.setsPerWeek === 0;
  const absent = rows.map((_r, i) => (isAbsent(i) ? name(i) : '')).filter(Boolean);
  const below = states
    .map((s, i) => (s === 'dessous' && !isAbsent(i) ? name(i) : ''))
    .filter(Boolean);
  const above = states.map((s, i) => (s === 'dessus' ? name(i) : '')).filter(Boolean);

  const detail = [
    absent.length > 0 ? `Aucune série : ${list(absent)}.` : '',
    below.length > 0 ? `Sous la zone : ${list(below)}.` : '',
    above.length > 0 ? `Au-dessus : ${list(above)}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <NormLine
      label={label}
      value={`${inZone} / ${rows.length}`}
      unit={`muscle${rows.length > 1 ? 's' : ''} dans la zone`}
      range={range}
      // Tout dans la zone, ou rien a redire : le vert n'est merite que par le
      // sans-faute, sinon il recompenserait une majorite mediocre.
      state={
        inZone === rows.length
          ? 'dans'
          : above.length > below.length + absent.length
            ? 'dessus'
            : 'dessous'
      }
      detail={detail || undefined}
    />
  );
}

const STATE_COLOR: Record<NormState, string> = {
  dessous: 'text-ink-3',
  dans: 'text-done',
  dessus: 'text-pr',
};

const STATE_LABEL: Record<NormState, string> = {
  dessous: 'sous la zone',
  dans: 'dans la zone',
  dessus: 'au-dessus',
};

/** Repartition des reps en trois segments, sans couleur de verdict. */
function RepsBar({ spread }: { spread: RepsSpread }) {
  if (spread.total === 0) {
    return <p className="text-[13px] text-ink-3">Aucune série à répartir.</p>;
  }

  return (
    <SpreadBar
      segments={[
        { key: 'below', n: spread.below, label: `moins de ${NORMS.reps.from} reps`, tone: 'bg-line-2' },
        { key: 'inZone', n: spread.inZone, label: `${NORMS.reps.from} à ${NORMS.reps.to} reps`, tone: 'bg-accent' },
        { key: 'above', n: spread.above, label: `plus de ${NORMS.reps.to} reps`, tone: 'bg-line-2' },
      ]}
    />
  );
}

/** Barre segmentee et sa legende en pourcentages. Les segments vides disparaissent. */
function SpreadBar({
  segments: all,
}: {
  segments: Array<{ key: string; n: number; label: string; tone: string }>;
}) {
  const total = all.reduce((sum, segment) => sum + segment.n, 0);
  if (total === 0) return <p className="text-[13px] text-ink-3">Aucune série à répartir.</p>;

  const pct = (n: number): number => (n / total) * 100;
  const segments = all.filter((segment) => segment.n > 0);

  return (
    <>
      <div className="flex h-2.5 gap-px overflow-hidden rounded-pill">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={cx('h-full transition-[width] duration-500 ease-ease', segment.tone)}
            style={{ width: `${pct(segment.n)}%` }}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-[13px]">
            <span className={cx('h-2 w-2 shrink-0 rounded-full', segment.tone)} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{segment.label}</span>
            <span className="num shrink-0 font-bold">{Math.round(pct(segment.n))} %</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2)
    : (sorted[middle] as number);
}

/**
 * Libelle de muscle enumere dans une phrase.
 *
 * Les libelles sont capitalises parce qu'ils servent ailleurs d'etiquettes
 * autonomes. Dans une phrase, apres deux-points, ce sont des noms communs.
 */
function lower(label: string): string {
  return label.charAt(0).toLocaleLowerCase('fr') + label.slice(1);
}

function list(names: string[]): string {
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} et ${names.length - 3} autre${names.length - 3 > 1 ? 's' : ''}`;
}

function ConsistencyCard({ context }: { context: AnalysisContext }) {
  const { allWorkouts, weekCount } = context;
  // Douze semaines au maximum : au-dela, les cases deviennent illisibles sur
  // un telephone et le calendrier ne se lit plus d'un coup d'oeil.
  const weeks = Math.min(12, weekCount);
  const grid = useMemo(() => trainingGrid(allWorkouts, weeks), [allWorkouts, weeks]);
  const streak = dailyStreak(allWorkouts);

  const trained = grid.reduce(
    (sum, week) => sum + week.days.filter((day) => day.count > 0).length,
    0,
  );
  const elapsed = grid.reduce(
    (sum, week) => sum + week.days.filter((day) => !day.isFuture).length,
    0,
  );

  return (
    <>
      <p className="mb-2 text-[13px] text-ink-2">
        <span className="num font-bold text-ink">{trained}</span> jours d’entraînement sur les{' '}
        {elapsed} derniers.
        {streak > 1 && <> Série en cours : {streak} jours.</>}
      </p>
      <Card className="p-3">
        <TrainingHeatmap weeks={grid} formatDay={(at) => DAY_FMT.format(at)} />
      </Card>
    </>
  );
}

function RecordsCard({ context }: { context: AnalysisContext }) {
  const rows = useMemo(
    () => recentRecords(context.records, context.exercises, 8),
    [context.records, context.exercises],
  );

  if (rows.length === 0) {
    return <Hint>Aucun record enregistré pour l’instant.</Hint>;
  }

  const KIND_LABEL = { e1rm: '1RM estimé', charge: 'Charge max', volume: 'Volume de séance' };

  return (
    <Card>
      <ul className="divide-y divide-line">
        {rows.map((row, index) => (
          <li
            key={`${row.exercise.id}-${row.kind}`}
            className="animate-item-in"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <Link
              to={`/exercices/${row.exercise.id}`}
              className="pressable pressable-wide flex min-h-[56px] items-center gap-3 px-4 py-2.5"
            >
              <PrBadge compact />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {row.exercise.name}
                </span>
                <span className="block truncate text-[12px] text-ink-2">
                  {KIND_LABEL[row.kind]} · {SHORT_FMT.format(row.achievedAt)}
                </span>
              </span>
              <span className="num shrink-0 font-display text-[15px] font-black">
                {row.kind === 'volume' ? formatVolume(row.value) : `${formatWeight(row.value)} kg`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DistributionCard({ context }: { context: AnalysisContext }) {
  const { workouts, exercises } = context;

  const items = useMemo(() => {
    const totals = volumeByMuscleGroup(workouts, (id) => exercises.get(id)?.muscleGroup);
    return [...totals.entries()]
      .map(([group, value]) => ({
        label: MUSCLE_GROUP_LABELS[group as keyof typeof MUSCLE_GROUP_LABELS] ?? group,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [workouts, exercises]);

  return (
    <>
      <Card className="p-4">
        <BarList items={items} formatValue={formatVolume} />
      </Card>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        Le tonnage d’un exercice est attribué en entier à son groupe principal. Répartir en
        fractions demanderait des coefficients arbitraires, difficiles à justifier.
      </p>
    </>
  );
}

function SetsShareCard({ context }: { context: AnalysisContext }) {
  const { workouts, exercises } = context;

  const items = useMemo(() => {
    const rows = muscleNorms(workouts, (id) => exercises.get(id)?.muscleGroup, 1);
    const total = rows.reduce((sum, row) => sum + row.setsPerWeek, 0) || 1;
    return rows.map((row) => ({
      label: MUSCLE_GROUP_LABELS[row.group],
      value: (row.setsPerWeek / total) * 100,
    }));
  }, [workouts, exercises]);

  return (
    <Card className="p-4">
      <BarList items={items} formatValue={(value) => `${Math.round(value)} %`} />
    </Card>
  );
}

function DormantCard({ context }: { context: AnalysisContext }) {
  const rows = useMemo(
    () => dormantExercises(context.allWorkouts, context.exercises, DORMANT_DAYS).slice(0, 6),
    [context.allWorkouts, context.exercises],
  );

  if (rows.length === 0) {
    return <Hint>Tous les mouvements de ton programme sont passés récemment.</Hint>;
  }

  return (
    <Card>
      <ul className="divide-y divide-line">
        {rows.map((row, index) => (
          <li
            key={row.exercise.id}
            className="animate-item-in"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <Link
              to={`/exercices/${row.exercise.id}`}
              className="pressable pressable-wide flex min-h-[52px] items-center gap-3 px-4 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                {row.exercise.name}
              </span>
              <span className="num shrink-0 text-[13px] font-bold text-ink-3">
                {row.days} j
              </span>
              <ChevronRight size={16} className="shrink-0 text-ink-3" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function IntensityCard({ context }: { context: AnalysisContext }) {
  const scale = context.settings.effortScale ?? 'rpe';
  const label = EFFORT_LABEL[scale];
  // La moyenne est calculee en RPE ; la conversion etant lineaire, la
  // convertir apres coup donne exactement la moyenne des RIR.
  const points = context.weeks
    .filter((week) => week.avgRpe !== null)
    .map((week) => ({ x: week.start, y: toScale(week.avgRpe, scale) as number }));

  return (
    <>
      <Card className="p-3">
        <LineChart
          points={points}
          formatValue={(value) => value.toFixed(1).replace('.', ',')}
          formatPoint={(point) =>
            `${SHORT_FMT.format(point.x)} · ${label} ${point.y.toFixed(1).replace('.', ',')}`
          }
        />
      </Card>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        {scale === 'rir'
          ? 'Un RIR moyen qui baisse alors que les charges stagnent'
          : 'Un RPE moyen qui grimpe alors que les charges stagnent'}{' '}
        est le signe le plus fiable d’une fatigue qui s’accumule.
      </p>
    </>
  );
}

function DensityCard({ context }: { context: AnalysisContext }) {
  const duration = averageDuration(context.workouts);
  const density = averageDensity(context.workouts);

  if (duration === null) {
    return <Hint>Aucune séance chronométrée sur la période.</Hint>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile value={formatDuration(duration)} label="Durée moyenne d’une séance" />
      <Tile
        value={density === null ? '-' : formatVolume(density)}
        unit={density === null ? undefined : '/min'}
        label="Tonnage par minute"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cartes du programme                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Chaque seance de la semaine type, avec sa duree estimee.
 *
 * La mediane de « Respect des normes » cache une seance a 24 series derriere
 * trois seances a 12 : ici chacune est jugee seule. La duree repond a la
 * question qu'on se pose avant de s'engager sur un programme, « est-ce que ca
 * tient dans mon creneau ».
 */
function SessionsCard({ context }: { context: AnalysisContext }) {
  const { plan, exercises } = context;
  const rows = useMemo(
    () =>
      plan ? routineInsights(plan.picked, (id) => exercises.get(id)?.muscleGroup) : [],
    [plan, exercises],
  );

  if (rows.length === 0) return <Hint>Aucune séance retenue.</Hint>;

  const weekSec = rows.reduce((sum, row) => sum + row.durationSec * row.times, 0);
  const weekSets = rows.reduce((sum, row) => sum + row.sets * row.times, 0);
  const week = formatApproxDuration(weekSec);
  const a = DURATION_ASSUMPTIONS;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Tile value={week.value} unit={week.unit} label="D’entraînement par semaine" accent="accent" />
        <Tile value={String(weekSets)} label="Séries de travail par semaine" />
      </div>

      <Card className="mt-3 divide-y divide-line p-0">
        {rows.map((row) => {
          const duration = formatApproxDuration(row.durationSec);
          const state = stateOf(row.sets, NORMS.setsPerSession);
          return (
            <div key={row.routine.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[15px] font-semibold">
                  {row.routine.name}
                  {row.times > 1 && (
                    <span className="num ml-1.5 text-[13px] font-bold text-ink-3">×{row.times}</span>
                  )}
                </span>
                <span className="num shrink-0 text-[15px] font-bold">
                  {duration.value}
                  {duration.unit && (
                    <span className="ml-0.5 text-[12px] font-bold text-ink-3">{duration.unit}</span>
                  )}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-ink-3">
                <span className={cx('num font-bold', STATE_COLOR[state])}>
                  {row.sets} série{row.sets > 1 ? 's' : ''}
                </span>
                {state !== 'dans' && <span className={STATE_COLOR[state]}> ({STATE_LABEL[state]})</span>}
                {row.muscles.length > 0 && ' · '}
                {row.muscles
                  .map((muscle) => `${MUSCLE_GROUP_LABELS[muscle.group]} ${muscle.sets}`)
                  .join(' · ')}
              </p>
            </div>
          );
        })}
      </Card>

      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        Durées estimées si tu respectes les repos prévus, à raison d’environ {a.secPerRep} s par
        répétition et {a.setupSec} s d’installation par série. Le nombre de séries est jugé face à
        la zone de {NORMS.setsPerSession.from} à {NORMS.setsPerSession.to} par séance.
      </p>
    </>
  );
}

/**
 * Rapports entre muscles qui travaillent en opposition.
 *
 * Le dernier rapport, haut et bas du corps, est mesure sans verdict : le haut
 * compte plus de groupes que le bas, et aucune proportion ne vaut pour tout
 * le monde.
 */
function BalanceCard({ context }: { context: AnalysisContext }) {
  const { workouts, exercises, weekCount } = context;
  const rows = useMemo(
    () =>
      muscleBalances(muscleLoad(workouts, (id) => exercises.get(id)?.muscleGroup, weekCount)),
    [workouts, exercises, weekCount],
  );

  if (rows.length === 0) return <Hint>Aucune série à comparer.</Hint>;

  return (
    <>
      <Card className="divide-y divide-line p-0">
        {rows.map((row) => (
          <BalanceLine key={row.def.id} row={row} />
        ))}
      </Card>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        Rapports calculés en séries par semaine, chaque exercice comptant pour son groupe
        principal. Les épaules sont rangées côté poussée : un oiseau ou un face pull, qui tirent,
        y sont donc comptés à tort.
      </p>
    </>
  );
}

function BalanceLine({ row }: { row: BalanceRow }) {
  const { def, left, right, ratio } = row;
  const total = left + right;
  const leftPct = total > 0 ? (left / total) * 100 : 0;
  const state: NormState | null =
    def.range && ratio !== null ? stateOf(ratio, def.range) : def.range ? 'dessus' : null;
  const sets = (n: number): string => n.toFixed(1).replace('.', ',').replace(/,0$/, '');
  const ratioText = (n: number): string => n.toFixed(2).replace('.', ',');

  // Un cote vide ne donne pas un rapport mais un manque : on le dit en mots,
  // un « 0,00 » se lit comme une mesure et non comme une absence.
  const empty = left === 0 ? def.left.label : right === 0 ? def.right.label : null;

  let verdict: string;
  if (!def.range) verdict = `${Math.round(leftPct)} % / ${100 - Math.round(leftPct)} %`;
  else if (empty) verdict = `aucune série côté ${lower(empty)}`;
  else verdict = `${def.range.from.toString().replace('.', ',')} à ${def.range.to.toString().replace('.', ',')} · ${STATE_LABEL[state as NormState]}`;

  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-[14px] font-medium">{def.label}</span>
        {ratio !== null && !empty && (
          <span className={cx('num shrink-0 text-[15px] font-bold', state ? STATE_COLOR[state] : 'text-ink')}>
            {ratioText(ratio)}
          </span>
        )}
      </div>
      <div className="mt-2 flex h-2.5 gap-px overflow-hidden rounded-pill bg-alt">
        <div className="h-full bg-accent transition-[width] duration-500 ease-ease" style={{ width: `${leftPct}%` }} />
        <div className="h-full flex-1 bg-accent-border" />
      </div>
      <div className="mt-1 flex justify-between gap-3 text-[12px] text-ink-2">
        <span className="min-w-0 truncate">
          {def.left.label} <span className="num font-bold text-ink">{sets(left)}</span>
        </span>
        <span className="min-w-0 truncate text-right">
          {def.right.label} <span className="num font-bold text-ink">{sets(right)}</span>
        </span>
      </div>
      <p className={cx('mt-1 text-[13px]', state ? STATE_COLOR[state] : 'text-ink-3')}>{verdict}</p>
      {state && state !== 'dans' && (
        <p className="mt-0.5 text-[13px] leading-snug text-ink-3">
          {state === 'dessous' ? def.belowAdvice : def.aboveAdvice}
        </p>
      )}
    </div>
  );
}

/**
 * Repos prescrits, confrontes a la lourdeur de l'exercice.
 *
 * Seul le repos TROP COURT est signale. Un repos long ne nuit qu'a la duree
 * de la seance, que la carte « Séance par séance » montre deja.
 */
function RestCard({ context }: { context: AnalysisContext }) {
  const { plan, exercises } = context;
  const review = useMemo(() => (plan ? restReview(plan.picked) : null), [plan]);

  if (!review || review.judged.length === 0) {
    return (
      <Hint>
        Aucun exercice à juger : seuls ceux qui comptent au moins deux séries, hors superset, ont
        un repos qui sépare deux efforts.
      </Hint>
    );
  }

  const ok = review.judged.length - review.short.length;
  const state: NormState = review.short.length === 0 ? 'dans' : 'dessous';
  const minutes = (sec: number): string => (sec % 60 === 0 ? `${sec / 60} min` : formatDuration(sec));

  return (
    <>
      <Card className="divide-y divide-line p-0">
        <div className="px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-[14px] font-medium">Exercices assez reposés</span>
            <span className={cx('num shrink-0 text-[15px] font-bold', STATE_COLOR[state])}>
              {ok} / {review.judged.length}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {minutes(REST_NORMS.heavyMinSec)} après une série lourde, {minutes(REST_NORMS.otherMinSec)}{' '}
            sinon
          </p>
        </div>
        {review.short.map((row, index) => (
          <div key={`${row.routineName}-${row.exerciseId}-${index}`} className="px-4 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[14px] font-semibold">
                {exercises.get(row.exerciseId)?.name ?? 'Exercice supprimé'}
              </span>
              <span className="num shrink-0 text-[14px] font-bold text-ink-3">
                {row.restSec > 0 ? formatDuration(row.restSec) : 'aucun'}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[12px] text-ink-3">
              {row.routineName} · {row.heavy ? 'séries lourdes' : 'séries modérées'},{' '}
              {minutes(row.minSec)} conseillées
            </p>
          </div>
        ))}
      </Card>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        Une série est lourde à {REST_NORMS.heavyMaxReps} répétitions visées ou moins : la suivante
        garde sa qualité si l’on récupère davantage. Les exercices à une seule série ne sont pas
        jugés
        {review.inSuperset > 0 &&
          `, ni les ${review.inSuperset} exercice${review.inSuperset > 1 ? 's' : ''} en superset, où l’on enchaîne volontairement`}
        .
      </p>
    </>
  );
}

/** Effort vise sur les series de travail de la semaine. */
function PlannedEffortCard({ context }: { context: AnalysisContext }) {
  const { plan, settings } = context;
  const effort = useMemo(() => (plan ? plannedEffort(plan.picked) : null), [plan]);

  if (!effort || effort.total === 0) return <Hint>Aucune série de travail prévue.</Hint>;

  const rir = (settings.effortScale ?? 'rpe') === 'rir';
  const share = (n: number): number => Math.round((n / effort.total) * 100);
  const failureShare = share(effort.failure);
  const techniques = [
    effort.drops > 0 ? `${effort.drops} dégressive${effort.drops > 1 ? 's' : ''}` : '',
    effort.myo > 0 ? `${effort.myo} série${effort.myo > 1 ? 's' : ''} myo-reps` : '',
  ].filter(Boolean);

  return (
    <>
      <Card className="p-4">
        <SpreadBar
          segments={[
            { key: 'failure', n: effort.failure, label: 'À l’échec', tone: 'bg-pr' },
            { key: 'near', n: effort.near, label: rir ? 'RIR 0,5 à 1' : 'RPE 9 à 9,5', tone: 'bg-accent' },
            { key: 'moderate', n: effort.moderate, label: rir ? 'RIR 1,5 à 3' : 'RPE 7 à 8,5', tone: 'bg-accent-light' },
            { key: 'light', n: effort.light, label: rir ? 'Au-delà de RIR 3' : 'Sous RPE 7', tone: 'bg-accent-border' },
            { key: 'unspecified', n: effort.unspecified, label: 'Sans consigne d’effort', tone: 'bg-line-2' },
          ]}
        />
      </Card>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        <span className="num font-bold text-ink-2">{failureShare} %</span> des séries de travail
        vont à l’échec
        {techniques.length > 0 && <>, avec {techniques.join(' et ')} par semaine</>}.{' '}
        {failureShare >= 50
          ? 'Mener la plupart des séries à l’échec alourdit la fatigue pour un gain modeste : on le réserve souvent aux dernières séries, ou aux exercices d’isolation.'
          : share(effort.unspecified) >= 50
            ? 'La plupart des séries n’ont pas de consigne d’effort : en fixer une aide à doser la séance d’une semaine à l’autre.'
            : 'S’arrêter à une ou deux répétitions de l’échec garde l’essentiel du stimulus pour une fatigue bien moindre.'}
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Briques communes                                                            */
/* -------------------------------------------------------------------------- */

function Tile({
  value,
  unit,
  label,
  accent,
  trend,
}: {
  value: string;
  unit?: string;
  label: string;
  accent?: 'accent' | 'done';
  trend?: number | null;
}) {
  const color = accent === 'accent' ? 'text-accent' : accent === 'done' ? 'text-done' : 'text-ink';
  return (
    <div className="card p-3.5">
      <div className="flex items-baseline gap-1.5">
        <p className={cx('num font-display text-[24px] font-black leading-none', color)}>
          {value}
          {unit && <span className="ml-0.5 text-[13px] font-bold text-ink-3">{unit}</span>}
        </p>
        {trend !== null && trend !== undefined && <TrendChip value={trend} />}
      </div>
      <p className="mt-1.5 text-[12px] leading-tight text-ink-2">{label}</p>
    </div>
  );
}

/** Sous 3 %, l'ecart n'est que du bruit et ne merite pas de fleche. */
const FLAT_PERCENT = 3;

function TrendChip({ value }: { value: number }) {
  const flat = Math.abs(value) < FLAT_PERCENT;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cx(
        'num inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-[11px] font-extrabold',
        flat ? 'bg-alt text-ink-3' : value > 0 ? 'bg-done-soft text-done' : 'bg-pr-soft text-pr',
      )}
    >
      <Icon size={11} strokeWidth={3} />
      {flat ? '=' : `${value > 0 ? '+' : ''}${Math.round(value)} %`}
    </span>
  );
}

/**
 * Phrase de lecture d'une tendance.
 *
 * Une baisse s'affiche en ambre et jamais en rouge : une semaine de decharge
 * est une baisse VOULUE, et peindre en rouge une decision d'entrainement
 * reviendrait a la designer comme une faute.
 */
function TrendLine({
  trend,
  up,
  down,
  flat,
  className,
}: {
  trend: number | null;
  up: string;
  down: string;
  flat: string;
  className?: string;
}) {
  if (trend === null) {
    return (
      <p className={cx('text-[13px] text-ink-3', className)}>
        Pas encore assez de semaines pour dégager une tendance.
      </p>
    );
  }

  const isFlat = Math.abs(trend) < FLAT_PERCENT;
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <TrendChip value={trend} />
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-2">
        {isFlat ? flat : trend > 0 ? up : down}
      </p>
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-alt/60 px-4 py-5 text-center text-[13px] leading-relaxed text-ink-3">
      {children}
    </div>
  );
}
