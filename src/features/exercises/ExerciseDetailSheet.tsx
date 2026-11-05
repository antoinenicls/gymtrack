/**
 * Fiche d'un exercice, ouverte PAR-DESSUS l'ecran courant.
 *
 * Le meme geste depuis les quatre endroits ou l'on croise le nom d'un mouvement
 * sans etre dans la bibliotheque : le selecteur, la seance en cours, l'editeur
 * de seance enregistree, et sa vue d'ensemble avant lancement. Une navigation vers /exercices/:id
 * conviendrait ailleurs, mais pas ici : elle quitterait la seance ou la
 * modification en cours, alors qu'on veut seulement relire comment se fait un
 * mouvement avant de le charger.
 *
 * Le contenu est celui de l'onglet Exercices, au bouton de suppression pres :
 * retirer un mouvement de la bibliotheque depuis une seance qui l'utilise
 * n'est pas un geste qu'on cherche a rendre facile. La correction d'un
 * exercice cree, elle, y est : c'est en pleine seance qu'on voit la faute.
 */

import type { Exercise } from '@/types/domain';
import { Sheet } from '@/ui/primitives';
import ExerciseDetail from './ExerciseDetail';

export default function ExerciseDetailSheet({
  exercise,
  onClose,
  onChanged,
  footer,
}: {
  /** Null ferme la feuille. */
  exercise: Exercise | null;
  onClose: () => void;
  /**
   * Recoit l'exercice corrige. Le titre de la feuille vient de `exercise` :
   * l'appelant le remplace par celui-ci pour que le nouveau nom s'affiche.
   */
  onChanged?: (exercise: Exercise) => void;
  footer?: React.ReactNode;
}) {
  return (
    <Sheet
      open={exercise !== null}
      onClose={onClose}
      title={exercise?.name ?? ''}
      footer={footer}
    >
      {exercise !== null && (
        <ExerciseDetail
          exerciseId={exercise.id}
          showHeader={false}
          onMissing={onClose}
          onChanged={onChanged}
        />
      )}
    </Sheet>
  );
}
