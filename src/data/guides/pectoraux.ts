/**
 * Fiches d'execution : pectoraux.
 *
 * Contenu factuel : ce qu'il faut placer, dans quel ordre, et ce qui casse le
 * mouvement. Pas de promesse de resultat, pas de prescription individuelle.
 */

import type { ExerciseGuide } from '@/types/guide';

export const PECTORAUX_GUIDES: ExerciseGuide[] = [
  {
    key: 'developpe-couche',
    summary:
      'Le mouvement de poussée horizontale de référence. Ce qui progresse ici est autant la technique que la force pure.',
    primaryMuscles: ['Pectoraux'],
    secondaryMuscles: ['Triceps', 'Deltoïde antérieur'],
    setup: [
      'Cinq points d’appui : deux pieds au sol, fessiers, haut du dos, tête sur le banc.',
      'Omoplates serrées et basses, poitrine ouverte. C’est ce qui protège l’épaule.',
      'Prise un peu plus large que les épaules, poignets alignés sur les avant-bras.',
      'Léger arc lombaire naturel, fessiers qui restent en contact.',
    ],
    execution: [
      'Descends la barre vers le bas des pectoraux, pas vers le cou.',
      'Coudes à environ 45 degrés du buste, jamais complètement écartés.',
      'Touche la poitrine sans rebondir dessus.',
      'Pousse en gardant les omoplates serrées jusqu’au verrouillage.',
    ],
    cues: [
      'Pense à « plier la barre » pour engager le dos et stabiliser la poussée.',
      'Pousse le banc avec le haut du dos plutôt que de pousser la barre vers le haut.',
      'Garde les avant-bras verticaux au moment du contact.',
    ],
    mistakes: [
      'Omoplates relâchées, l’épaule roule vers l’avant et encaisse la charge.',
      'Rebond sur la poitrine, qui supprime la partie la plus difficile du mouvement.',
      'Fessiers qui décollent pour raccourcir la trajectoire.',
    ],
    diagram: 'bench',
    videoQuery: 'développé couché technique',
  },
  {
    key: 'developpe-incline-barre',
    summary:
      'Même logique que le développé couché, avec un angle qui déplace la charge vers le haut des pectoraux et l’épaule.',
    primaryMuscles: ['Pectoraux (faisceau claviculaire)'],
    secondaryMuscles: ['Deltoïde antérieur', 'Triceps'],
    setup: [
      'Banc incliné entre 30 et 45 degrés. Au-delà, ce devient un développé épaules.',
      'Omoplates serrées et basses, comme au couché.',
      'Pieds bien au sol, fessiers en contact avec le banc.',
      'Prise légèrement plus étroite qu’au développé couché.',
    ],
    execution: [
      'Descends la barre vers le haut des pectoraux, sous les clavicules.',
      'Coudes un peu plus rentrés qu’au couché, l’épaule est plus exposée sur cet angle.',
      'Touche sans rebondir, puis pousse verticalement.',
      'Verrouille sans laisser les omoplates se décoller.',
    ],
    cues: [
      'Plus l’inclinaison monte, plus l’épaule travaille et moins le pectoral prend.',
      'La barre descend plus haut sur le buste qu’au développé couché : c’est normal.',
      'Garde les poignets droits, la charge au-dessus des avant-bras.',
    ],
    mistakes: [
      'Banc trop incliné, le mouvement devient une poussée d’épaules sans qu’on s’en rende compte.',
      'Barre descendue trop bas sur le buste, ce qui ouvre l’épaule inutilement.',
      'Charge du développé couché reprise telle quelle : l’angle est plus défavorable.',
    ],
    diagram: 'bench',
    videoQuery: 'développé incliné barre technique',
  },
  {
    key: 'developpe-couche-halteres',
    summary:
      'Version haltères du développé couché : amplitude plus grande, charge plus faible, et chaque bras travaille pour lui.',
    primaryMuscles: ['Pectoraux'],
    secondaryMuscles: ['Deltoïde antérieur', 'Triceps'],
    setup: [
      'Assieds-toi haltères sur les cuisses, puis bascule en arrière en les accompagnant avec les genoux.',
      'Omoplates serrées une fois allongé, avant la première rep.',
      'Haltères au niveau des pectoraux, paumes vers l’avant.',
      'Pieds au sol, bassin stable.',
    ],
    execution: [
      'Descends jusqu’à ce que les mains arrivent au niveau du buste, pas plus bas.',
      'Coudes à environ 45 degrés, comme à la barre.',
      'Pousse en rapprochant légèrement les haltères sans les cogner.',
      'Contrôle la descente sur toute l’amplitude.',
    ],
    cues: [
      'L’amplitude supplémentaire est l’intérêt du mouvement, mais elle a une limite : la souplesse de ton épaule.',
      'Pour reposer les haltères, ramène-les sur les cuisses et redresse-toi, ne les lâche pas sur les côtés.',
      'Garde les poignets fermes, ils ont tendance à casser vers l’arrière.',
    ],
    mistakes: [
      'Descente trop profonde qui étire l’épaule au lieu de charger le pectoral.',
      'Haltères qui partent vers la tête au lieu de rester au-dessus du buste.',
      'Trajectoire différente entre les deux bras, souvent invisible sans miroir ni vidéo.',
    ],
    diagram: 'bench',
    videoQuery: 'développé couché haltères technique',
  },
  {
    key: 'developpe-incline-halteres',
    summary:
      'Le compromis le plus confortable pour le haut des pectoraux : l’angle du développé incliné, la liberté des haltères.',
    primaryMuscles: ['Pectoraux (faisceau claviculaire)'],
    secondaryMuscles: ['Deltoïde antérieur', 'Triceps'],
    setup: [
      'Banc entre 30 et 45 degrés.',
      'Monte les haltères en les accompagnant avec les cuisses.',
      'Omoplates serrées, dos calé contre le dossier.',
      'Haltères au niveau du haut des pectoraux pour démarrer.',
    ],
    execution: [
      'Descends jusqu’au niveau du buste, coudes légèrement rentrés.',
      'Pousse vers le haut en suivant une trajectoire légèrement convergente.',
      'Ne verrouille pas les coudes à fond en haut.',
      'Contrôle la descente, c’est là que le travail se fait.',
    ],
    cues: [
      'Les mains restent au-dessus des coudes tout du long.',
      'Si l’avant de l’épaule tire, réduis l’inclinaison ou l’amplitude.',
      'Serre légèrement les haltères l’un vers l’autre en fin de poussée, sans les taper.',
    ],
    mistakes: [
      'Inclinaison trop forte, qui bascule le travail sur le deltoïde.',
      'Coudes trop ouverts en bas de mouvement.',
      'Rebond en bas d’amplitude pour relancer la poussée.',
    ],
    diagram: 'bench',
    videoQuery: 'développé incliné haltères technique',
  },
  {
    key: 'ecarte-a-la-poulie',
    summary:
      'L’isolation du pectoral avec une tension qui ne disparaît jamais, contrairement aux haltères où le haut du mouvement est gratuit.',
    primaryMuscles: ['Pectoraux'],
    secondaryMuscles: ['Deltoïde antérieur'],
    setup: [
      'Poulies réglées à hauteur d’épaules ou plus haut selon la portion visée.',
      'Un pied en avant, buste légèrement penché, gainage actif.',
      'Coudes très légèrement fléchis, et cet angle ne bougera plus.',
      'Épaules basses et en arrière avant la première rep.',
    ],
    execution: [
      'Ramène les mains l’une vers l’autre en décrivant un arc de cercle.',
      'Croise légèrement les mains en fin de mouvement pour aller chercher la contraction complète.',
      'Reviens en contrôlant jusqu’à sentir l’étirement, sans forcer.',
      'Garde le buste immobile du début à la fin.',
    ],
    cues: [
      'C’est une adduction du bras, pas une extension du coude : l’angle du coude est fixe.',
      'Change la hauteur des poulies pour varier la portion sollicitée : de haut en bas, de bas en haut.',
      'Le retour compte autant que la fermeture.',
    ],
    mistakes: [
      'Coudes qui se plient et se tendent, le mouvement devient un développé mal fait.',
      'Amplitude trop grande en arrière, qui met l’épaule en position vulnérable.',
      'Buste qui accompagne le mouvement pour aider.',
    ],
    videoQuery: 'écarté poulie vis-à-vis technique',
  },
  {
    key: 'ecarte-halteres',
    summary:
      'L’isolation du pectoral en étirement. Charge légère par nature : c’est l’amplitude qui travaille, pas le poids.',
    primaryMuscles: ['Pectoraux'],
    secondaryMuscles: ['Deltoïde antérieur'],
    setup: [
      'Allongé sur un banc plat ou légèrement incliné.',
      'Haltères tendus au-dessus de la poitrine, paumes face à face.',
      'Coudes légèrement fléchis, angle qui restera constant.',
      'Omoplates serrées, comme sur tous les mouvements de poussée.',
    ],
    execution: [
      'Ouvre les bras sur les côtés en décrivant un arc.',
      'Descends jusqu’au niveau du buste, pas en dessous.',
      'Referme en pensant à rapprocher les coudes, pas les mains.',
      'Arrête-toi avant que les haltères se touchent pour garder la tension.',
    ],
    cues: [
      'L’angle du coude ne change jamais : c’est ce qui distingue l’écarté du développé.',
      'La charge doit rester modeste, l’épaule est en position ouverte.',
      'Si tu sens l’avant de l’épaule et pas le pectoral, réduis l’amplitude basse.',
    ],
    mistakes: [
      'Descente trop basse, qui met l’épaule en tension extrême sans bénéfice.',
      'Coudes qui se plient progressivement au fil de la série.',
      'Charge choisie comme pour un développé, ce qui rend l’exécution impossible à contrôler.',
    ],
    videoQuery: 'écarté haltères banc technique',
  },
  {
    key: 'developpe-machine-convergente',
    summary:
      'La poussée guidée : trajectoire imposée, donc peu de technique à gérer. Utile en fin de séance ou quand on veut pousser près de l’échec sans pareur.',
    primaryMuscles: ['Pectoraux'],
    secondaryMuscles: ['Triceps', 'Deltoïde antérieur'],
    setup: [
      'Règle la hauteur du siège pour que les poignées arrivent au niveau du milieu des pectoraux.',
      'Dos entièrement plaqué contre le dossier.',
      'Pieds au sol, gainage actif.',
      'Épaules basses, omoplates en arrière avant de pousser.',
    ],
    execution: [
      'Pousse en suivant la trajectoire de la machine, sans forcer un chemin différent.',
      'Ne verrouille pas complètement les coudes en fin de poussée.',
      'Reviens en contrôlant jusqu’à sentir l’étirement des pectoraux.',
      'Ne laisse pas la charge reposer sur la pile entre les reps.',
    ],
    cues: [
      'Le dossier fait le travail de stabilisation : profite-en pour te concentrer sur la poussée.',
      'La convergence rapproche les poignées en fin de mouvement, laisse-la faire.',
      'Un siège mal réglé transforme le mouvement en développé incliné ou décliné sans que tu l’aies choisi.',
    ],
    mistakes: [
      'Siège trop bas, les poignées arrivent trop haut et l’épaule prend tout.',
      'Épaules qui roulent vers l’avant en fin de poussée.',
      'Amplitude écourtée au retour, pour éviter la partie difficile.',
    ],
    videoQuery: 'développé machine convergente pectoraux',
  },
  {
    key: 'dips-lestes',
    summary:
      'La poussée verticale vers le bas. Très efficace pour le bas des pectoraux et le triceps, mais exigeante pour l’épaule.',
    primaryMuscles: ['Pectoraux (faisceau sternal)', 'Triceps'],
    secondaryMuscles: ['Deltoïde antérieur'],
    setup: [
      'Barres parallèles à peu près à largeur d’épaules.',
      'Ceinture de lest ou haltère tenu entre les pieds.',
      'Bras tendus, épaules basses et non remontées vers les oreilles.',
      'Buste légèrement penché en avant pour orienter le travail vers les pectoraux.',
    ],
    execution: [
      'Descends en pliant les coudes, buste penché vers l’avant.',
      'Va jusqu’à ce que les épaules arrivent au niveau des coudes, pas plus bas.',
      'Pousse pour remonter sans donner de coup de jambes.',
      'Garde une légère flexion des coudes en haut.',
    ],
    cues: [
      'Buste penché = pectoraux. Buste vertical = triceps. Choisis avant de commencer.',
      'Épaules basses en permanence : si elles remontent vers les oreilles, arrête la série.',
      'Ne descends que dans l’amplitude que ton épaule tolère sans douleur.',
    ],
    mistakes: [
      'Descente trop profonde, la plus grosse source de douleur d’épaule sur ce mouvement.',
      'Balancement des jambes qui donne de l’élan.',
      'Lest ajouté avant de maîtriser le mouvement au poids de corps.',
    ],
    videoQuery: 'dips lestés technique pectoraux',
  },
  {
    key: 'pompes',
    summary:
      'La poussée au poids de corps. Ne demande aucun matériel, et reste réglable par l’inclinaison plutôt que par la charge.',
    primaryMuscles: ['Pectoraux'],
    secondaryMuscles: ['Triceps', 'Deltoïde antérieur', 'Abdominaux'],
    setup: [
      'Mains un peu plus larges que les épaules, à hauteur de poitrine.',
      'Corps aligné des chevilles aux épaules, fessiers et abdominaux serrés.',
      'Doigts écartés, appui réparti sur toute la main.',
      'Regard légèrement en avant des mains, nuque dans l’alignement.',
    ],
    execution: [
      'Descends en gardant les coudes à environ 45 degrés du buste.',
      'Poitrine vers le sol, corps qui reste une ligne.',
      'Remonte en poussant le sol jusqu’à extension des bras.',
      'Garde le gainage du début à la fin de la série.',
    ],
    cues: [
      'Le corps monte et descend d’un bloc : le bassin ne mène pas et ne traîne pas.',
      'Pour rendre l’exercice plus facile, surélève les mains plutôt que de poser les genoux.',
      'Pour le durcir, surélève les pieds ou ralentis la descente.',
    ],
    mistakes: [
      'Bassin qui s’affaisse, ce qui met le bas du dos en cambrure.',
      'Coudes complètement écartés à 90 degrés du buste.',
      'Amplitude partielle, poitrine qui reste loin du sol.',
    ],
    videoQuery: 'pompes technique',
  },
];
