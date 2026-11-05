/**
 * Selecteur d'exercices, ouvert depuis la seance.
 *
 * Selection multiple : on ajoute rarement un seul exercice, et enchainer
 * quatre allers-retours dans une feuille modale est penible au milieu d'une
 * seance.
 */

import { useEffect, useMemo, useState } from 'react';
import { Check, Info, Plus, Search } from 'lucide-react';
import type { Exercise, MuscleGroup } from '@/types/domain';
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from '@/data/seedExercises';
import { exerciseRepo } from '@/services/repositories';
import { normalizeText } from '@/lib/text';
import { Button, Chip, Sheet, cx } from '@/ui/primitives';
import CreateExerciseSheet from './CreateExerciseSheet';
import ExerciseDetailSheet from './ExerciseDetailSheet';

export default function ExercisePicker({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (exerciseIds: string[]) => void;
}) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'tous'>('tous');
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  /**
   * Fiche consultee sans quitter le selecteur. Une navigation vers la route
   * /exercices/:id fermerait la feuille et jetterait les cases deja cochees, au
   * milieu d'une seance : lire comment se fait un mouvement ne doit pas couter
   * la selection en cours.
   */
  const [detailed, setDetailed] = useState<Exercise | null>(null);

  useEffect(() => {
    if (!open) return;
    void exerciseRepo.all().then(setExercises);
    setSelected([]);
    setQuery('');
    setDetailed(null);
  }, [open]);

  /**
   * Un exercice cree ici l'est POUR etre ajoute : on le coche d'office.
   *
   * On CADRE ensuite la liste sur son nom, au lieu de vider la recherche. La
   * liste est triee alphabetiquement : un mouvement cree sous R atterrit hors
   * de l'ecran, coche sans que rien ne se voie, et on croit la creation
   * perdue. Filtre, il est seul a l'ecran et coche, et la recherche se vide d'un
   * geste pour en ajouter d'autres.
   */
  const handleCreated = (exercise: Exercise): void => {
    void exerciseRepo.all().then(setExercises);
    setSelected((current) => [...current, exercise.id]);
    setQuery(exercise.name);
    setGroup('tous');
    setCreating(false);
  };

  const filtered = useMemo(() => {
    const needle = normalizeText(query);
    return exercises.filter((exercise) => {
      if (group !== 'tous' && exercise.muscleGroup !== group) return false;
      if (needle === '') return true;
      return normalizeText(exercise.name).includes(needle);
    });
  }, [exercises, query, group]);

  const groups = useMemo(() => {
    const present = new Set(exercises.map((e) => e.muscleGroup));
    return MUSCLE_GROUP_ORDER.filter((g) => present.has(g));
  }, [exercises]);

  const toggle = (id: string): void =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajouter des exercices"
      // Hauteur fixe : sans elle, la feuille retrecit a mesure que la recherche
      // filtre, et « Créer « … » » finit sous le clavier au moment precis ou
      // plus aucun exercice ne correspond, donc ou on en a besoin.
      tall
      footer={
        <Button
          full
          disabled={selected.length === 0}
          onClick={() => {
            onConfirm(selected);
            onClose();
          }}
        >
          {selected.length === 0
            ? 'Sélectionne un exercice'
            : `Ajouter ${selected.length} exercice${selected.length > 1 ? 's' : ''}`}
        </Button>
      }
    >
      {/* z-10 EST INDISPENSABLE, et pas decoratif : chaque ligne de la liste
          porte `.pressable`, donc un `will-change: transform` qui la promeut en
          couche peinte avec les elements positionnes. A z-index automatique,
          l'en-tete perdait alors contre des lignes situees APRES lui dans le
          DOM, qui defilaient par-dessus la recherche et les filtres.
          L'espacement sous l'en-tete est un `pb`, pas un `mb` : une marge
          laisserait une bande transparente ou les lignes reapparaitraient.

          En HAUT, meme probleme pour une autre raison : la feuille a un `py-3`,
          et la butee de collage se mesure depuis le bord INTERIEUR du padding.
          A `top-0`, l'en-tete se calait donc 12 px trop bas (mesure), et les
          lignes defilaient en clair dans cette bande, au-dessus du champ. D'ou
          `-top-3`, qui colle l'en-tete contre le bord reel, avec `-mt-3` pour
          qu'il couvre deja la bande avant meme d'etre colle, et `pt-3` qui rend
          l'espace a l'interieur. */}
      <div className="sticky -top-3 z-10 -mx-4 -mt-3 bg-white px-4 pb-3 pt-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
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
          {/* Meme geste que dans l'onglet Exercices : le « + » a droite de la
              recherche cree le mouvement manquant, sans quitter la feuille. */}
          <Button
            onClick={() => setCreating(true)}
            aria-label="Créer un exercice"
            className="px-4"
          >
            <Plus size={18} strokeWidth={2.5} />
          </Button>
        </div>

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
      </div>

      {filtered.length === 0 ? (
        /* Colle SOUS le champ de recherche, sans respiration decorative. Un
           `py-10` centrait joliment le message dans une liste pleine hauteur,
           mais poussait le bouton de creation dans la zone du clavier : c'est
           l'exact moment ou il sert, il doit rester sous les yeux. */
        <div className="pt-4 text-center">
          <p className="text-[15px] text-ink-2">Aucun exercice ne correspond.</p>
          <Button variant="secondary" className="mt-2.5" onClick={() => setCreating(true)}>
            <Plus size={17} strokeWidth={2.4} />
            {query.trim() === '' ? 'Créer un exercice' : `Créer « ${query.trim()} »`}
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {filtered.map((exercise) => {
            const isSelected = selected.includes(exercise.id);
            return (
              <li key={exercise.id} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => toggle(exercise.id)}
                  aria-pressed={isSelected}
                  className="pressable pressable-wide flex min-h-[56px] min-w-0 flex-1 items-center gap-3 py-2 text-left"
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
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold">{exercise.name}</span>
                    <span className="block text-[13px] text-ink-2">
                      {MUSCLE_GROUP_LABELS[exercise.muscleGroup]} · {exercise.equipment}
                    </span>
                  </span>
                </button>
                {/* Cible tactile distincte de la ligne, sinon on cocherait en
                    voulant consulter. Elle deborde a droite jusqu'au bord de la
                    feuille (-mr-4 / pr-4) pour recuperer les 44 px reglementaires
                    sans manger le nom du mouvement. */}
                <button
                  type="button"
                  onClick={() => setDetailed(exercise)}
                  aria-label={`Détails de ${exercise.name}`}
                  className="pressable -mr-4 flex w-11 shrink-0 items-center justify-end pr-4 text-ink-3"
                >
                  <Info size={19} strokeWidth={2.2} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Feuille par-dessus feuille : elle est rendue dans un portail sur le
          body, donc elle passe devant celle-ci sans jeu d'empilement. */}
      <CreateExerciseSheet
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={handleCreated}
        initialName={query.trim()}
      />

      {/* Fiche consultee par-dessus la liste. Le bouton de bas de feuille coche
          le mouvement et referme : c'est le geste qui suit presque toujours la
          lecture, et il evite de refaire le tri visuel dans la liste. */}
      <ExerciseDetailSheet
        exercise={detailed}
        onClose={() => setDetailed(null)}
        onChanged={(updated) => {
          setDetailed(updated);
          setExercises((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        }}
        footer={
          detailed !== null && !selected.includes(detailed.id) ? (
            <Button
              full
              onClick={() => {
                toggle(detailed.id);
                setDetailed(null);
              }}
            >
              Ajouter à la sélection
            </Button>
          ) : undefined
        }
      />
    </Sheet>
  );
}
