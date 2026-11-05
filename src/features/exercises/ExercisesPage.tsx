/** Bibliotheque d'exercices, triee par groupe musculaire. */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus, Search } from 'lucide-react';
import type { Exercise } from '@/types/domain';
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from '@/data/seedExercises';
import { exerciseRepo } from '@/services/repositories';
import { getGuide } from '@/data/guides';
import { guideKey } from '@/types/guide';
import type { GymBrand } from '@/types/gym';
import { GYM_LABELS } from '@/types/gym';
import { gymAlias, gymPresence } from '@/data/gymCatalog';
import { settingsRepo } from '@/services/repositories';
import { Button, EmptyState, PageTitle } from '@/ui/primitives';
import { useHistoryState } from '@/ui/useHistoryState';
import CreateExerciseSheet from './CreateExerciseSheet';

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  // Conservee au retour arriere : sans elle, la position de defilement serait
  // restauree sur une liste redevenue complete, donc au mauvais endroit.
  const [query, setQuery] = useHistoryState('recherche', '');
  const [creating, setCreating] = useState(false);
  const [gym, setGym] = useState<GymBrand | null>(null);

  /**
   * Hauteur MESUREE de la barre de recherche.
   *
   * C'est sous elle que viennent s'epingler les titres de groupe musculaire, et
   * un `top` ecrit en dur se serait decale au premier changement : le bouton
   * « + » fixe la hauteur de la barre, et il suffit d'un reglage de taille de
   * texte du systeme pour qu'elle ne soit plus celle qu'on avait comptee. On
   * mesure donc, et on suit les changements.
   */
  const [searchBar, setSearchBar] = useState<HTMLDivElement | null>(null);
  const [searchBarHeight, setSearchBarHeight] = useState(0);

  useEffect(() => {
    if (!searchBar) return;
    const measure = (): void => setSearchBarHeight(searchBar.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(searchBar);
    return () => observer.disconnect();
  }, [searchBar]);

  const reload = (): void => {
    void exerciseRepo.all().then(setExercises);
  };
  useEffect(reload, []);
  useEffect(() => {
    void settingsRepo.get().then((s) => setGym(s.gym ?? null));
  }, []);

  const grouped = useMemo(() => {
    const needle = normalize(query);
    const matching = exercises.filter(
      (e) => needle === '' || normalize(e.name).includes(needle),
    );
    return MUSCLE_GROUP_ORDER.map((group) => ({
      group,
      items: matching.filter((e) => e.muscleGroup === group),
    })).filter((section) => section.items.length > 0);
  }, [exercises, query]);

  return (
    <div className="pb-6">
      <PageTitle sub={`${exercises.length} mouvements dans ta bibliothèque`}>Exercices</PageTitle>

      {/* Epinglee en haut du conteneur de defilement : la bibliotheque est
          longue, et chercher un mouvement ne doit jamais obliger a remonter. */}
      <div
        ref={setSearchBar}
        className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white/95 px-4 py-2 backdrop-blur"
      >
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Rechercher"
            aria-label="Rechercher un exercice"
            className="w-full rounded-xl bg-alt py-3 pl-10 pr-3 text-[16px] focus:bg-accent-soft focus:outline-none"
          />
        </div>
        <Button onClick={() => setCreating(true)} className="px-4">
          <Plus size={18} strokeWidth={2.5} />
        </Button>
      </div>

      {grouped.length === 0 ? (
        <EmptyState title="Aucun exercice trouvé">
          Tu peux créer le mouvement manquant avec le bouton en haut à droite.
        </EmptyState>
      ) : (
        /**
         * Les groupes se SUIVENT, sans espace entre eux.
         *
         * Un intervalle vide entre deux sections laisserait un moment sans
         * aucun titre epingle : le titre du groupe qui sort reste colle tant
         * que sa section est a l'ecran, et celui du suivant ne prend le relais
         * qu'en arrivant en haut. Bord a bord, la releve est immediate, et les
         * titres epingles servent eux-memes de separateurs.
         */
        <div className="mt-4">
          {grouped.map(({ group, items }) => (
            <section key={group}>
              {/* Epingle SOUS la barre de recherche, jamais par-dessus : d'ou
                  le `top` mesure et le z-index inferieur au sien. En montant
                  comme en descendant, le titre du groupe ou l'on se trouve
                  reste donc lisible en permanence.

                  Fond PLEIN, contrairement a la barre de recherche au-dessus :
                  en `bg-white/95 backdrop-blur`, WebKit rendait le flou depuis
                  un fond perime et le nom de l'exercice qui passait dessous
                  restait lisible en travers du titre. Verifie a l'ecran. */}
              <h2
                style={{ top: searchBarHeight }}
                className="sticky z-[5] border-b border-line bg-white px-4 py-2 font-display text-[13px] font-bold uppercase tracking-[2px] text-ink-3"
              >
                {MUSCLE_GROUP_LABELS[group]}
              </h2>
              <ul className="divide-y divide-line border-b border-line">
                {items.map((exercise) => {
                  const key = guideKey(exercise.name);
                  const hasGuide = getGuide(key) !== undefined;
                  // Pastille affichee seulement sur un 'present' confirme. Un
                  // 'inconnu' n'affiche rien : le releve est partiel, et
                  // l'absence d'information ne se presente pas comme un fait.
                  const confirme = gym !== null && gymPresence(key, gym) === 'present';
                  const alias = gym !== null ? gymAlias(key, gym) : undefined;
                  return (
                    <li key={exercise.id}>
                      <Link
                        to={`/exercices/${exercise.id}`}
                        className="pressable pressable-wide flex min-h-[56px] items-center gap-3 bg-white px-4 py-2.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px] font-semibold">
                            {exercise.name}
                          </span>
                          <span className="block truncate text-[13px] text-ink-2">
                            {exercise.equipment}
                            {hasGuide && ' · fiche d’exécution'}
                            {alias !== undefined && ` · ${alias}`}
                          </span>
                        </span>
                        {confirme && gym !== null && (
                          <span
                            title={`Confirmé disponible chez ${GYM_LABELS[gym]}`}
                            className="shrink-0 rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent"
                          >
                            {GYM_LABELS[gym]}
                          </span>
                        )}
                        <ChevronRight size={18} className="shrink-0 text-ink-3" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <CreateExerciseSheet
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          reload();
        }}
      />
    </div>
  );
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
