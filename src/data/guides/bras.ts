/**
 * Fiches d'execution : biceps, triceps et avant-bras.
 *
 * Regroupes dans un meme fichier parce que ce sont tous des mouvements
 * d'isolation autour du coude, et qu'ils partagent les memes erreurs types.
 */

import type { ExerciseGuide } from '@/types/guide';

export const BICEPS_GUIDES: ExerciseGuide[] = [
  {
    key: 'curl-barre',
    summary: 'L’isolation de référence pour le biceps, avec une charge facile à faire progresser.',
    primaryMuscles: ['Biceps brachial'],
    secondaryMuscles: ['Brachial antérieur', 'Avant-bras'],
    setup: [
      'Debout, pieds largeur de hanches, barre en supination.',
      'Mains largeur d’épaules, coudes collés au buste.',
      'Épaules basses et en arrière.',
    ],
    execution: [
      'Fléchis les coudes sans avancer les épaules.',
      'Monte jusqu’à la contraction complète, sans amener la barre au menton.',
      'Redescends en contrôlant jusqu’à extension quasi complète.',
    ],
    cues: [
      'Les coudes restent des charnières fixes, ils ne partent pas vers l’avant.',
      'Le buste ne bouge pas, même sur la dernière rep.',
      'La descente vaut autant que la montée.',
    ],
    mistakes: [
      'Coup de reins pour lancer la barre.',
      'Coudes qui avancent, transformant le curl en tirage d’épaule.',
      'Amplitude partielle en bas, qui supprime la portion la plus utile.',
    ],
    diagram: 'curl',
    videoQuery: 'curl barre technique',
  },
  {
    key: 'curl-halteres',
    summary:
      'Le curl bras par bras. Permet la supination complète, que la barre interdit par construction.',
    primaryMuscles: ['Biceps brachial'],
    secondaryMuscles: ['Brachial antérieur', 'Avant-bras'],
    setup: [
      'Debout ou assis, haltères le long du corps, paumes vers l’avant ou neutres.',
      'Coudes collés au buste, épaules basses.',
      'Gainage actif pour empêcher le buste de balancer.',
    ],
    execution: [
      'Monte l’haltère en fléchissant le coude, en tournant la paume vers le haut si tu pars en prise neutre.',
      'Termine en supination complète, petit doigt plus haut que le pouce.',
      'Redescends lentement en contrôlant la rotation inverse.',
      'Alterne les bras ou fais-les simultanément, mais garde le même rythme.',
    ],
    cues: [
      'La supination fait partie du travail du biceps : ne la néglige pas.',
      'Les coudes restent en arrière du poignet en fin de montée.',
      'Si un bras est plus faible, commence toujours par lui.',
    ],
    mistakes: [
      'Balancement du buste, surtout quand on alterne.',
      'Épaule qui monte pour aider en fin de course.',
      'Descente relâchée, qui supprime la moitié de la série.',
    ],
    diagram: 'curl',
    videoQuery: 'curl haltères supination technique',
  },
  {
    key: 'curl-incline',
    summary:
      'Le curl avec le bras en arrière du buste : le biceps démarre en position étirée, ce qui rend le bas du mouvement bien plus dur.',
    primaryMuscles: ['Biceps brachial (longue portion)'],
    secondaryMuscles: ['Brachial antérieur'],
    setup: [
      'Banc incliné à environ 45 à 60 degrés, dos plaqué.',
      'Bras pendants de part et d’autre du banc, complètement tendus.',
      'Paumes vers l’avant, épaules basses et non avancées.',
      'Charge nettement plus légère qu’au curl debout.',
    ],
    execution: [
      'Fléchis les coudes sans les faire avancer.',
      'Monte jusqu’à la contraction, sans chercher à amener l’haltère à l’épaule.',
      'Redescends jusqu’à extension complète, bras à nouveau pendants.',
      'Marque un temps en bas plutôt que de rebondir.',
    ],
    cues: [
      'La position étirée est tout l’intérêt du mouvement : ne l’écourte pas.',
      'Les coudes restent en arrière du buste, ils ne remontent pas vers l’avant.',
      'Le dos reste collé au banc, épaules basses.',
    ],
    mistakes: [
      'Coudes qui avancent, ce qui annule l’étirement recherché.',
      'Amplitude basse écourtée par peur de la sensation d’étirement.',
      'Charge trop lourde qui fait décoller les épaules du dossier.',
    ],
    diagram: 'curl',
    videoQuery: 'curl incliné haltères technique',
  },
  {
    key: 'curl-marteau',
    summary:
      'Le curl en prise neutre. Charge le brachial et le long supinateur, ce qui construit l’épaisseur du bras vue de profil.',
    primaryMuscles: ['Brachial antérieur', 'Brachio-radial'],
    secondaryMuscles: ['Biceps brachial'],
    setup: [
      'Debout, haltères le long du corps, paumes face à face.',
      'Coudes collés au buste, épaules basses.',
      'Poignets fermes, dans l’axe de l’avant-bras.',
      'Gainage actif.',
    ],
    execution: [
      'Monte l’haltère sans tourner le poignet, prise neutre du début à la fin.',
      'Monte jusqu’à ce que l’haltère arrive près de l’épaule.',
      'Redescends en contrôlant jusqu’à extension complète.',
      'Alterne ou simultané, mais sans balancer.',
    ],
    cues: [
      'Aucune rotation : le pouce reste vers le haut tout du long.',
      'On peut souvent charger un peu plus lourd qu’en supination.',
      'Les coudes ne remontent pas vers l’avant en fin de course.',
    ],
    mistakes: [
      'Rotation involontaire du poignet, qui ramène le mouvement à un curl classique.',
      'Élan des jambes ou du buste.',
      'Épaules qui roulent vers l’avant à chaque montée.',
    ],
    diagram: 'curl',
    videoQuery: 'curl marteau technique',
  },
  {
    key: 'curl-pupitre',
    summary:
      'Le curl avec le bras bloqué sur un appui : impossible de tricher avec le buste, tout le travail reste sur le biceps.',
    primaryMuscles: ['Biceps brachial (courte portion)'],
    secondaryMuscles: ['Brachial antérieur'],
    setup: [
      'Règle le siège pour que l’aisselle repose en haut du pupitre.',
      'Bras entièrement en contact avec l’appui, coudes légèrement écartés.',
      'Prise en supination, largeur d’épaules.',
      'Épaules basses, poitrine contre le haut du pupitre.',
    ],
    execution: [
      'Fléchis les coudes en gardant les bras collés à l’appui.',
      'Monte jusqu’à la contraction complète.',
      'Redescends jusqu’à extension quasi complète, sans relâcher d’un coup.',
      'Marque un léger temps en bas avant de repartir.',
    ],
    cues: [
      'L’extension basse est la partie la plus utile et la plus exigeante : ne la saute pas.',
      'Les coudes ne décollent jamais de l’appui.',
      'Sors des reps avec l’aide d’un partenaire plutôt qu’en arrachant la dernière.',
    ],
    mistakes: [
      'Coudes qui décollent en fin de montée.',
      'Extension complète brutale en bas, qui met le coude en tension sèche.',
      'Fessiers qui décollent du siège pour aider.',
    ],
    diagram: 'curl',
    videoQuery: 'curl pupitre larry scott technique',
  },
  {
    key: 'curl-a-la-poulie',
    summary:
      'Le curl avec une tension constante du bas jusqu’en haut. Bon choix en fin de séance, quand la charge compte moins que la qualité de contraction.',
    primaryMuscles: ['Biceps brachial'],
    secondaryMuscles: ['Brachial antérieur', 'Avant-bras'],
    setup: [
      'Poulie basse, barre droite, barre EZ ou corde.',
      'Debout à environ un pas de la poulie, gainage actif.',
      'Coudes collés au buste, épaules basses.',
      'Bras tendus, charge déjà en tension au départ.',
    ],
    execution: [
      'Fléchis les coudes sans les avancer.',
      'Monte jusqu’à la contraction complète.',
      'Redescends en résistant à la traction du câble.',
      'Ne laisse pas la charge reposer sur la pile entre les reps.',
    ],
    cues: [
      'Le câble tire vers le bas et vers l’avant : c’est le gainage qui te garde en place.',
      'La tension ne disparaît jamais, contrairement au curl barre en haut de course.',
      'Recule d’un pas si tu sens que la charge te tire vers la machine.',
    ],
    mistakes: [
      'Buste qui recule à chaque rep pour aider.',
      'Coudes qui avancent en fin de montée.',
      'Retour trop rapide, qui laisse la charge claquer sur la pile.',
    ],
    diagram: 'curl',
    videoQuery: 'curl poulie basse biceps technique',
  },
];

export const TRICEPS_GUIDES: ExerciseGuide[] = [
  {
    key: 'developpe-couche-prise-serree',
    summary:
      'Le mouvement de base pour charger lourd sur le triceps. C’est un développé, pas une isolation : il progresse comme un mouvement de force.',
    primaryMuscles: ['Triceps'],
    secondaryMuscles: ['Pectoraux', 'Deltoïde antérieur'],
    setup: [
      'Allongé, cinq points d’appui comme au développé couché.',
      'Mains à peu près largeur d’épaules, pas plus serrées : les poignets n’aiment pas.',
      'Omoplates serrées et basses.',
      'Poignets droits, dans l’axe des avant-bras.',
    ],
    execution: [
      'Descends la barre vers le bas des pectoraux.',
      'Coudes serrés le long du corps, pas écartés.',
      'Touche sans rebondir, puis pousse en verrouillant les coudes.',
      'Garde les avant-bras verticaux au moment du contact.',
    ],
    cues: [
      'Largeur d’épaules suffit : une prise plus serrée n’ajoute rien et abîme les poignets.',
      'Les coudes longent le buste, c’est ce qui déplace le travail vers le triceps.',
      'La barre descend plus bas sur le buste qu’au développé couché classique.',
    ],
    mistakes: [
      'Prise trop serrée, qui casse les poignets sans mieux cibler le triceps.',
      'Coudes qui s’ouvrent en fin de série quand la fatigue arrive.',
      'Rebond sur la poitrine.',
    ],
    diagram: 'bench',
    videoQuery: 'développé couché prise serrée technique',
  },
  {
    key: 'extension-poulie-haute',
    summary: 'L’isolation du triceps la plus simple à charger progressivement, et très tolérante pour le coude.',
    primaryMuscles: ['Triceps'],
    secondaryMuscles: [],
    setup: [
      'Face à la poulie haute, barre ou corde en prise pronation.',
      'Coudes collés au buste, avant-bras à l’horizontale.',
      'Léger penché en avant, gainage actif.',
    ],
    execution: [
      'Tends les bras vers le bas sans bouger les coudes.',
      'Verrouille en bas sans forcer l’hyperextension.',
      'Remonte en contrôlant jusqu’à environ 90 degrés.',
    ],
    cues: [
      'Seuls les avant-bras bougent.',
      'Avec la corde, écarte les mains en fin de mouvement.',
      'Si les épaules travaillent, la charge est trop lourde.',
    ],
    mistakes: [
      'Buste qui plonge à chaque rep pour aider.',
      'Coudes qui s’écartent ou reculent.',
      'Amplitude écourtée en haut.',
    ],
    diagram: 'triceps-pushdown',
    videoQuery: 'extension poulie haute triceps',
  },
  {
    key: 'extension-corde',
    summary:
      'La variante corde de l’extension poulie : les mains peuvent s’écarter en fin de course, ce qui permet d’aller chercher une contraction plus complète.',
    primaryMuscles: ['Triceps'],
    secondaryMuscles: [],
    setup: [
      'Corde attachée à la poulie haute, prise neutre à l’extrémité.',
      'Coudes collés au buste, avant-bras à l’horizontale.',
      'Léger penché en avant, pieds décalés, gainage actif.',
      'Épaules basses avant de commencer.',
    ],
    execution: [
      'Tends les bras vers le bas en gardant les coudes fixes.',
      'Écarte les deux brins de corde en fin d’extension.',
      'Marque brièvement la position basse.',
      'Remonte en contrôlant jusqu’à environ 90 degrés au coude.',
    ],
    cues: [
      'L’écartement final n’est pas décoratif : c’est ce qui distingue la corde de la barre.',
      'Charge plus légère qu’à la barre, sinon l’écartement devient impossible.',
      'Les coudes restent des charnières fixes, collées au buste.',
    ],
    mistakes: [
      'Coudes qui s’écartent progressivement au fil de la série.',
      'Buste qui monte et descend pour accompagner la charge.',
      'Écartement absent, ce qui rend la corde inutile par rapport à une barre.',
    ],
    diagram: 'triceps-pushdown',
    videoQuery: 'extension triceps corde technique',
  },
  {
    key: 'barre-au-front',
    summary:
      'L’isolation du triceps la plus efficace pour charger, et la plus exigeante pour les coudes. À exécuter proprement ou pas du tout.',
    primaryMuscles: ['Triceps'],
    secondaryMuscles: [],
    setup: [
      'Allongé sur un banc plat, barre EZ de préférence pour ménager les poignets.',
      'Bras tendus, légèrement inclinés vers l’arrière plutôt que strictement verticaux.',
      'Prise largeur d’épaules, poignets fermes.',
      'Omoplates serrées, pieds au sol.',
    ],
    execution: [
      'Fléchis les coudes pour descendre la barre vers le front ou juste derrière la tête.',
      'Garde les bras immobiles, seuls les avant-bras bougent.',
      'Descends jusqu’à sentir l’étirement du triceps, sans écraser le coude.',
      'Remonte en tendant les bras, sans verrouiller sèchement.',
    ],
    cues: [
      'Bras légèrement inclinés vers l’arrière : c’est ce qui maintient la tension en haut.',
      'Si les coudes chauffent, réduis la charge avant de réduire l’amplitude.',
      'La barre EZ est presque toujours plus confortable que la barre droite ici.',
    ],
    mistakes: [
      'Coudes qui s’écartent vers l’extérieur sous la charge.',
      'Bras qui reculent à chaque rep, ce qui transforme le mouvement en pull-over.',
      'Charge trop lourde, première cause de douleur de coude sur cet exercice.',
    ],
    videoQuery: 'barre au front triceps technique',
  },
  {
    key: 'extension-nuque-haltere',
    summary:
      'L’extension bras au-dessus de la tête : le triceps travaille en position étirée, ce que les extensions à la poulie ne permettent pas.',
    primaryMuscles: ['Triceps (longue portion)'],
    secondaryMuscles: [],
    setup: [
      'Assis avec un dossier, ou debout si le gainage suit.',
      'Haltère tenu à deux mains ou à une main, bras tendu au-dessus de la tête.',
      'Coudes serrés vers l’intérieur, près des oreilles.',
      'Abdominaux serrés pour éviter de cambrer.',
    ],
    execution: [
      'Descends l’haltère derrière la tête en pliant les coudes.',
      'Garde les bras verticaux, ils ne partent pas vers l’avant.',
      'Descends jusqu’à l’étirement confortable, sans forcer.',
      'Remonte en tendant les bras sans verrouiller sèchement.',
    ],
    cues: [
      'Les coudes restent serrés et pointés vers le plafond.',
      'La position étirée est l’intérêt du mouvement : privilégie l’amplitude à la charge.',
      'Si l’épaule manque de mobilité, fais-le à une main pour ajuster l’angle.',
    ],
    mistakes: [
      'Coudes qui s’ouvrent en grand, ce qui décharge le triceps.',
      'Cambrure lombaire pour compenser un manque de mobilité d’épaule.',
      'Charge trop lourde dans une position où le contrôle est déjà difficile.',
    ],
    videoQuery: 'extension triceps nuque haltère technique',
  },
  {
    key: 'dips-machine',
    summary:
      'La version guidée des dips : la trajectoire est imposée et la charge réglable, ce qui rend le mouvement accessible sans savoir faire de dips.',
    primaryMuscles: ['Triceps'],
    secondaryMuscles: ['Pectoraux (faisceau sternal)', 'Deltoïde antérieur'],
    setup: [
      'Règle le siège pour que les poignées arrivent au niveau des hanches bras tendus.',
      'Dos plaqué au dossier, épaules basses.',
      'Prise neutre sur les poignées, coudes près du corps.',
      'Pieds bien ancrés au sol ou sur le repose-pieds.',
    ],
    execution: [
      'Pousse vers le bas en tendant les bras.',
      'Garde les coudes près du corps tout du long.',
      'Ne verrouille pas sèchement en bas.',
      'Remonte en contrôlant jusqu’à environ 90 degrés au coude.',
    ],
    cues: [
      'Buste droit et coudes serrés = triceps. Si tu penches, le pectoral prend le relais.',
      'Les épaules restent basses, elles ne remontent pas vers les oreilles.',
      'La machine gère l’équilibre : sers-t’en pour aller plus près de l’échec en sécurité.',
    ],
    mistakes: [
      'Épaules qui roulent vers l’avant en fin de poussée.',
      'Amplitude haute écourtée pour éviter la partie dure.',
      'Siège mal réglé, qui place les poignées trop haut ou trop bas.',
    ],
    diagram: 'triceps-pushdown',
    videoQuery: 'dips machine triceps technique',
  },
];

export const AVANT_BRAS_GUIDES: ExerciseGuide[] = [
  {
    key: 'curl-poignets',
    summary:
      'L’isolation des fléchisseurs de l’avant-bras. Amplitude courte, charge modeste : l’intérêt est le volume de reps, pas le poids.',
    primaryMuscles: ['Fléchisseurs de l’avant-bras'],
    secondaryMuscles: [],
    setup: [
      'Assis, avant-bras posés sur les cuisses ou sur un banc, paumes vers le haut.',
      'Poignets qui dépassent du bord de l’appui.',
      'Barre tenue à deux mains, prise en supination.',
      'Avant-bras entièrement en contact, ils ne bougeront pas.',
    ],
    execution: [
      'Laisse la barre descendre en ouvrant légèrement les doigts.',
      'Referme les doigts, puis fléchis le poignet vers le haut.',
      'Monte jusqu’à la contraction complète.',
      'Redescends en contrôlant, sans laisser la barre tomber dans les doigts.',
    ],
    cues: [
      'Seul le poignet bouge : les avant-bras restent collés à l’appui.',
      'L’ouverture des doigts en bas ajoute de l’amplitude utile.',
      'Charge légère et séries longues : c’est un petit muscle à course courte.',
    ],
    mistakes: [
      'Avant-bras qui décollent pour transformer le mouvement en curl.',
      'Amplitude minuscule avec une charge trop lourde.',
      'Descente non contrôlée, qui met les doigts en tension brutale.',
    ],
    videoQuery: 'curl poignets avant-bras technique',
  },
  {
    key: 'farmer-walk',
    summary:
      'Marcher chargé. Travaille la prise, le gainage et la posture d’un seul geste, et se mesure en distance ou en temps plutôt qu’en reps.',
    primaryMuscles: ['Avant-bras', 'Trapèzes'],
    secondaryMuscles: ['Abdominaux', 'Fessiers', 'Érecteurs du rachis'],
    setup: [
      'Deux haltères ou kettlebells lourds posés de part et d’autre.',
      'Ramasse-les en pliant les hanches et les genoux, dos plat.',
      'Debout, épaules basses et en arrière, poitrine ouverte.',
      'Regard devant, bras le long du corps sans toucher les cuisses.',
    ],
    execution: [
      'Marche à pas réguliers, un peu plus courts que ta foulée normale.',
      'Garde le buste droit et le gainage actif du début à la fin.',
      'Ne laisse pas les épaules s’affaisser vers l’avant.',
      'Repose les charges en pliant les hanches, jamais en les lâchant dos rond.',
    ],
    cues: [
      'C’est un exercice de posture sous charge, pas une course.',
      'Se mesure en mètres ou en secondes : note la distance ou le temps dans les notes de série.',
      'Utilise des sangles seulement si tu veux cibler autre chose que la prise.',
    ],
    mistakes: [
      'Buste penché en avant à mesure que la fatigue arrive.',
      'Pas trop longs, qui déséquilibrent la charge à chaque appui.',
      'Charges reposées brutalement en fin de série, dos arrondi.',
    ],
    videoQuery: 'farmer walk technique',
  },
];
