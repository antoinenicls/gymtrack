/**
 * Contenu de la fiche d'un exercice : progression chiffree, records, note
 * personnelle et fiche d'execution.
 *
 * Extrait de la page pour etre montrable AILLEURS que sur sa route : depuis le
 * selecteur d'exercices, on veut relire l'execution d'un mouvement avant de
 * l'ajouter, sans quitter la seance en cours ni perdre les cases deja cochees.
 * Une seule source pour les deux endroits, donc aucune fiche a moitie a jour.
 *
 * La fiche d'execution est embarquee dans le bundle, donc lisible hors ligne.
 * Le lien video est un complement : il n'apparait que si le telephone a du
 * reseau, et rien de ce qui compte n'en depend.
 */

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import type { Exercise, PersonalRecord, Workout } from '@/types/domain';
import { exerciseRepo, recordRepo, workoutRepo } from '@/services/repositories';
import { getGuide } from '@/data/guides';
import { guideKey } from '@/types/guide';
import { MUSCLE_GROUP_LABELS } from '@/data/seedExercises';
import { entryBestE1rm, entryVolume, formatWeight, workingSets } from '@/lib/metrics';
import { monthRecords } from '@/lib/records';
import { LineChart, type Point } from '@/ui/charts';
import { Button, Card, SectionLabel, Sheet, Stat, cx } from '@/ui/primitives';
import CreateExerciseSheet from './CreateExerciseSheet';

const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'long' });

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function ExerciseDetail({
  exerciseId,
  showHeader = true,
  onDeleted,
  onMissing,
  onChanged,
}: {
  exerciseId: string;
  /** Masque le titre quand le contenant le porte deja (l'en-tete d'une feuille). */
  showHeader?: boolean;
  /**
   * Absent, la suppression n'est pas proposee. C'est le cas depuis le
   * selecteur : on y vient pour ajouter un mouvement, pas pour le retirer de la
   * bibliotheque, et le bouton rouge n'y serait qu'un piege.
   */
  onDeleted?: () => void;
  /** Appele si l'exercice n'existe plus, pour que le contenant decide. */
  onMissing?: () => void;
  /**
   * Appele apres une correction (nom, groupe, materiel), pour que le contenant
   * mette a jour ce qu'il affiche lui-meme : le titre d'une feuille, les noms
   * de la seance ou de la liste en dessous.
   */
  onChanged?: (exercise: Exercise) => void;
}) {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [record, setRecord] = useState<PersonalRecord | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const sync = (): void => setOnline(navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const loaded = (await exerciseRepo.get(exerciseId)) ?? null;
      setExercise(loaded);
      setNoteDraft(loaded?.notes ?? '');
      setNoteSaved(false);
      if (loaded === null) {
        onMissing?.();
        return;
      }
      setWorkouts((await workoutRepo.forExercise(exerciseId)).reverse());
      setRecord(await recordRepo.get(exerciseId));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]);

  /**
   * Enregistrement a la sortie du champ plutot qu'a chaque frappe : une note se
   * tape souvent d'une main entre deux series, et une ecriture par caractere
   * n'apporte rien. Une note vidée efface le champ au lieu de stocker une chaine
   * vide, pour que « jamais renseignee » et « effacee » restent le meme etat.
   */
  const saveNote = async (): Promise<void> => {
    if (!exercise) return;
    const trimmed = noteDraft.trim();
    if (trimmed === (exercise.notes ?? '')) return;
    const { notes: _removed, ...rest } = exercise;
    const updated: Exercise = trimmed === '' ? rest : { ...rest, notes: trimmed };
    await exerciseRepo.save(updated);
    setExercise(updated);
    setNoteSaved(true);
  };

  const guide = exercise ? getGuide(guideKey(exercise.name)) : undefined;

  // Courbe du meilleur E1RM par seance : c'est l'indicateur qui compare
  // honnetement des series de formats differents.
  const points = useMemo<Point[]>(() => {
    return workouts
      .map((workout) => {
        const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
        if (!entry || workingSets(entry).length === 0) return null;
        return { x: workout.startedAt, y: entryBestE1rm(entry) };
      })
      .filter((p): p is Point => p !== null && p.y > 0);
  }, [workouts, exerciseId]);

  // Meilleur du mois en cours, a cote des records absolus : apres une baisse
  // de charge, c'est lui qui montre encore que ca avance.
  const month = useMemo(
    () => monthRecords(workouts, Date.now()).find((r) => r.exerciseId === exerciseId) ?? null,
    [workouts, exerciseId],
  );

  if (!exercise) return null;

  /**
   * Correction reservee aux exercices crees : renommer un mouvement du
   * catalogue lui ferait perdre sa fiche d'execution, retrouvee par le nom.
   * Proposee PARTOUT ou la fiche s'ouvre, seance en cours comprise : c'est
   * souvent devant la machine qu'on voit que le nom ou le groupe ne va pas.
   * Dans une feuille, le titre appartient au contenant, qui le suit via
   * onChanged.
   */
  const canEdit = exercise.isCustom;

  return (
    <div>
      {/* Sans en-tete, le nom est deja porte par le contenant, mais le groupe
          musculaire et le materiel restent utiles : on les garde. */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showHeader && (
            <h1 className="font-display text-[28px] font-black leading-tight tracking-[-1.2px]">
              {exercise.name}
            </h1>
          )}
          <p className={cx('text-[14px] text-ink-2', showHeader && 'mt-1')}>
            {MUSCLE_GROUP_LABELS[exercise.muscleGroup]} · {exercise.equipment}
          </p>
        </div>
        {canEdit && (
          <Button variant="tinted" className="shrink-0 px-4" onClick={() => setEditing(true)}>
            <Pencil size={15} strokeWidth={2.2} />
            Modifier
          </Button>
        )}
      </header>

      {canEdit && (
        <CreateExerciseSheet
          open={editing}
          exercise={exercise}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setExercise(updated);
            setEditing(false);
            onChanged?.(updated);
          }}
        />
      )}

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat
          value={record?.bestE1rm ? formatWeight(record.bestE1rm.value) : '-'}
          unit={record?.bestE1rm ? 'kg' : undefined}
          label="1RM estimé"
          accent="pr"
        />
        <Stat
          value={record?.bestWeight ? formatWeight(record.bestWeight.weightKg) : '-'}
          unit={record?.bestWeight ? 'kg' : undefined}
          label="Charge max"
        />
        <Stat value={String(points.length)} label="Séances" accent="accent" />
      </div>

      {month && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-month-border bg-month-soft px-4 py-2.5 text-[13px]">
          <span className="font-display font-extrabold uppercase tracking-wider text-month">
            {MONTH_FMT.format(Date.now())}
          </span>
          {month.bestE1rm && (
            <span className="num text-ink-2">
              1RM estimé <b className="text-ink">{formatWeight(month.bestE1rm.value)} kg</b>
            </span>
          )}
          {month.bestWeight && (
            <span className="num text-ink-2">
              Charge max{' '}
              <b className="text-ink">
                {formatWeight(month.bestWeight.weightKg)} kg × {month.bestWeight.reps}
              </b>
            </span>
          )}
        </div>
      )}

      {/* Note personnelle, editable sur N'IMPORTE QUEL exercice, y compris ceux
          du catalogue livre : les reglages d'une machine ne dependent pas de
          qui a cree la fiche. */}
      <div className="mt-6">
        <SectionLabel>Ma note</SectionLabel>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.currentTarget.value)}
          onBlur={() => void saveNote()}
          rows={3}
          placeholder="Siège au cran 4, prise serrée"
          aria-label="Note sur cet exercice"
          className={cx(
            'mt-2 w-full resize-none rounded-xl border px-4 py-3 text-[16px] leading-relaxed',
            'focus:bg-accent-soft focus:outline-none',
            noteDraft.trim() === '' ? 'border-line bg-alt' : 'border-line-2 bg-white',
          )}
        />
        <p className="mt-1.5 text-[13px] text-ink-3">
          {noteSaved ? 'Note enregistrée.' : 'Enregistrée dès que tu sors du champ.'}
        </p>
      </div>

      {points.length >= 2 && (
        <div className="mt-6">
          <SectionLabel>Évolution du 1RM estimé</SectionLabel>
          <Card className="mt-2 p-3">
            <LineChart points={points} unit="" />
          </Card>
        </div>
      )}

      {/* Fiche d'execution embarquee. */}
      {guide ? (
        <div className="mt-8 space-y-6">
          <div>
            <SectionLabel>Ce que fait ce mouvement</SectionLabel>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{guide.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {guide.primaryMuscles.map((muscle) => (
                <span
                  key={muscle}
                  className="rounded-pill bg-accent-soft px-3 py-1 text-[12px] font-semibold text-accent"
                >
                  {muscle}
                </span>
              ))}
              {guide.secondaryMuscles.map((muscle) => (
                <span
                  key={muscle}
                  className="rounded-pill bg-alt px-3 py-1 text-[12px] font-medium text-ink-2"
                >
                  {muscle}
                </span>
              ))}
            </div>
          </div>

          <GuideList label="Mise en place" items={guide.setup} ordered />
          <GuideList label="Exécution" items={guide.execution} ordered />
          <GuideList label="Points de vigilance" items={guide.cues} />
          <GuideList label="Erreurs fréquentes" items={guide.mistakes} tone="warn" />

          {/* Complement video : jamais une dependance, seulement un bonus. */}
          {guide.videoQuery && online && (
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(guide.videoQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-pill border-[1.5px] border-black/15 px-5 font-display text-[15px] font-bold"
            >
              <ExternalLink size={16} strokeWidth={2.2} />
              Voir des démonstrations en vidéo
            </a>
          )}
        </div>
      ) : (
        <div className="mt-8">
          <Card className="p-4">
            <p className="text-[15px] leading-relaxed text-ink-2">
              La fiche d’exécution de ce mouvement n’est pas encore écrite. Tes chiffres, eux, sont
              enregistrés normalement.
            </p>
          </Card>
        </div>
      )}

      {/* Retrait de la bibliotheque. En bas de fiche, loin des gestes courants,
          et derriere une confirmation qui dit ce qui arrive a l'historique. */}
      {onDeleted && (
        <>
          <div className="mt-8">
            <Button variant="danger" full onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} strokeWidth={2.2} />
              Supprimer cet exercice
            </Button>
          </div>

          <Sheet
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            title="Supprimer l’exercice"
          >
            <div className="pb-2">
              <p className="text-[15px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">{exercise.name}</strong> quitte ta
                bibliothèque et ne sera plus proposé quand tu ajoutes un exercice.
              </p>

              {workouts.length > 0 ? (
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                  Tes {workouts.length} séance{workouts.length > 1 ? 's' : ''} sur ce mouvement{' '}
                  {workouts.length > 1 ? 'restent' : 'reste'} dans l’historique, avec les charges
                  soulevées : rien n’est réécrit. Le mouvement y apparaîtra sous le nom « Exercice
                  supprimé ».
                </p>
              ) : (
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                  Tu n’as jamais travaillé ce mouvement : rien d’autre ne bouge.
                </p>
              )}

              {!exercise.isCustom && (
                <p className="mt-3 text-[14px] leading-relaxed text-ink-3">
                  Il vient du catalogue livré avec l’app. Il ne reviendra pas tout seul aux
                  prochaines mises à jour.
                </p>
              )}

              <div className="mt-5 space-y-2">
                <Button
                  variant="danger"
                  full
                  onClick={() => {
                    void exerciseRepo.remove(exercise.id).then(onDeleted);
                  }}
                >
                  Oui, supprimer
                </Button>
                <Button variant="secondary" full onClick={() => setConfirmDelete(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </Sheet>
        </>
      )}

      {/* Historique chiffre sur ce mouvement. */}
      {workouts.length > 0 && (
        <div className="mt-8">
          <SectionLabel>Historique</SectionLabel>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
            {[...workouts].reverse().map((workout) => {
              const entry = workout.entries.find((e) => e.exerciseId === exercise.id);
              if (!entry) return null;
              const sets = workingSets(entry);
              if (sets.length === 0) return null;

              return (
                <li key={workout.id} className="px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="num text-[13px] text-ink-2">
                      {DATE_FMT.format(new Date(workout.startedAt))}
                    </span>
                    <span className="num text-[13px] font-bold text-ink-2">
                      {Math.round(entryVolume(entry))} kg
                    </span>
                  </div>
                  <p className="num mt-1 text-[14px] font-semibold">
                    {sets
                      .map((s) => `${formatWeight(s.weightKg ?? 0)} × ${s.reps ?? 0}`)
                      .join('  ·  ')}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function GuideList({
  label,
  items,
  ordered = false,
  tone = 'normal',
}: {
  label: string;
  items: string[];
  ordered?: boolean;
  tone?: 'normal' | 'warn';
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li key={item} className="flex gap-2.5 text-[15px] leading-relaxed">
            <span
              className={cx(
                'num mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold',
                tone === 'warn' ? 'bg-pr-soft text-pr' : 'bg-accent-soft text-accent',
              )}
            >
              {ordered ? index + 1 : '•'}
            </span>
            <span className="text-ink-2">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
