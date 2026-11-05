/**
 * Fiches d'execution : quadriceps, ischios, fessiers et mollets.
 */

import type { ExerciseGuide } from '@/types/guide';

export const QUADRICEPS_GUIDES: ExerciseGuide[] = [
  {
    key: 'squat-barre',
    summary:
      'Le mouvement de référence pour les jambes : il charge lourd, sur une grande amplitude, et tolère une progression longue.',
    primaryMuscles: ['Quadriceps', 'Fessiers'],
    secondaryMuscles: ['Ischios', 'Adducteurs', 'Érecteurs du rachis', 'Abdominaux'],
    setup: [
      'Barre sur le haut des trapèzes, pas sur les cervicales.',
      'Mains serrées, coudes sous la barre pour verrouiller le dos.',
      'Pieds largeur d’épaules, pointes légèrement ouvertes vers l’extérieur.',
      'Grande inspiration ventrale, puis gainage avant de désengager le rack.',
    ],
    execution: [
      'Descends en poussant les hanches vers l’arrière et en pliant les genoux en même temps.',
      'Genoux dans l’axe des pointes de pieds, jamais vers l’intérieur.',
      'Descends au moins jusqu’au parallèle si ta mobilité le permet.',
      'Remonte en poussant le sol, hanches et épaules montent à la même vitesse.',
    ],
    cues: [
      'Garde le poids réparti sur tout le pied, pas sur les orteils.',
      'Pense « écarter le sol » avec les pieds pour stabiliser les genoux.',
      'Souffle après avoir passé le point difficile, pas pendant.',
    ],
    mistakes: [
      'Les hanches montent plus vite que les épaules, le squat se transforme en good morning.',
      'Les talons décollent : souvent un manque de mobilité de cheville, pas un manque de force.',
      'Le dos s’arrondit en bas d’amplitude quand on descend plus bas que sa mobilité réelle.',
    ],
    diagram: 'squat',
    videoQuery: 'squat barre technique',
  },
  {
    key: 'squat-avant',
    summary:
      'Le squat barre devant : le buste reste plus droit et le quadriceps prend une part plus grande du travail.',
    primaryMuscles: ['Quadriceps'],
    secondaryMuscles: ['Fessiers', 'Abdominaux', 'Érecteurs du rachis'],
    setup: [
      'Barre posée sur les deltoïdes antérieurs, pas dans le creux de la gorge.',
      'Coudes très hauts, bras parallèles au sol : c’est ce qui empêche la barre de rouler.',
      'Prise en crochet à trois doigts, ou prise croisée si la mobilité manque.',
      'Pieds largeur d’épaules, pointes légèrement ouvertes.',
    ],
    execution: [
      'Descends en gardant le buste le plus vertical possible.',
      'Genoux qui avancent librement dans l’axe des pieds.',
      'Descends jusqu’au parallèle ou en dessous si la position tient.',
      'Remonte en gardant les coudes hauts du début à la fin.',
    ],
    cues: [
      'Coudes hauts : dès qu’ils tombent, la barre glisse vers l’avant.',
      'Les doigts ne tiennent pas la barre, ils la calent. Ce sont les épaules qui portent.',
      'La charge sera nettement inférieure à ton squat arrière, c’est normal.',
    ],
    mistakes: [
      'Coudes qui s’affaissent en cours de série, et barre qui part vers l’avant.',
      'Barre posée sur les clavicules, ce qui est douloureux et instable.',
      'Buste qui plonge, transformant le mouvement en squat arrière mal placé.',
    ],
    diagram: 'squat',
    videoQuery: 'squat avant front squat technique',
  },
  {
    key: 'presse-a-cuisses',
    summary:
      'La poussée jambes guidée. Permet de charger lourd sans que le dos et le gainage soient le facteur limitant.',
    primaryMuscles: ['Quadriceps', 'Fessiers'],
    secondaryMuscles: ['Ischios', 'Adducteurs'],
    setup: [
      'Dos et bassin entièrement plaqués contre le dossier.',
      'Pieds à plat sur le plateau, largeur d’épaules, pointes légèrement ouvertes.',
      'Pieds hauts sur le plateau = plus de fessiers et d’ischios. Pieds bas = plus de quadriceps.',
      'Mains sur les poignées, sécurités déverrouillées avant la première rep.',
    ],
    execution: [
      'Descends en pliant les genoux jusqu’à environ 90 degrés, ou plus bas si le bassin reste plaqué.',
      'Genoux dans l’axe des pieds, ils ne rentrent pas vers l’intérieur.',
      'Pousse à travers tout le pied, sans décoller les talons.',
      'Ne verrouille pas les genoux à fond en fin de poussée.',
    ],
    cues: [
      'Le bassin qui décolle du dossier est la limite de ton amplitude : n’essaie pas d’aller plus bas.',
      'La charge affichée n’est pas comparable à un squat, ne compare que la presse à la presse.',
      'Garde les mains sur les poignées, pas sur les genoux.',
    ],
    mistakes: [
      'Bassin qui s’enroule en bas d’amplitude, ce qui met le bas du dos en flexion sous charge.',
      'Genoux qui rentrent vers l’intérieur sous la charge.',
      'Verrouillage sec des genoux à chaque rep.',
    ],
    diagram: 'squat',
    videoQuery: 'presse à cuisses technique',
  },
  {
    key: 'leg-extension',
    summary:
      'La seule isolation réelle du quadriceps. Utile en fin de séance, ou en échauffement pour préparer le genou.',
    primaryMuscles: ['Quadriceps'],
    secondaryMuscles: [],
    setup: [
      'Règle le dossier pour que l’axe du genou soit aligné avec l’axe de rotation de la machine.',
      'Boudin posé sur le bas du tibia, au-dessus de la cheville.',
      'Dos plaqué au dossier, mains sur les poignées.',
      'Bassin qui reste en contact avec l’assise.',
    ],
    execution: [
      'Tends les genoux jusqu’à extension complète.',
      'Marque un temps court en position haute.',
      'Redescends en contrôlant, sans laisser la charge claquer.',
      'Garde la même vitesse sur toute la série.',
    ],
    cues: [
      'L’alignement de l’axe du genou est le réglage qui change tout sur cette machine.',
      'Le bassin ne décolle pas de l’assise pour aider en fin d’extension.',
      'Charge modérée : le genou est en position défavorable en bas d’amplitude.',
    ],
    mistakes: [
      'Axe mal réglé, ce qui cisaille le genou à chaque rep.',
      'Élan du bassin pour lancer la charge.',
      'Retour en chute libre, qui met le genou en tension brutale.',
    ],
    videoQuery: 'leg extension technique',
  },
  {
    key: 'fentes-marchees',
    summary:
      'Un mouvement unilatéral qui travaille la jambe et l’équilibre en même temps. Révèle les écarts droite-gauche que le squat masque.',
    primaryMuscles: ['Quadriceps', 'Fessiers'],
    secondaryMuscles: ['Ischios', 'Adducteurs', 'Abdominaux'],
    setup: [
      'Debout, un haltère dans chaque main, bras le long du corps.',
      'Buste droit, épaules basses, gainage actif.',
      'Espace dégagé devant toi sur plusieurs mètres.',
      'Regard devant, pas sur les pieds.',
    ],
    execution: [
      'Fais un grand pas en avant et descends verticalement.',
      'Le genou arrière descend vers le sol sans le toucher brutalement.',
      'Le genou avant reste dans l’axe du pied, tibia à peu près vertical.',
      'Pousse dans le talon avant pour te relever et enchaîne avec l’autre jambe.',
    ],
    cues: [
      'Descends verticalement plutôt que de te projeter vers l’avant.',
      'Un pas trop court charge le genou, un pas trop long déséquilibre : cherche ta distance.',
      'Le buste reste droit, il ne penche pas vers l’avant à chaque appui.',
    ],
    mistakes: [
      'Genou avant qui part vers l’intérieur à la remontée.',
      'Buste penché en avant, qui déplace la charge sur le bas du dos.',
      'Genou arrière qui percute le sol faute de contrôle.',
    ],
    videoQuery: 'fentes marchées technique',
  },
  {
    key: 'squat-bulgare',
    summary:
      'La fente avec le pied arrière surélevé. Très exigeant sur une seule jambe, avec une charge totale modeste.',
    primaryMuscles: ['Quadriceps', 'Fessiers'],
    secondaryMuscles: ['Ischios', 'Adducteurs', 'Abdominaux'],
    setup: [
      'Pied arrière posé sur un banc, dessus du pied ou pointe selon le confort.',
      'Pied avant assez loin devant pour que le tibia reste proche de la verticale en bas.',
      'Haltères le long du corps, buste droit.',
      'Bassin de face, il ne s’ouvre pas côté jambe arrière.',
    ],
    execution: [
      'Descends verticalement en pliant la jambe avant.',
      'Le genou arrière descend vers le sol, le buste reste droit.',
      'Descends jusqu’à ce que la cuisse avant soit proche du parallèle.',
      'Remonte en poussant dans le pied avant, sans t’aider de la jambe arrière.',
    ],
    cues: [
      'La jambe arrière est un appui, pas un moteur.',
      'Le buste légèrement penché en avant met plus de fessier, le buste droit plus de quadriceps.',
      'Trouve ta distance à vide avant de prendre des haltères, elle change tout.',
    ],
    mistakes: [
      'Pied avant trop près du banc, ce qui écrase le genou.',
      'Bassin qui s’ouvre et fait basculer le mouvement sur le côté.',
      'Perte d’équilibre gérée en écourtant l’amplitude plutôt qu’en réduisant la charge.',
    ],
    videoQuery: 'squat bulgare technique',
  },
  {
    key: 'hack-squat',
    summary:
      'Un squat guidé sur rails : la trajectoire est imposée, ce qui permet de charger le quadriceps sans gérer l’équilibre.',
    primaryMuscles: ['Quadriceps'],
    secondaryMuscles: ['Fessiers', 'Adducteurs'],
    setup: [
      'Dos et épaules entièrement en contact avec le dossier.',
      'Pieds au milieu du plateau, largeur d’épaules, pointes légèrement ouvertes.',
      'Bassin plaqué, gainage actif.',
      'Sécurités déverrouillées une fois la position prise.',
    ],
    execution: [
      'Descends en pliant les genoux, dos plaqué au dossier.',
      'Descends jusqu’au parallèle ou plus bas si le bassin ne s’enroule pas.',
      'Genoux dans l’axe des pieds.',
      'Remonte en poussant à travers tout le pied, sans verrouiller sèchement.',
    ],
    cues: [
      'Pieds plus bas sur le plateau = plus de quadriceps, mais aussi plus de contrainte au genou.',
      'Le dos ne décolle jamais du dossier, c’est tout l’intérêt de la machine.',
      'Descente lente, remontée franche.',
    ],
    mistakes: [
      'Bassin qui s’enroule en bas, bas du dos en flexion sous charge.',
      'Talons qui décollent parce que les pieds sont trop bas sur le plateau.',
      'Amplitude écourtée avec une charge choisie pour le compteur.',
    ],
    diagram: 'squat',
    videoQuery: 'hack squat machine technique',
  },
];

export const ISCHIOS_GUIDES: ExerciseGuide[] = [
  {
    key: 'souleve-de-terre-jambes-tendues',
    summary:
      'Le mouvement de charnière de hanche. Travaille l’ischio en étirement, avec une amplitude dictée par ta souplesse et non par la charge.',
    primaryMuscles: ['Ischios', 'Fessiers'],
    secondaryMuscles: ['Érecteurs du rachis', 'Dorsaux', 'Avant-bras'],
    setup: [
      'Debout, barre devant les cuisses, prise en pronation largeur d’épaules.',
      'Pieds largeur de hanches, genoux très légèrement fléchis et cet angle ne changera plus.',
      'Épaules basses, dos plat, poitrine sortie.',
      'Gainage serré avant de commencer la descente.',
    ],
    execution: [
      'Pousse les hanches vers l’arrière en laissant la barre glisser le long des jambes.',
      'Descends tant que le dos reste plat, généralement jusqu’à mi-tibia.',
      'Remonte en poussant les hanches vers l’avant.',
      'Termine debout sans hyperextension lombaire.',
    ],
    cues: [
      'C’est un mouvement de hanche, pas de dos : ce sont les fessiers qui reculent.',
      'La barre reste collée aux jambes du début à la fin.',
      'L’amplitude s’arrête là où le dos commence à s’arrondir, pas plus bas.',
    ],
    mistakes: [
      'Dos qui s’arrondit pour aller chercher quelques centimètres de plus.',
      'Genoux qui se plient progressivement, ce qui ramène le mouvement à un soulevé de terre classique.',
      'Barre qui s’éloigne des jambes et tire sur le bas du dos.',
    ],
    diagram: 'deadlift',
    videoQuery: 'soulevé de terre jambes tendues technique',
  },
  {
    key: 'leg-curl-allonge',
    summary:
      'L’isolation de l’ischio avec la hanche tendue. Complète bien les mouvements de charnière, qui travaillent l’ischio autrement.',
    primaryMuscles: ['Ischios'],
    secondaryMuscles: ['Mollets'],
    setup: [
      'Allongé sur le ventre, bassin bien en contact avec l’appui.',
      'Axe du genou aligné avec l’axe de rotation de la machine.',
      'Boudin sur le bas du mollet, juste au-dessus du talon.',
      'Mains sur les poignées, épaules basses.',
    ],
    execution: [
      'Fléchis les genoux pour ramener les talons vers les fessiers.',
      'Monte jusqu’à la contraction complète.',
      'Redescends en contrôlant jusqu’à extension quasi complète.',
      'Garde le bassin plaqué pendant toute la série.',
    ],
    cues: [
      'Le bassin qui décolle est le signe que la charge est trop lourde.',
      'Pointes de pieds tendues ou fléchies changent légèrement la sensation : teste les deux.',
      'La descente contrôlée compte autant que la flexion.',
    ],
    mistakes: [
      'Bassin qui se soulève à chaque rep pour aider.',
      'Amplitude partielle en bas, jambes qui ne se tendent jamais.',
      'Axe de la machine mal aligné avec le genou.',
    ],
    videoQuery: 'leg curl allongé technique',
  },
  {
    key: 'leg-curl-assis',
    summary:
      'L’isolation de l’ischio avec la hanche fléchie. La position d’étirement est différente du leg curl allongé, ce qui les rend complémentaires.',
    primaryMuscles: ['Ischios'],
    secondaryMuscles: ['Mollets'],
    setup: [
      'Assis, dos plaqué au dossier, bassin au fond de l’assise.',
      'Axe du genou aligné avec l’axe de rotation de la machine.',
      'Cale à cuisses serrée pour empêcher le bassin de bouger.',
      'Boudin sur le bas du mollet, au-dessus des talons.',
    ],
    execution: [
      'Fléchis les genoux vers le sol jusqu’à la contraction complète.',
      'Garde le dos plaqué et le bassin immobile.',
      'Remonte en contrôlant jusqu’à extension quasi complète.',
      'Ne laisse pas la charge reposer entre les reps.',
    ],
    cues: [
      'La cale à cuisses doit être serrée, sinon tout le mouvement se dérègle.',
      'Le buste ne bascule pas en avant pour accompagner la flexion.',
      'Charge modérée et amplitude complète plutôt que l’inverse.',
    ],
    mistakes: [
      'Buste qui s’avance à chaque rep pour aider.',
      'Cale mal réglée, bassin qui glisse sous la charge.',
      'Retour trop rapide, qui claque la pile de charges.',
    ],
    videoQuery: 'leg curl assis technique',
  },
  {
    key: 'good-morning',
    summary:
      'Une charnière de hanche barre sur le dos. Exigeant pour les ischios et les érecteurs, et très sensible à la charge choisie.',
    primaryMuscles: ['Ischios', 'Érecteurs du rachis'],
    secondaryMuscles: ['Fessiers', 'Abdominaux'],
    setup: [
      'Barre placée comme au squat, sur le haut des trapèzes.',
      'Pieds largeur de hanches, genoux légèrement fléchis.',
      'Dos plat, poitrine sortie, gainage serré.',
      'Charge nettement plus légère que ce que tu imagines : c’est un mouvement à levier long.',
    ],
    execution: [
      'Penche le buste vers l’avant en poussant les hanches vers l’arrière.',
      'Descends jusqu’à ce que le buste approche l’horizontale, si le dos reste plat.',
      'Remonte en poussant les hanches vers l’avant.',
      'Termine debout sans cambrer.',
    ],
    cues: [
      'Les hanches reculent d’abord, le buste suit. Ce n’est pas une flexion de dos.',
      'L’amplitude s’arrête au moment où le dos commence à s’arrondir.',
      'Commence à vide, ou avec la barre seule, sur plusieurs séances.',
    ],
    mistakes: [
      'Charge trop lourde, qui transforme le mouvement en flexion lombaire.',
      'Genoux qui se plient beaucoup, ce qui en fait un demi-squat.',
      'Descente incontrôlée avec remontée en coup de reins.',
    ],
    diagram: 'deadlift',
    videoQuery: 'good morning barre technique',
  },
];

export const FESSIERS_GUIDES: ExerciseGuide[] = [
  {
    key: 'hip-thrust',
    summary:
      'Le mouvement le plus direct pour charger les fessiers, avec une contrainte lombaire très faible.',
    primaryMuscles: ['Fessiers'],
    secondaryMuscles: ['Ischios', 'Quadriceps'],
    setup: [
      'Haut du dos calé sur un banc, sous les omoplates.',
      'Barre sur le pli de la hanche, avec une mousse de protection.',
      'Pieds à plat, largeur de hanches, tibias verticaux en position haute.',
      'Menton légèrement rentré, regard vers l’avant.',
    ],
    execution: [
      'Pousse dans les talons pour monter les hanches.',
      'Monte jusqu’à ce que le buste soit parallèle au sol.',
      'Serre les fessiers une seconde en position haute.',
      'Redescends en contrôlant sans poser la barre entre les reps.',
    ],
    cues: [
      'Rentre légèrement le bassin en haut pour éviter de cambrer.',
      'Le mouvement vient de la hanche, pas du bas du dos.',
      'Si les ischios crampent, rapproche les pieds du bassin.',
    ],
    mistakes: [
      'Hyperextension lombaire en position haute au lieu d’une extension de hanche.',
      'Pieds trop loin, le mouvement devient un travail d’ischios.',
      'Amplitude partielle, hanches qui ne montent jamais au parallèle.',
    ],
    diagram: 'hip-thrust',
    videoQuery: 'hip thrust technique',
  },
  {
    key: 'abduction-machine',
    summary:
      'L’isolation du moyen fessier, le muscle qui stabilise le bassin. Amplitude courte, exécution lente.',
    primaryMuscles: ['Moyen fessier'],
    secondaryMuscles: ['Grand fessier (fibres supérieures)'],
    setup: [
      'Assis, dos plaqué au dossier, bassin au fond de l’assise.',
      'Genoux contre les appuis latéraux.',
      'Buste droit, ou légèrement penché en avant pour changer la sensation.',
      'Mains sur les poignées, pieds stables.',
    ],
    execution: [
      'Écarte les genoux jusqu’à la fin de l’amplitude de la machine.',
      'Marque un temps en position ouverte.',
      'Reviens en contrôlant, sans laisser les appuis claquer.',
      'Garde le dos plaqué du début à la fin.',
    ],
    cues: [
      'Le buste penché en avant met davantage le haut du fessier, buste droit met le moyen fessier.',
      'La lenteur vaut mieux que la charge : l’amplitude est courte par nature.',
      'Le bassin ne bascule pas d’un côté à l’autre.',
    ],
    mistakes: [
      'Élan du buste pour ouvrir les genoux.',
      'Retour non contrôlé, qui fait claquer la pile à chaque rep.',
      'Charge maximale avec une amplitude réduite de moitié.',
    ],
    videoQuery: 'abduction machine fessiers technique',
  },
  {
    key: 'kickback-poulie',
    summary:
      'L’extension de hanche jambe par jambe. Isolation pure du grand fessier, sans que le dos ou le quadriceps participent.',
    primaryMuscles: ['Grand fessier'],
    secondaryMuscles: ['Ischios'],
    setup: [
      'Sangle de cheville attachée à une poulie basse.',
      'Face à la machine, mains sur le châssis pour te stabiliser.',
      'Buste légèrement penché en avant, dos plat, gainage actif.',
      'Jambe de travail légèrement en avant au départ, genou peu fléchi.',
    ],
    execution: [
      'Pousse la jambe vers l’arrière en gardant le genou presque tendu.',
      'Monte jusqu’à l’extension de hanche, sans cambrer le bas du dos.',
      'Serre le fessier une seconde en fin de course.',
      'Reviens en contrôlant jusqu’à la position de départ.',
    ],
    cues: [
      'L’amplitude s’arrête où le bassin commence à basculer : au-delà, c’est le dos qui travaille.',
      'Le bassin reste de face, il ne s’ouvre pas côté jambe active.',
      'Charge légère, ce mouvement se fait à la sensation.',
    ],
    mistakes: [
      'Cambrure lombaire pour gagner de l’amplitude.',
      'Bassin qui pivote à chaque rep.',
      'Genou qui se plie et se tend, ce qui fait travailler l’ischio à la place du fessier.',
    ],
    videoQuery: 'kickback poulie fessier technique',
  },
];

export const MOLLETS_GUIDES: ExerciseGuide[] = [
  {
    key: 'mollets-debout',
    summary:
      'L’extension de cheville jambes tendues, qui travaille surtout le jumeau. Amplitude courte, donc exécution stricte.',
    primaryMuscles: ['Jumeaux'],
    secondaryMuscles: ['Soléaire'],
    setup: [
      'Avant-pieds sur le repose-pied, talons dans le vide.',
      'Jambes tendues, genoux non verrouillés.',
      'Buste droit, épaules sous les appuis s’il y en a.',
      'Gainage actif, bassin dans l’axe.',
    ],
    execution: [
      'Monte sur la pointe des pieds jusqu’à l’extension maximale.',
      'Marque un temps en position haute.',
      'Redescends lentement jusqu’à l’étirement complet, talons sous le niveau des orteils.',
      'Enchaîne sans rebondir en bas.',
    ],
    cues: [
      'L’étirement en bas est la moitié du travail : ne le saute pas.',
      'Le rebond en bas fait travailler le tendon, pas le muscle.',
      'Genoux tendus = jumeaux. Genoux pliés = soléaire.',
    ],
    mistakes: [
      'Amplitude minuscule avec une charge trop lourde.',
      'Rebond élastique en bas de mouvement.',
      'Genoux qui se plient à chaque rep pour aider.',
    ],
    videoQuery: 'mollets debout machine technique',
  },
  {
    key: 'mollets-assis',
    summary:
      'L’extension de cheville genoux pliés, qui cible le soléaire. Complémentaire des mollets debout, pas redondante.',
    primaryMuscles: ['Soléaire'],
    secondaryMuscles: ['Jumeaux'],
    setup: [
      'Assis, avant-pieds sur le repose-pied, talons dans le vide.',
      'Cales réglées sur le bas des cuisses, près des genoux.',
      'Genoux à environ 90 degrés.',
      'Buste droit, mains sur les poignées.',
    ],
    execution: [
      'Monte les talons le plus haut possible.',
      'Marque un temps en position haute.',
      'Redescends lentement jusqu’à l’étirement complet.',
      'Garde le rythme constant sur toute la série.',
    ],
    cues: [
      'Genoux pliés : le soléaire prend le relais du jumeau, la charge sera plus modeste.',
      'La pause haute et la descente lente valent mieux que des reps supplémentaires.',
      'Cale bien réglée : trop haut sur la cuisse, elle glisse.',
    ],
    mistakes: [
      'Reps rapides sans amplitude réelle.',
      'Cale mal placée qui comprime le genou.',
      'Talons qui ne descendent jamais sous le niveau des orteils.',
    ],
    videoQuery: 'mollets assis machine technique',
  },
  {
    key: 'mollets-a-la-presse',
    summary:
      'L’extension de cheville faite sur la presse à cuisses. Utile quand les machines à mollets sont prises, et facile à charger.',
    primaryMuscles: ['Jumeaux'],
    secondaryMuscles: ['Soléaire'],
    setup: [
      'Installe-toi comme pour une presse, mais avec les avant-pieds en bas du plateau.',
      'Talons dans le vide, jambes tendues sans verrouiller les genoux.',
      'Dos et bassin plaqués au dossier.',
      'Sécurités enclenchées : c’est le point critique de cette variante.',
    ],
    execution: [
      'Pousse sur les avant-pieds pour tendre les chevilles.',
      'Marque un temps en position haute.',
      'Laisse les talons redescendre lentement jusqu’à l’étirement complet.',
      'Garde les genoux stables, ils ne plient pas.',
    ],
    cues: [
      'Vérifie les sécurités avant la première rep : les pieds n’ont qu’une petite surface d’appui.',
      'Avant-pieds bien engagés sur le plateau, pas seulement les orteils.',
      'Charge plus légère qu’en presse jambes, l’amplitude est courte et le levier différent.',
    ],
    mistakes: [
      'Pieds trop bas sur le plateau, qui risquent de glisser.',
      'Genoux qui plient pour accompagner, ce qui transforme le mouvement en demi-presse.',
      'Sécurités non enclenchées.',
    ],
    videoQuery: 'mollets presse à cuisses technique',
  },
];
