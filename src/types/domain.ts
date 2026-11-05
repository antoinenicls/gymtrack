/**
 * Modele de domaine GymTrack.
 *
 * Frontiere volontaire : aucune notion de nutrition ni de poids corporel ici.
 * La nutrition et le suivi du poids vivent dans MacroTrack.
 */

import type { ChimeId } from '@/lib/restChime';
import type { GymBrand } from './gym';

export type MuscleGroup =
  | 'pectoraux'
  | 'dos'
  | 'epaules'
  | 'biceps'
  | 'triceps'
  | 'avant-bras'
  | 'quadriceps'
  | 'ischios'
  | 'fessiers'
  | 'mollets'
  | 'abdominaux'
  | 'cardio';

export type Equipment =
  | 'barre'
  | 'halteres'
  | 'machine'
  | 'poulie'
  | 'poids du corps'
  | 'kettlebell'
  | 'autre';

/**
 * Type de serie. Le poids d'une serie d'echauffement ne compte ni dans le
 * volume ni dans les records : c'est le point de toute la typologie.
 */
export type SetType = 'normale' | 'echauffement' | 'drop' | 'echec' | 'myo';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  /** Repos par defaut en secondes. Un souleve de terre n'est pas un mollet. */
  defaultRestSec: number;
  /** Exercice ajoute par l'utilisateur, donc supprimable. */
  isCustom: boolean;
  /** Barre utilisee par defaut, pour le calculateur de disques. */
  defaultBarWeightKg?: number;
  notes?: string;
  createdAt: number;
}

export interface WorkoutSet {
  id: string;
  type: SetType;
  weightKg: number | null;
  reps: number | null;
  /** RPE de 1 a 10. Null tant que l'athlete ne l'a pas renseigne. */
  rpe: number | null;
  done: boolean;
  /** Horodatage de validation, sert a dater les records. */
  completedAt?: number;
  /** E1RM fige au moment de la validation (Brzycki). */
  e1rm?: number;
  /** Records battus par cette serie precise, calcules a la validation. */
  prKinds?: PrKind[];
  /**
   * Records DU MOIS battus, quand la serie ne bat pas le record absolu.
   * Jamais renseigne en meme temps que `prKinds`.
   */
  monthPrKinds?: PrKind[];
  /**
   * Menee jusqu'a l'echec, quel que soit son TYPE.
   *
   * Drapeau et non type, parce que « a l'echec » n'exclut pas « degressive » :
   * une descente se mene precisement jusqu'a ne plus pouvoir conclure une
   * repetition, et les deux ne pouvaient pas coexister tant que c'etait une
   * valeur du meme champ.
   *
   * Le type historique 'echec' reste valable et veut dire la meme chose : les
   * seances deja enregistrees le portent, et rien ne justifie de les
   * reecrire. `isToFailure` lit les deux.
   */
  toFailure?: boolean;
  /**
   * Ouvre une NOUVELLE descente, au lieu de prolonger celle du dessus.
   *
   * Sans cette marque, le regroupement est purement positionnel, et deux
   * degressives qui se suivent sont indistinguables d'une seule plus longue :
   * quatre paliers d'affilee formaient une descente unique alors qu'il
   * s'agissait de deux descentes de deux. Aucune position ne pouvait trancher,
   * seule l'intention le peut.
   *
   * Absent par defaut, donc une degressive posee a la suite d'une autre
   * continue de s'y rattacher : c'est le cas courant, et les seances deja
   * enregistrees gardent la lecture qu'elles avaient.
   */
  dropStart?: boolean;
}

export type PrKind = 'e1rm' | 'charge' | 'volume';

export interface WorkoutEntry {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  notes: string;
  restSec: number;
  /**
   * Identifiant de groupe de superset. Deux entries partageant la meme valeur
   * sont enchainees sans repos et affichees dans un meme conteneur.
   * Null = exercice isole.
   */
  supersetGroup: string | null;
  order: number;
}

export interface Workout {
  id: string;
  name: string;
  routineId: string | null;
  startedAt: number;
  /** Null tant que la seance est en cours. */
  endedAt: number | null;
  entries: WorkoutEntry[];
  notes: string;
  /**
   * Duree reellement travaillee en secondes, figee a la fin de seance.
   * On ne la recalcule pas depuis les timestamps : une seance mise en pause
   * ou reprise le lendemain donnerait un chiffre absurde.
   */
  durationSec: number | null;
}

/**
 * Une serie PREVUE dans une routine.
 *
 * Depuis la version 2 du schema, une routine ne stocke plus un simple nombre
 * de series mais chaque serie individuellement. C'est ce qui permet de
 * prescrire un echauffement, une degressive ou une serie a l'echec a un rang
 * precis, et d'afficher la routine comme la seance qu'elle deviendra.
 */
export interface RoutineSet {
  id: string;
  type: SetType;
  targetWeightKg: number | null;
  targetReps: number | null;
  /** RPE vise. Null = pas de consigne d'effort sur cette serie. */
  targetRpe: number | null;
  /**
   * Menee jusqu'a l'echec, quel que soit son TYPE.
   *
   * Drapeau et non type, parce que « a l'echec » n'exclut pas « degressive » :
   * une descente se mene precisement jusqu'a ne plus pouvoir conclure une
   * repetition, et les deux ne pouvaient pas coexister tant que c'etait une
   * valeur du meme champ.
   *
   * Le type historique 'echec' reste valable et veut dire la meme chose : les
   * seances deja enregistrees le portent, et rien ne justifie de les
   * reecrire. `isToFailure` lit les deux.
   */
  toFailure?: boolean;
  /**
   * Ouvre une NOUVELLE descente, au lieu de prolonger celle du dessus.
   *
   * Sans cette marque, le regroupement est purement positionnel, et deux
   * degressives qui se suivent sont indistinguables d'une seule plus longue :
   * quatre paliers d'affilee formaient une descente unique alors qu'il
   * s'agissait de deux descentes de deux. Aucune position ne pouvait trancher,
   * seule l'intention le peut.
   *
   * Absent par defaut, donc une degressive posee a la suite d'une autre
   * continue de s'y rattacher : c'est le cas courant, et les seances deja
   * enregistrees gardent la lecture qu'elles avaient.
   */
  dropStart?: boolean;
}

export interface RoutineItem {
  id: string;
  exerciseId: string;
  sets: RoutineSet[];
  restSec: number;
  supersetGroup: string | null;
  notes: string;
  order: number;
}

/**
 * Dossier de rangement des routines.
 *
 * Purement organisationnel : un dossier ne porte aucune logique
 * d'entrainement, il evite juste qu'une quinzaine de routines s'empilent en
 * une liste a plat.
 */
export interface RoutineFolder {
  id: string;
  name: string;
  order: number;
  createdAt: number;
}

export interface Routine {
  id: string;
  name: string;
  /**
   * Description libre : intention de la seance, consignes, rappels.
   *
   * Optionnelle et sans structure imposee. Elle ne remplace pas les cibles
   * portees par chaque serie. Voir la regle sur l'absence de prescription
   * dans les fiches d'execution, qui ne concerne pas ce champ : ici c'est
   * l'auteur de la seance qui ecrit ce qu'il veut, pour lui.
   */
  description?: string;
  /** Dossier de rangement. Null = a la racine. */
  folderId: string | null;
  /**
   * Rang choisi a la main dans son dossier. Absent tant que l'utilisateur n'a
   * rien range : la liste retombe alors sur « modifiee en dernier d'abord »,
   * qui reste le bon defaut pour qui n'a jamais ouvert le mode rangement.
   */
  order?: number;
  items: RoutineItem[];
  createdAt: number;
  updatedAt: number;
  lastPerformedAt: number | null;
}

/** Meilleures performances historiques pour un exercice donne. */
export interface PersonalRecord {
  exerciseId: string;
  bestE1rm: PrEntry | null;
  bestWeight: PrEntry | null;
  /** Meilleur volume sur une seule seance (somme poids x reps). */
  bestSessionVolume: PrEntry | null;
}

export interface PrEntry {
  value: number;
  weightKg: number;
  reps: number;
  achievedAt: number;
  workoutId: string;
}

export type AnalysisMode = 'historique' | 'programme';

/** Une routine de la semaine type, et combien de fois on la fait. */
export interface PlanPick {
  routineId: string;
  /** De 1 a 7. Une routine qu'on ne fait pas n'a pas d'entree du tout. */
  times: number;
}

export interface Settings {
  id: 'settings';
  /** Barres disponibles en salle, en kg. */
  barWeightsKg: number[];
  defaultBarWeightKg: number;
  /** Disques disponibles par paire, en kg, du plus lourd au plus leger. */
  availablePlatesKg: number[];
  defaultRestSec: number;
  soundEnabled: boolean;
  /**
   * Sonnerie de fin de repos. Absente = celle par defaut.
   *
   * Optionnelle, et lue par `getChime` qui retombe sur la premiere du
   * catalogue : une base ecrite avant que le choix n'existe s'ouvre donc sans
   * migration, et un identifiant disparu d'une version a l'autre ne laisse pas
   * l'app muette.
   */
  chimeId?: ChimeId;
  vibrationEnabled: boolean;
  /** Increment du pas de reglage au pouce (+/-) sur le poids. */
  weightStepKg: number;
  /** Affiche la saisie du RPE. Certains athletes ne veulent pas s'en occuper. */
  rpeEnabled: boolean;
  /** Version du catalogue d'exercices deja injectee, pour rejouer le seed. */
  seedVersion?: number;
  /**
   * Noms d'exercices LIVRES que l'athlete a supprimes, normalises.
   *
   * Sans cette liste, la prochaine montee de version du catalogue les
   * reinjecterait : le seed ne saute que les noms qu'il trouve deja en base, et
   * un exercice supprime n'y est justement plus. On se souvient donc du refus
   * plutot que de le lui faire repeter a chaque mise a jour.
   */
  deletedSeedNames?: string[];
  /** Nombre de seances visees par semaine, de 0 a 7. 0 = aucun objectif fixe. */
  weeklyGoal: number;
  /**
   * Enseigne de la salle frequentee. Null = non renseigne, et c'est le defaut :
   * l'app ne suppose jamais ou s'entraine l'athlete. Sert uniquement a signaler
   * les mouvements confirmes disponibles, jamais a en masquer d'autres.
   */
  gym?: GymBrand | null;
  /** Notification systeme a la fin du repos. */
  notificationsEnabled: boolean;
  /**
   * Cartes masquees sur l'ecran Analyse, par identifiant.
   *
   * On memorise ce qui est REFUSE, et non ce qui est affiche : une carte
   * ajoutee dans une version ulterieure apparait alors d'elle-meme, au lieu
   * de rester invisible chez tous ceux qui avaient deja personnalise leur
   * ecran sans jamais savoir qu'elle existait.
   */
  analysisHidden?: string[];
  /**
   * Ordre choisi pour les cartes d'analyse. Les identifiants inconnus de
   * cette liste, les cartes nouvelles donc, se rangent a la suite, dans l'ordre du
   * catalogue.
   */
  analysisOrder?: string[];
  /** Profondeur d'analyse en semaines. */
  analysisWeeks?: number;
  /**
   * Ce que l'ecran Analyse examine : les seances faites, ou une semaine type
   * composee de routines. Absent = historique, l'ecran tel qu'il a toujours ete.
   */
  analysisMode?: AnalysisMode;
  /**
   * Semaine type examinee en mode programme : chaque routine retenue, et le
   * nombre de fois qu'elle revient dans la semaine.
   */
  analysisPlan?: PlanPick[];
  /**
   * Dossiers de seances replies, par identifiant.
   *
   * Range ici et non dans l'ecran : un dossier reduit le reste, d'un onglet a
   * l'autre comme d'un jour a l'autre. Le rouvrir a chaque retour defaisait a
   * chaque fois le rangement qu'on venait de faire.
   *
   * On memorise ce qui est REPLIE, comme les cartes d'analyse memorisent ce
   * qui est masque : un dossier cree plus tard s'ouvre alors de lui-meme.
   */
  collapsedFolders?: string[];
}

/**
 * Seance en cours, persistee separement et a chaque mutation.
 * C'est le filet de securite : si le telephone meurt entre deux series,
 * on retrouve tout au redemarrage.
 */
export interface ActiveSession {
  id: 'active';
  workout: Workout;
  /** Chrono de recuperation en cours, s'il y en a un. */
  restTimer: RestTimerState | null;
  updatedAt: number;
}

export interface RestTimerState {
  /** Horodatage absolu de fin. On ne stocke pas un compteur qui decremente :
   *  un setInterval ne tourne pas quand l'ecran est eteint. */
  endsAt: number;
  /**
   * Duree restante figee, quand le chrono est en pause.
   *
   * En pause, `endsAt` ne veut plus rien dire : il continuerait de reculer
   * dans le passe pendant que le temps s'ecoule. On memorise donc ce qui
   * RESTE, et la reprise repose une echeance a partir de maintenant. Les deux
   * champs ne sont jamais valables ensemble : sa presence signifie « en
   * pause », son absence « en cours ».
   */
  pausedRemainingMs?: number;
  totalSec: number;
  entryId: string;
  /**
   * Serie qui a declenche ce chrono.
   *
   * Sert a savoir quoi faire quand une case est DECOCHEE : on n'arrete le
   * chrono que s'il a ete lance par cette serie-la. Decocher une serie plus
   * ancienne ne doit pas interrompre le repos en cours, qui appartient a une
   * autre.
   *
   * Optionnel : une seance deja en cours au moment de la mise a jour porte un
   * chrono sans cette information. Voir `restBelongsTo`.
   */
  setId?: string;
}
