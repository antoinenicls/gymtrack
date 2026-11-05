/**
 * Fiches d'execution : abdominaux.
 */

import type { ExerciseGuide } from '@/types/guide';

export const ABDOMINAUX_GUIDES: ExerciseGuide[] = [
  {
    key: 'crunch-a-la-poulie',
    summary:
      'La flexion du buste sous charge réglable. C’est ce qui permet de faire progresser le travail abdominal autrement qu’en ajoutant des reps.',
    primaryMuscles: ['Grand droit de l’abdomen'],
    secondaryMuscles: ['Obliques'],
    setup: [
      'À genoux face à une poulie haute, corde tenue de part et d’autre de la tête.',
      'Mains fixes contre les tempes ou le front, elles ne tireront pas.',
      'Hanches légèrement fléchies et immobiles pendant toute la série.',
      'Recule assez pour que la charge soit en tension au départ.',
    ],
    execution: [
      'Enroule le buste vers le bas en rapprochant les côtes du bassin.',
      'Descends jusqu’à la contraction complète, dos arrondi volontairement.',
      'Remonte en déroulant lentement, sans repartir en arrière.',
      'Garde les hanches au même angle du début à la fin.',
    ],
    cues: [
      'C’est le dos qui s’enroule, pas la hanche qui plie.',
      'Les bras ne tirent pas sur la corde, ils la maintiennent.',
      'Souffle en descendant, c’est ce qui aide à enrouler complètement.',
    ],
    mistakes: [
      'Mouvement fait à la hanche, ce qui en fait un tirage et non un crunch.',
      'Bras qui tirent sur la corde et déplacent le travail sur les dorsaux.',
      'Retour non contrôlé, qui laisse la charge ramener le buste en arrière.',
    ],
    videoQuery: 'crunch poulie haute technique',
  },
  {
    key: 'releve-de-jambes-suspendu',
    summary:
      'Le travail abdominal en suspension. Demande une prise solide et un contrôle réel : sans les deux, ça devient du balancier.',
    primaryMuscles: ['Grand droit de l’abdomen', 'Fléchisseurs de hanche'],
    secondaryMuscles: ['Obliques', 'Avant-bras'],
    setup: [
      'Suspendu à une barre fixe, prise en pronation largeur d’épaules.',
      'Épaules engagées et basses, pas relâchées dans les articulations.',
      'Corps immobile avant la première rep, jambes tendues ou fléchies selon ton niveau.',
      'Sangles utiles si la prise lâche avant les abdominaux.',
    ],
    execution: [
      'Monte les jambes en enroulant le bassin vers le haut.',
      'Monte jusqu’à la hauteur des hanches au minimum, plus haut si tu contrôles.',
      'Redescends lentement jusqu’à la position de départ.',
      'Attends que le corps soit stable avant d’enchaîner.',
    ],
    cues: [
      'Le bassin doit s’enrouler : sans ça, seuls les fléchisseurs de hanche travaillent.',
      'Genoux fléchis pour commencer, jambes tendues quand le contrôle est là.',
      'Si le corps balance, arrête la série : les reps suivantes ne comptent plus.',
    ],
    mistakes: [
      'Balancement du corps qui donne l’élan à la place des abdominaux.',
      'Bassin qui reste fixe, jambes qui montent seules.',
      'Descente en chute libre, qui secoue l’épaule et le bas du dos.',
    ],
    videoQuery: 'relevé de jambes suspendu technique',
  },
  {
    key: 'gainage',
    summary:
      'Le maintien isométrique de la position. Ne se compte pas en reps mais en secondes, et se dégrade beaucoup plus vite qu’on ne le croit.',
    primaryMuscles: ['Grand droit de l’abdomen', 'Transverse'],
    secondaryMuscles: ['Obliques', 'Fessiers', 'Épaules'],
    setup: [
      'Avant-bras au sol, coudes sous les épaules.',
      'Pieds largeur de hanches, appui sur les pointes.',
      'Corps aligné des chevilles aux épaules.',
      'Regard vers le sol, nuque dans l’alignement.',
    ],
    execution: [
      'Serre les abdominaux et les fessiers dès la première seconde.',
      'Pousse le sol avec les avant-bras pour écarter les omoplates.',
      'Respire normalement, sans bloquer.',
      'Arrête la série quand la position se dégrade, pas quand le chrono sonne.',
    ],
    cues: [
      'Rentre légèrement le bassin : c’est ce qui empêche de cambrer.',
      'La qualité de position définit la durée, pas l’inverse.',
      'Se note en secondes dans les notes de série.',
    ],
    mistakes: [
      'Bassin qui s’affaisse, ce qui met le bas du dos en cambrure.',
      'Fessiers relevés en triangle pour soulager.',
      'Apnée pendant tout le maintien.',
    ],
    videoQuery: 'gainage planche technique',
  },
  {
    key: 'roue-abdominale',
    summary:
      'Un anti-extension : le travail consiste à empêcher le dos de cambrer pendant que les bras s’éloignent. Exigeant, et sans intérêt s’il est mal fait.',
    primaryMuscles: ['Grand droit de l’abdomen', 'Transverse'],
    secondaryMuscles: ['Dorsaux', 'Épaules', 'Fessiers'],
    setup: [
      'À genoux, roue au sol sous les épaules.',
      'Bassin légèrement rentré, abdominaux et fessiers serrés.',
      'Bras tendus, épaules engagées.',
      'Tapis ou serviette sous les genoux.',
    ],
    execution: [
      'Déroule vers l’avant en gardant le dos strictement plat.',
      'Va aussi loin que tu peux sans que le bas du dos cambre.',
      'Reviens en tirant avec les abdominaux, pas en pliant les hanches.',
      'Garde le gainage du début à la fin de la série.',
    ],
    cues: [
      'L’amplitude utile est celle où le dos reste plat : elle est plus courte qu’on ne le pense au début.',
      'Si tu sens le bas du dos, tu es allé trop loin.',
      'Commence face à un mur pour limiter la sortie et progresser en reculant.',
    ],
    mistakes: [
      'Cambrure lombaire en fin d’extension, l’erreur qui rend le mouvement contre-productif.',
      'Retour fait avec les hanches, en s’asseyant sur les talons.',
      'Amplitude complète tentée avant d’avoir le gainage pour la tenir.',
    ],
    videoQuery: 'roue abdominale ab wheel technique',
  },
];
