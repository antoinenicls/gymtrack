/**
 * Report d'une seance realisee vers la routine qui l'a produite.
 *
 * Cas d'usage : l'athlete lance « Push A », ajoute une 4e serie au couche et
 * monte de 2,5 kg. La prochaine fois, il veut retrouver ce qu'il a
 * reellement fait, pas la prescription d'origine.
 *
 * Regle de prudence : on ne reporte JAMAIS automatiquement. La routine est
 * une intention, la seance est un fait, et les deux ont le droit de diverger
 * (une seance bacles un jour de fatigue ne doit pas devenir la nouvelle
 * norme). C'est donc toujours un choix explicite en fin de seance.
 */

import type { Routine, RoutineItem, RoutineSet, Workout } from '@/types/domain';
import { performedSets, workingSets } from './metrics';
import { carrySetMarks } from './setTypes';

/**
 * Transforme une seance improvisee en seance enregistree.
 *
 * Le pendant de `diffRoutineFromWorkout` pour une seance qui ne vient
 * d'AUCUNE routine : celle lancee depuis « Démarrer une séance vide ». Elle
 * n'atterrissait que dans l'historique, et le modele qu'elle constituait etait
 * perdu. Il fallait le reconstruire a la main, exercice par exercice, pour
 * refaire la meme.
 *
 * Memes regles de conversion que le report, volontairement : ce qui a ete
 * fait devient la cible, echauffement compris, et le RPE constate ne devient
 * pas une consigne, parce qu'il dit ce que l'effort a coute et non ce qu'on
 * vise.
 *
 * Deux seances construites de la meme facon doivent donner deux modeles
 * identiques, qu'elles soient parties d'une routine ou de rien.
 */
export function buildRoutineFromWorkout(
  workout: Workout,
  name: string,
  makeId: () => string,
  now: number = Date.now(),
): Routine {
  const performed = workout.entries.filter((entry) => workingSets(entry).length > 0);

  const items: RoutineItem[] = performed.map((entry, index) => ({
    id: makeId(),
    exerciseId: entry.exerciseId,
    sets: performedSets(entry).map((set) => ({
      id: makeId(),
      type: set.type,
      ...carrySetMarks(set),
      targetWeightKg: set.weightKg,
      targetReps: set.reps,
      targetRpe: null,
    })),
    restSec: entry.restSec,
    supersetGroup: entry.supersetGroup,
    notes: entry.notes,
    order: index,
  }));

  return {
    id: makeId(),
    name: name.trim() || workout.name.trim() || 'Séance enregistrée',
    // A la racine : le rangement est un geste propre a l'athlete, on ne
    // devine pas dans quel dossier il voudra la mettre.
    folderId: null,
    items,
    createdAt: now,
    updatedAt: now,
    // Elle vient d'etre faite, et c'est bien cette seance-la qui l'a produite.
    lastPerformedAt: workout.startedAt,
  };
}

/** Vrai s'il y a matiere a enregistrer : au moins une serie de travail. */
export function canBuildRoutine(workout: Workout): boolean {
  return workout.entries.some((entry) => workingSets(entry).length > 0);
}

export interface RoutineDiff {
  /** Faux si la seance colle deja a la routine : inutile de proposer. */
  changed: boolean;
  /** Phrases courtes decrivant ce qui changerait. */
  changes: string[];
  /** La routine telle qu'elle serait apres report. */
  updated: Routine;
}

/**
 * Compare une seance a sa routine et construit la version mise a jour.
 *
 * Ce qui est reporte : les exercices ajoutes ou retires, le nombre de series,
 * et les charges et repetitions reellement effectuees, qui deviennent les
 * nouvelles cibles. Les echauffements realises en font partie : les ecarter
 * les effacait de la routine a chaque report, si bien qu'il fallait les
 * ressaisir toutes les semaines.
 *
 * Ce qui n'est PAS reporte : le RPE constate, et le COMPTE des series annonce
 * ne parle que des series de travail, un echauffement n'en etant pas une.
 */
export function diffRoutineFromWorkout(
  routine: Routine,
  workout: Workout,
  exerciseName: (id: string) => string | undefined,
): RoutineDiff {
  const changes: string[] = [];

  const performed = workout.entries.filter((entry) => workingSets(entry).length > 0);

  const routineExerciseIds = routine.items.map((i) => i.exerciseId);
  const workoutExerciseIds = performed.map((e) => e.exerciseId);

  for (const id of workoutExerciseIds) {
    if (!routineExerciseIds.includes(id)) {
      changes.push(`${exerciseName(id) ?? 'Un exercice'} serait ajouté`);
    }
  }
  for (const id of routineExerciseIds) {
    if (!workoutExerciseIds.includes(id)) {
      changes.push(`${exerciseName(id) ?? 'Un exercice'} serait retiré`);
    }
  }

  // La routine reprend l'ordre de la seance : c'est l'ordre reellement
  // pratique, donc le plus pertinent pour la fois suivante.
  const items: RoutineItem[] = performed.map((entry, index) => {
    const previousItem = routine.items.find((i) => i.exerciseId === entry.exerciseId);
    // Ce qu'on ECRIT, echauffement compris ; ce qu'on ANNONCE, series de
    // travail seulement. Un echauffement n'est pas une serie de plus, il ne
    // doit donc pas faire dire « passerait de 3 a 5 series ».
    const done = performedSets(entry);
    const travail = workingSets(entry);

    if (previousItem) {
      const name = exerciseName(entry.exerciseId) ?? 'Un exercice';

      const before = previousItem.sets.filter((s) => s.type !== 'echauffement').length;
      if (before !== travail.length) {
        changes.push(
          `${name} passerait de ${before} à ${travail.length} série${travail.length > 1 ? 's' : ''}`,
        );
      }

      // Les echauffements se comptent a part, sinon un echauffement ajoute ou
      // retire pendant la seance ne serait signale nulle part, et le report ne
      // serait donc jamais propose.
      const chauffeAvant = previousItem.sets.length - before;
      const chauffeApres = done.length - travail.length;
      if (chauffeAvant !== chauffeApres) {
        changes.push(
          `${name} passerait de ${chauffeAvant} à ${chauffeApres} échauffement${
            chauffeApres > 1 ? 's' : ''
          }`,
        );
      }
    }

    const sets: RoutineSet[] = done.map((set, setIndex) => ({
      id: previousItem?.sets[setIndex]?.id ?? `${entry.id}-${setIndex}`,
      type: set.type,
      ...carrySetMarks(set),
      targetWeightKg: set.weightKg,
      targetReps: set.reps,
      // Le RPE constate n'est pas une cible : c'est ce qu'a coute l'effort,
      // pas ce qu'on vise. On conserve la consigne d'origine.
      targetRpe: previousItem?.sets[setIndex]?.targetRpe ?? null,
    }));

    return {
      id: previousItem?.id ?? entry.id,
      exerciseId: entry.exerciseId,
      sets,
      restSec: entry.restSec,
      supersetGroup: entry.supersetGroup,
      notes: entry.notes || previousItem?.notes || '',
      order: index,
    };
  });

  // Charges modifiees, signalees globalement pour ne pas noyer l'utilisateur
  // sous une ligne par serie.
  const weightChanged = performed.some((entry) => {
    const previousItem = routine.items.find((i) => i.exerciseId === entry.exerciseId);
    if (!previousItem) return false;
    // Comparaison rang par rang sur la MEME liste que celle qu'on ecrit :
    // comparee aux seules series de travail, la premiere d'entre elles se
    // retrouvait face a l'echauffement de la routine, et toute seance
    // echauffee se declarait modifiee sans l'etre.
    return performedSets(entry).some((set, i) => {
      const target = previousItem.sets[i];
      return target !== undefined && target.targetWeightKg !== set.weightKg;
    });
  });
  if (weightChanged) changes.push('Les charges cibles seraient mises à jour');

  return {
    changed: changes.length > 0,
    changes,
    updated: { ...routine, items },
  };
}
