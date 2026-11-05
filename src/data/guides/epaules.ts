/**
 * Fiches d'execution : epaules.
 */

import type { ExerciseGuide } from '@/types/guide';

export const EPAULES_GUIDES: ExerciseGuide[] = [
  {
    key: 'developpe-militaire',
    summary:
      'La poussée verticale de référence. Exigeant en gainage, parce que rien ne stabilise le buste à ta place.',
    primaryMuscles: ['Deltoïde antérieur', 'Deltoïde latéral'],
    secondaryMuscles: ['Triceps', 'Trapèzes', 'Abdominaux'],
    setup: [
      'Barre posée sur le haut des pectoraux, coudes légèrement en avant.',
      'Pieds largeur de hanches, jambes verrouillées.',
      'Abdominaux et fessiers serrés pour empêcher le buste de partir en arrière.',
      'Prise légèrement plus large que les épaules.',
    ],
    execution: [
      'Recule légèrement la tête pour libérer la trajectoire de la barre.',
      'Pousse verticalement, la barre passe au plus près du visage.',
      'Une fois la barre au-dessus du front, avance la tête sous la barre.',
      'Verrouille avec la barre au-dessus des oreilles, pas devant.',
    ],
    cues: [
      'Serre les fessiers : c’est ce qui empêche de cambrer.',
      'La barre finit dans l’alignement du milieu du pied, vue de profil.',
      'Garde les poignets droits, pas cassés vers l’arrière.',
    ],
    mistakes: [
      'Cambrure lombaire pour compenser un manque de mobilité d’épaule.',
      'Barre poussée vers l’avant, qui reste devant le visage en fin de mouvement.',
      'Impulsion des jambes non voulue, qui transforme le mouvement en épaulé-jeté.',
    ],
    diagram: 'overhead-press',
    videoQuery: 'développé militaire technique',
  },
  {
    key: 'developpe-epaules-halteres',
    summary:
      'La poussée verticale aux haltères. Chaque bras suit sa propre trajectoire, ce qui convient souvent mieux aux épaules que la barre.',
    primaryMuscles: ['Deltoïde antérieur', 'Deltoïde latéral'],
    secondaryMuscles: ['Triceps', 'Trapèzes'],
    setup: [
      'Assis avec un dossier presque vertical, ou debout si le gainage suit.',
      'Haltères au niveau des oreilles, paumes vers l’avant ou légèrement tournées.',
      'Dos plaqué au dossier, abdominaux serrés.',
      'Coudes légèrement en avant du plan des épaules, pas complètement ouverts.',
    ],
    execution: [
      'Pousse vers le haut en rapprochant légèrement les haltères.',
      'Arrête-toi avant que les haltères se touchent, coudes non verrouillés.',
      'Descends en contrôlant jusqu’au niveau des oreilles.',
      'Garde la même trajectoire des deux côtés.',
    ],
    cues: [
      'Coudes légèrement en avant : c’est plus confortable pour l’épaule que le plan strictement frontal.',
      'Le dos reste collé au dossier, même sur la dernière rep.',
      'Pour reposer les haltères, redescends-les sur les cuisses, ne les lâche pas sur les côtés.',
    ],
    mistakes: [
      'Cambrure qui transforme le mouvement en développé incliné.',
      'Descente trop basse, qui met l’épaule en fin d’amplitude sous charge.',
      'Coudes complètement ouverts dans le plan du corps.',
    ],
    diagram: 'overhead-press',
    videoQuery: 'développé épaules haltères technique',
  },
  {
    key: 'elevations-laterales',
    summary:
      'L’isolation du deltoïde latéral, celui qui donne la largeur d’épaules. Charge légère, exécution stricte.',
    primaryMuscles: ['Deltoïde latéral'],
    secondaryMuscles: ['Trapèzes supérieurs'],
    setup: [
      'Debout, haltères le long du corps, coudes très légèrement fléchis.',
      'Buste légèrement penché en avant, quelques degrés seulement.',
      'Épaules basses avant de commencer.',
    ],
    execution: [
      'Monte les bras sur les côtés jusqu’à la hauteur des épaules.',
      'Garde l’angle de coude constant pendant toute la montée.',
      'Descends lentement, sans laisser tomber les bras.',
    ],
    cues: [
      'Mène le mouvement avec les coudes, pas avec les mains.',
      'Imagine verser de l’eau d’une bouteille en fin de montée.',
      'Si les trapèzes prennent tout, la charge est trop lourde.',
    ],
    mistakes: [
      'Élan du buste pour lancer la charge.',
      'Montée au-dessus de la ligne des épaules, où le trapèze prend le relais.',
      'Descente en chute libre, qui supprime la moitié du travail.',
    ],
    diagram: 'lateral-raise',
    videoQuery: 'élévations latérales technique',
  },
  {
    key: 'elevations-laterales-poulie',
    summary:
      'La même isolation qu’aux haltères, mais la tension existe dès le départ du mouvement au lieu d’apparaître à mi-course.',
    primaryMuscles: ['Deltoïde latéral'],
    secondaryMuscles: ['Trapèzes supérieurs'],
    setup: [
      'Poulie réglée au plus bas, câble qui passe devant ou derrière le corps.',
      'Debout de profil, main opposée sur le montant pour te stabiliser.',
      'Bras le long du corps, coude très légèrement fléchi.',
      'Épaule basse avant de commencer.',
    ],
    execution: [
      'Monte le bras sur le côté jusqu’à la hauteur de l’épaule.',
      'Garde l’angle du coude constant.',
      'Redescends lentement en résistant à la traction du câble.',
      'Ne laisse pas la charge reposer entre les reps.',
    ],
    cues: [
      'L’intérêt du câble est le bas du mouvement : ne le survole pas.',
      'Le buste reste immobile, seule l’épaule travaille.',
      'Alterne les côtés en gardant le même nombre de reps propres.',
    ],
    mistakes: [
      'Buste qui s’incline à l’opposé pour aider la montée.',
      'Montée trop haute, où le trapèze prend le relais.',
      'Retour en chute libre, qui annule l’avantage du câble.',
    ],
    diagram: 'lateral-raise',
    videoQuery: 'élévation latérale poulie technique',
  },
  {
    key: 'oiseau-halteres',
    summary:
      'L’isolation de l’arrière d’épaule, la portion la plus souvent négligée alors qu’elle équilibre tout le travail de poussée.',
    primaryMuscles: ['Deltoïde postérieur'],
    secondaryMuscles: ['Rhomboïdes', 'Trapèzes moyens'],
    setup: [
      'Buste penché vers l’avant, quasiment parallèle au sol, dos plat.',
      'Assis en bout de banc ou debout jambes fléchies.',
      'Haltères sous la poitrine, paumes face à face, coudes légèrement fléchis.',
      'Nuque dans l’alignement du dos.',
    ],
    execution: [
      'Ouvre les bras sur les côtés jusqu’à la ligne des épaules.',
      'Garde l’angle du coude constant tout du long.',
      'Serre brièvement en position haute.',
      'Redescends en contrôlant sans laisser tomber.',
    ],
    cues: [
      'Mène avec les coudes, comme aux élévations latérales.',
      'Charge légère : ce muscle ne tolère pas la triche.',
      'Si tu sens surtout entre les omoplates, écarte un peu plus les coudes du corps.',
    ],
    mistakes: [
      'Buste qui se redresse à chaque rep pour donner de l’élan.',
      'Coudes qui se plient et se tendent, ce qui transforme le mouvement en rowing.',
      'Charge trop lourde qui fait travailler le dos à la place de l’épaule.',
    ],
    diagram: 'lateral-raise',
    videoQuery: 'oiseau haltères deltoïde postérieur technique',
  },
  {
    key: 'face-pull',
    summary:
      'Un tirage haut vers le visage qui travaille l’arrière d’épaule et les rotateurs. Le meilleur contrepoids au volume de développés.',
    primaryMuscles: ['Deltoïde postérieur'],
    secondaryMuscles: ['Rotateurs externes', 'Trapèzes moyens', 'Rhomboïdes'],
    setup: [
      'Corde attachée à une poulie réglée à hauteur de visage ou un peu au-dessus.',
      'Prise neutre, pouces vers toi, bras tendus.',
      'Un pied en avant, gainage actif, épaules basses.',
      'Recule assez pour que la charge soit en tension dès le départ.',
    ],
    execution: [
      'Tire la corde vers le visage en écartant les mains.',
      'Les coudes montent et restent à hauteur d’épaules.',
      'Finis avec les mains de part et d’autre de la tête, paumes vers l’avant.',
      'Reviens en contrôlant jusqu’à extension complète.',
    ],
    cues: [
      'Coudes hauts : s’ils tombent, le mouvement devient un tirage horizontal.',
      'Charge légère, exécution lente. Ce n’est pas un mouvement de force.',
      'Pense à séparer les deux brins de corde en fin de tirage.',
    ],
    mistakes: [
      'Buste qui recule pour compenser une charge trop lourde.',
      'Tirage vers la poitrine au lieu du visage.',
      'Coudes bas, qui suppriment la composante de rotation externe.',
    ],
    videoQuery: 'face pull technique épaules',
  },
  {
    key: 'developpe-arnold',
    summary:
      'Un développé épaules avec rotation : l’amplitude est plus grande et l’avant d’épaule travaille sur une course plus longue.',
    primaryMuscles: ['Deltoïde antérieur', 'Deltoïde latéral'],
    secondaryMuscles: ['Triceps', 'Trapèzes'],
    setup: [
      'Assis, dossier presque vertical, dos plaqué.',
      'Haltères devant la poitrine, paumes tournées vers toi, coudes serrés.',
      'Abdominaux serrés, pieds au sol.',
      'Charge nettement plus légère qu’à un développé haltères classique.',
    ],
    execution: [
      'Ouvre les coudes tout en tournant les paumes vers l’avant.',
      'Enchaîne la rotation et la poussée en un seul geste continu.',
      'Termine bras tendus au-dessus de la tête, coudes non verrouillés.',
      'Redescends en inversant exactement la rotation.',
    ],
    cues: [
      'La rotation se fait pendant la montée, pas avant ni après.',
      'Le mouvement doit rester fluide : s’il saccade, la charge est trop lourde.',
      'Garde le dos collé au dossier pendant toute la série.',
    ],
    mistakes: [
      'Rotation bâclée, qui réduit le mouvement à un développé ordinaire.',
      'Cambrure lombaire en fin de poussée.',
      'Charge calquée sur le développé haltères, alors que la position de départ est bien plus défavorable.',
    ],
    diagram: 'overhead-press',
    videoQuery: 'développé Arnold technique',
  },
];
