/**
 * Fiches d'execution : dos.
 */

import type { ExerciseGuide } from '@/types/guide';

export const DOS_GUIDES: ExerciseGuide[] = [
  {
    key: 'souleve-de-terre',
    summary:
      'Le mouvement qui charge le plus lourd. Très coûteux nerveusement, donc à placer en début de séance et à ne pas multiplier.',
    primaryMuscles: ['Ischios', 'Fessiers', 'Érecteurs du rachis'],
    secondaryMuscles: ['Dorsaux', 'Trapèzes', 'Avant-bras', 'Quadriceps'],
    setup: [
      'Barre au-dessus du milieu du pied, tibias à quelques centimètres.',
      'Pieds largeur de hanches, mains juste à l’extérieur des jambes.',
      'Descends en pliant les hanches puis les genoux jusqu’à saisir la barre.',
      'Poitrine sortie, dos plat, épaules légèrement en avant de la barre.',
    ],
    execution: [
      'Mets la barre en tension avant de tirer : elle doit « claquer » contre les disques.',
      'Pousse le sol avec les jambes, la barre reste collée aux tibias.',
      'Une fois la barre aux genoux, pousse les hanches vers l’avant.',
      'Verrouille debout sans hyperextension du bas du dos.',
    ],
    cues: [
      'Le dos ne bouge pas d’angle tant que la barre n’a pas quitté le sol.',
      'Pense à « pousser le sol » plutôt qu’à « tirer la barre ».',
      'Bloque ta respiration en bas et souffle une fois debout.',
    ],
    mistakes: [
      'Les hanches partent en premier, le bas du dos prend tout.',
      'La barre s’éloigne des jambes, le bras de levier explose.',
      'Hyperextension en fin de mouvement, inutile et coûteuse pour les lombaires.',
    ],
    diagram: 'deadlift',
    videoQuery: 'soulevé de terre technique',
  },
  {
    key: 'rowing-barre',
    summary:
      'Le tirage horizontal lourd. Construit l’épaisseur du dos, et équilibre le volume de poussée du haut du corps.',
    primaryMuscles: ['Dorsaux', 'Rhomboïdes', 'Trapèzes moyens'],
    secondaryMuscles: ['Biceps', 'Deltoïde postérieur', 'Érecteurs du rachis'],
    setup: [
      'Buste penché entre 45 et 70 degrés, dos plat.',
      'Genoux légèrement fléchis, hanches en arrière.',
      'Prise en pronation, un peu plus large que les épaules.',
      'Barre pendue bras tendus, à l’aplomb du milieu du pied.',
    ],
    execution: [
      'Tire la barre vers le bas des côtes ou le nombril.',
      'Coudes qui longent le corps, pas qui s’écartent à 90 degrés.',
      'Serre les omoplates en fin de tirage.',
      'Contrôle la descente, ne laisse pas la barre tomber.',
    ],
    cues: [
      'Pense à « tirer avec les coudes », pas avec les mains.',
      'Le buste garde le même angle du début à la fin de la série.',
      'La barre part du sol ou d’un rack, pas d’une flexion improvisée.',
    ],
    mistakes: [
      'Le buste se redresse à chaque rep, ce qui allège la charge sans le dire.',
      'Coup de reins qui remplace le travail du dos.',
      'Amplitude écourtée en haut, sans contact réel avec le buste.',
    ],
    diagram: 'row',
    videoQuery: 'rowing barre technique',
  },
  {
    key: 'rowing-haltere',
    summary:
      'Le tirage unilatéral. Chaque côté travaille seul, ce qui rend les écarts droite-gauche visibles au lieu de les masquer.',
    primaryMuscles: ['Dorsaux'],
    secondaryMuscles: ['Rhomboïdes', 'Biceps', 'Deltoïde postérieur'],
    setup: [
      'Un genou et une main sur le banc, l’autre pied au sol légèrement en arrière.',
      'Dos plat et parallèle au sol, bassin de niveau.',
      'Haltère au sol dans l’axe de l’épaule, bras tendu.',
      'Nuque dans l’alignement, regard vers le banc.',
    ],
    execution: [
      'Tire l’haltère vers la hanche, pas vers l’épaule.',
      'Le coude longe le corps et dépasse la ligne du dos en fin de tirage.',
      'Descends jusqu’à extension complète du bras en gardant l’épaule engagée.',
      'Enchaîne sans faire tourner le buste.',
    ],
    cues: [
      'Le buste reste fixe : c’est le bras qui bouge, pas le torse.',
      'Le bassin reste parallèle au sol, il ne s’ouvre pas côté haltère.',
      'Commence toujours par le côté faible et aligne l’autre sur lui.',
    ],
    mistakes: [
      'Rotation du buste à chaque rep, qui donne l’impression d’aller plus haut.',
      'Tirage vers l’épaule, qui bascule le travail sur le trapèze.',
      'Dos arrondi parce que le banc est trop haut ou la position trop courte.',
    ],
    diagram: 'row',
    videoQuery: 'rowing haltère unilatéral technique',
  },
  {
    key: 'tractions-pronation',
    summary:
      'Le tirage vertical de référence. Excellent indicateur de rapport force sur poids de corps.',
    primaryMuscles: ['Dorsaux'],
    secondaryMuscles: ['Biceps', 'Rhomboïdes', 'Trapèzes inférieurs'],
    setup: [
      'Prise en pronation, un peu plus large que les épaules.',
      'Suspension complète, épaules engagées et non relâchées dans les articulations.',
      'Jambes légèrement en avant ou croisées, corps gainé.',
    ],
    execution: [
      'Commence par abaisser les omoplates avant de plier les bras.',
      'Tire jusqu’à passer le menton au-dessus de la barre.',
      'Descends en contrôlant jusqu’aux bras presque tendus.',
      'Ne relâche pas complètement l’épaule en bas.',
    ],
    cues: [
      'Pense à « amener les coudes vers les hanches ».',
      'Garde la poitrine dirigée vers la barre.',
      'Si tu ne fais pas encore de traction, travaille la phase de descente freinée.',
    ],
    mistakes: [
      'Balancement du corps qui remplace la force par de l’élan.',
      'Amplitude écourtée, menton qui n’atteint jamais la barre.',
      'Épaules qui restent hautes pendant tout le tirage.',
    ],
    diagram: 'pullup',
    videoQuery: 'traction pronation technique',
  },
  {
    key: 'tractions-supination',
    summary:
      'La traction paumes vers soi. Le biceps participe davantage, ce qui la rend souvent plus accessible que la version pronation.',
    primaryMuscles: ['Dorsaux', 'Biceps brachial'],
    secondaryMuscles: ['Rhomboïdes', 'Trapèzes inférieurs'],
    setup: [
      'Prise en supination, largeur d’épaules.',
      'Suspension complète, épaules engagées.',
      'Gainage actif, jambes qui ne balancent pas.',
    ],
    execution: [
      'Abaisse les omoplates, puis tire en amenant les coudes vers le bas.',
      'Monte jusqu’à ce que le menton dépasse la barre.',
      'Descends en contrôlant jusqu’aux bras presque tendus.',
      'Garde les coudes proches du corps tout du long.',
    ],
    cues: [
      'La poitrine monte vers la barre, elle ne recule pas.',
      'Si les poignets tirent, essaie une barre qui tourne ou une prise marteau.',
      'Le biceps aide, mais c’est le dos qui doit mener le mouvement.',
    ],
    mistakes: [
      'Élan des jambes pour lancer la montée.',
      'Descente relâchée qui saccade l’épaule et le coude en bas.',
      'Coudes qui s’écartent, ce qui fait perdre l’avantage de la prise.',
    ],
    diagram: 'pullup',
    videoQuery: 'traction supination technique',
  },
  {
    key: 'tirage-vertical',
    summary:
      'L’équivalent guidé de la traction, avec une charge réglable. C’est ce qui permet de travailler le tirage vertical avant de savoir faire des tractions.',
    primaryMuscles: ['Dorsaux'],
    secondaryMuscles: ['Biceps', 'Rhomboïdes', 'Trapèzes inférieurs'],
    setup: [
      'Cales à cuisses réglées pour bloquer le bassin sans comprimer.',
      'Prise en pronation, un peu plus large que les épaules.',
      'Buste légèrement incliné en arrière, environ 10 à 20 degrés, et cet angle ne bouge plus.',
      'Épaules basses avant de commencer.',
    ],
    execution: [
      'Abaisse les omoplates, puis tire la barre vers le haut de la poitrine.',
      'Coudes qui descendent vers les côtes.',
      'Remonte en contrôlant jusqu’à extension complète des bras.',
      'Laisse les épaules s’étirer en haut sans perdre le gainage.',
    ],
    cues: [
      'La barre descend devant, jamais derrière la nuque.',
      'Le buste garde le même angle : s’il recule à chaque rep, la charge est trop lourde.',
      'Pense à « mettre les coudes dans les poches ».',
    ],
    mistakes: [
      'Buste qui bascule en arrière pour transformer le mouvement en rowing.',
      'Tirage derrière la nuque, contraignant pour l’épaule sans bénéfice.',
      'Amplitude haute écourtée, ce qui supprime l’étirement.',
    ],
    diagram: 'pullup',
    videoQuery: 'tirage vertical poulie haute technique',
  },
  {
    key: 'tirage-horizontal',
    summary:
      'Le tirage horizontal assis. Le dos travaille sans que le bas du dos ait à tenir le buste, contrairement au rowing barre.',
    primaryMuscles: ['Dorsaux', 'Rhomboïdes', 'Trapèzes moyens'],
    secondaryMuscles: ['Biceps', 'Deltoïde postérieur'],
    setup: [
      'Pieds calés, genoux légèrement fléchis.',
      'Buste droit, dos plat, poitrine sortie.',
      'Bras tendus en position de départ, épaules qui acceptent l’étirement sans s’arrondir.',
      'Poignée neutre ou barre selon ce qui est disponible.',
    ],
    execution: [
      'Tire la poignée vers le nombril en gardant le buste droit.',
      'Coudes qui longent le corps, omoplates qui se serrent en fin de tirage.',
      'Reviens en contrôlant jusqu’à extension complète.',
      'Laisse les omoplates s’écarter en fin de retour, sans arrondir le bas du dos.',
    ],
    cues: [
      'Le buste reste vertical : il ne part pas en arrière au tirage ni en avant au retour.',
      'La poitrine reste sortie même quand les bras se tendent.',
      'Serre une seconde en fin de tirage plutôt que d’enchaîner mécaniquement.',
    ],
    mistakes: [
      'Buste qui fait des allers-retours, transformant le mouvement en rameur.',
      'Bas du dos qui s’arrondit au retour sous la traction de la charge.',
      'Coudes trop écartés, qui déplacent le travail vers l’arrière d’épaule.',
    ],
    diagram: 'row',
    videoQuery: 'tirage horizontal poulie basse technique',
  },
  {
    key: 'rowing-t-bar',
    summary:
      'Un rowing avec un appui pectoral ou un point fixe : la charge monte sans que le bas du dos serve de stabilisateur principal.',
    primaryMuscles: ['Dorsaux', 'Rhomboïdes', 'Trapèzes moyens'],
    secondaryMuscles: ['Biceps', 'Deltoïde postérieur', 'Érecteurs du rachis'],
    setup: [
      'Pieds fermement ancrés sur la plateforme, genoux fléchis.',
      'Buste penché, dos plat, poitrine contre l’appui s’il y en a un.',
      'Prise neutre sur les poignées, bras tendus.',
      'Épaules basses, gainage serré avant de décoller la charge.',
    ],
    execution: [
      'Tire les poignées vers le bas des côtes.',
      'Coudes qui longent le corps, omoplates serrées en fin de tirage.',
      'Descends en contrôlant jusqu’à extension complète des bras.',
      'Ne repose pas la charge sur les butées entre les reps.',
    ],
    cues: [
      'Avec appui pectoral, laisse l’appui faire son travail : ne décolle pas le buste pour tricher.',
      'Sans appui, l’angle du buste est le contrat de la série : il ne change pas.',
      'La prise neutre est plus tolérante pour l’épaule que la pronation large.',
    ],
    mistakes: [
      'Buste qui se redresse à chaque rep pour aider à monter la charge.',
      'Dos arrondi en fin de série quand le gainage lâche.',
      'Amplitude partielle, bras qui ne se tendent jamais complètement.',
    ],
    diagram: 'row',
    videoQuery: 'rowing t-bar technique',
  },
  {
    key: 'pull-over-a-la-poulie',
    summary:
      'Une isolation rare pour le dorsal : le coude reste fixe, l’épaule seule travaille. Utile pour sentir le dos quand les bras prennent toujours le dessus.',
    primaryMuscles: ['Dorsaux'],
    secondaryMuscles: ['Grand rond', 'Triceps (longue portion)', 'Abdominaux'],
    setup: [
      'Face à une poulie haute, barre droite ou corde.',
      'Un pied en avant, buste penché à environ 30 degrés, dos plat.',
      'Bras tendus vers la poulie, coudes très légèrement fléchis.',
      'Épaules basses, gainage actif.',
    ],
    execution: [
      'Descends la barre en arc de cercle jusqu’aux cuisses, bras quasi tendus.',
      'Garde l’angle du coude constant pendant toute la descente.',
      'Serre le dos une seconde en position basse.',
      'Remonte en contrôlant jusqu’à sentir l’étirement du dorsal.',
    ],
    cues: [
      'Aucun mouvement au coude : c’est l’épaule qui décrit l’arc.',
      'Si le triceps chauffe, c’est que les coudes se tendent et se plient.',
      'Charge modeste, ce mouvement ne se force pas.',
    ],
    mistakes: [
      'Coudes qui se plient, transformant le pull-over en extension triceps.',
      'Buste qui plonge à chaque rep pour accompagner la charge.',
      'Amplitude haute écourtée, qui supprime l’étirement recherché.',
    ],
    videoQuery: 'pull over poulie haute dorsaux technique',
  },
  {
    key: 'shrug-barre',
    summary:
      'L’isolation du trapèze supérieur. Mouvement court par nature : l’amplitude est celle d’un haussement d’épaules, pas plus.',
    primaryMuscles: ['Trapèzes supérieurs'],
    secondaryMuscles: ['Avant-bras'],
    setup: [
      'Debout, barre devant les cuisses, prise en pronation largeur d’épaules.',
      'Bras tendus et relâchés, ils ne servent que de crochets.',
      'Épaules basses en position de départ, poitrine ouverte.',
      'Sangles utiles dès que la prise devient le facteur limitant.',
    ],
    execution: [
      'Hausse les épaules droit vers le haut, en direction des oreilles.',
      'Marque un temps d’arrêt en position haute.',
      'Redescends en contrôlant jusqu’à l’étirement complet.',
      'Enchaîne sans à-coup ni impulsion de jambes.',
    ],
    cues: [
      'Le mouvement est vertical : pas de rotation d’épaules vers l’arrière.',
      'Les bras restent tendus, ils ne tirent jamais.',
      'La pause en haut vaut mieux que dix kilos de plus.',
    ],
    mistakes: [
      'Rotation des épaules, qui n’ajoute rien et frotte l’articulation.',
      'Impulsion des jambes pour lancer la charge.',
      'Amplitude minuscule avec une charge choisie pour l’ego.',
    ],
    videoQuery: 'shrug barre trapèzes technique',
  },
];
