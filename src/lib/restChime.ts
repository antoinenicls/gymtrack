/**
 * Les sonneries de fin de repos.
 *
 * SYNTHETISEES, jamais chargees. Chacune tient en une poignee de nombres, donc
 * en proposer quatre ne coute pas un octet de plus au telechargement et rien du
 * tout en memoire : c'est ce qui rend le choix gratuit. Un catalogue de
 * fichiers audio aurait alourdi une app qui doit demarrer dans un sous-sol sans
 * reseau.
 *
 * COMMENT SE FABRIQUE UN SON D'ALERTE. Une sonnerie est ici une suite de
 * FRAPPES, et chaque frappe est une somme de PARTIELS qui s'eteignent. Trois
 * reglages suffisent a couvrir tout ce qu'on veut :
 *
 *  - L'attaque. Quelques millisecondes et le son claque, on entend un objet
 *    frappe ; quelques dizaines et il s'annonce, on entend un signal.
 *  - Les rapports entre partiels. Entiers (2, 3, 4), ils se fondent en une
 *    seule note franche : c'est un bip electronique. Bancals (2,76 ; 4,07),
 *    ils restent audibles separement et l'oreille entend du metal : c'est une
 *    cloche. Ce seul detail separe les deux familles.
 *  - Les frappes. Une seule se confond avec un bruit de salle ; deux ou trois
 *    rapprochees ne peuvent pas etre accidentelles. Leur hauteur peut monter,
 *    ce qui s'entend comme une invitation a repartir.
 *
 * Toutes visent la meme bande, entre 1 et 5 kHz : c'est la ou l'oreille est la
 * plus sensible et ou une salle de sport fait le moins de bruit. Les basses
 * d'une sono masqueraient tout en dessous.
 *
 * `services/feedback` echantillonne ces fonctions dans un tampon audio.
 */

export type ChimeId = 'cloche' | 'bip' | 'triolet' | 'gong';

interface ChimePartial {
  /** Rapport a la fondamentale. */
  ratio: number;
  gain: number;
  /** Temps d'extinction, en secondes. */
  decaySec: number;
}

interface ChimeStrike {
  atSec: number;
  gain: number;
  /** Hauteur de cette frappe, en rapport a la fondamentale. 1 = la meme. */
  ratio: number;
}

export interface Chime {
  id: ChimeId;
  label: string;
  /** Ce qu'on entend, en quelques mots. Affiche sous le nom dans les reglages. */
  hint: string;
  baseHz: number;
  attackSec: number;
  durationSec: number;
  partials: ChimePartial[];
  strikes: ChimeStrike[];
}

export const CHIMES: Chime[] = [
  {
    id: 'cloche',
    label: 'Cloche',
    hint: 'Deux coups nets, métalliques',
    baseHz: 1245,
    // Deux millisecondes : c'est ce qui fait claquer. Plus court, la coupure du
    // signal ajouterait son propre clic.
    attackSec: 0.002,
    durationSec: 0.9,
    partials: [
      { ratio: 1, gain: 1, decaySec: 0.5 },
      { ratio: 2.0, gain: 0.55, decaySec: 0.32 },
      { ratio: 2.76, gain: 0.32, decaySec: 0.2 },
      { ratio: 4.07, gain: 0.16, decaySec: 0.12 },
    ],
    strikes: [
      { atSec: 0, gain: 1, ratio: 1 },
      { atSec: 0.2, gain: 0.92, ratio: 1 },
    ],
  },
  {
    id: 'bip',
    label: 'Bip bip',
    hint: 'Sec et électronique, comme un minuteur',
    baseHz: 1046,
    attackSec: 0.004,
    durationSec: 0.6,
    // Harmoniques impaires : le timbre d'une onde carree, sans les aigus
    // agressifs qu'une vraie carree traine jusqu'en haut du spectre.
    partials: [
      { ratio: 1, gain: 1, decaySec: 0.11 },
      { ratio: 3, gain: 0.33, decaySec: 0.09 },
      { ratio: 5, gain: 0.2, decaySec: 0.07 },
      { ratio: 7, gain: 0.14, decaySec: 0.05 },
    ],
    strikes: [
      { atSec: 0, gain: 1, ratio: 1 },
      { atSec: 0.16, gain: 1, ratio: 1 },
    ],
  },
  {
    id: 'triolet',
    label: 'Triolet',
    hint: 'Trois notes qui montent',
    baseHz: 880,
    attackSec: 0.006,
    durationSec: 1,
    partials: [
      { ratio: 1, gain: 1, decaySec: 0.22 },
      { ratio: 2, gain: 0.4, decaySec: 0.16 },
      { ratio: 3, gain: 0.18, decaySec: 0.1 },
    ],
    // Tierce puis quinte : l'accord majeur, celui que toutes les alertes
    // « c'est pret » emploient, parce qu'il ne s'entend pas comme une mauvaise
    // nouvelle.
    strikes: [
      { atSec: 0, gain: 0.85, ratio: 1 },
      { atSec: 0.14, gain: 0.92, ratio: 1.25 },
      { atSec: 0.28, gain: 1, ratio: 1.5 },
    ],
  },
  {
    id: 'gong',
    label: 'Gong',
    hint: 'Un coup grave, qui traîne',
    baseHz: 622,
    attackSec: 0.003,
    durationSec: 1.6,
    partials: [
      { ratio: 1, gain: 1, decaySec: 1 },
      { ratio: 2.4, gain: 0.5, decaySec: 0.6 },
      { ratio: 3.7, gain: 0.28, decaySec: 0.35 },
      { ratio: 5.9, gain: 0.14, decaySec: 0.18 },
    ],
    strikes: [{ atSec: 0, gain: 1, ratio: 1 }],
  },
];

export const DEFAULT_CHIME: ChimeId = 'cloche';

/** La sonnerie demandee, ou celle par defaut si l'identifiant ne dit rien. */
export function getChime(id: ChimeId | undefined): Chime {
  return CHIMES.find((c) => c.id === id) ?? CHIMES[0]!;
}

/** Duree du son, en secondes. Sert a dimensionner le tampon qui le recoit. */
export function chimeDurationSec(id: ChimeId | undefined): number {
  return getChime(id).durationSec;
}

/** Niveau vise pour le pic. Sous 1 pour ne jamais saturer a la conversion. */
const PEAK = 0.85;

/**
 * Facteur de normalisation, mesure une fois par sonnerie.
 *
 * La somme des partiels de plusieurs frappes peut passer largement au-dessus
 * de 1, et de combien exactement depend de leurs phases a l'instant du
 * recouvrement. Plutot que de le calculer a la main et de le refaire a chaque
 * retouche d'un timbre, on mesure le pic reel une fois et on s'y cale. C'est
 * aussi ce qui met les quatre sonneries au meme volume : sans ca, en changer
 * reviendrait a changer le volume.
 */
const scales = new Map<ChimeId, number>();

function normalization(chime: Chime): number {
  const connu = scales.get(chime.id);
  if (connu !== undefined) return connu;

  const rate = 48000;
  let peak = 0;
  for (let i = 0; i < Math.ceil(chime.durationSec * rate); i += 1) {
    peak = Math.max(peak, Math.abs(rawChime(chime, i / rate)));
  }
  const scale = peak > 0 ? PEAK / peak : 0;
  scales.set(chime.id, scale);
  return scale;
}

/**
 * Extinction imposee sur la fin, en secondes.
 *
 * Une queue de cloche ne tombe jamais tout a fait a zero : elle decroit sans
 * fin. Couper le tampon la ou il s'arrete revient donc a trancher un signal
 * encore audible, ce qui s'entend comme un clic sec — mesure sur le gong,
 * coupe a un dixieme de son niveau maximal. Plutot que d'allonger chaque son
 * jusqu'au silence, ce qui ferait trainer une alerte, on l'eteint sur les
 * derniers instants. Assez long pour ne pas s'entendre, assez court pour ne
 * pas mordre sur le son utile.
 */
const RELEASE_SEC = 0.25;

function rawChime(chime: Chime, t: number): number {
  let value = 0;
  for (const strike of chime.strikes) {
    const u = t - strike.atSec;
    if (u < 0) continue;
    // L'attaque est commune a tous les partiels : c'est un seul choc.
    const attack = u < chime.attackSec ? u / chime.attackSec : 1;
    for (const partial of chime.partials) {
      value +=
        strike.gain *
        attack *
        partial.gain *
        Math.exp(-u / partial.decaySec) *
        Math.sin(2 * Math.PI * chime.baseHz * strike.ratio * partial.ratio * u);
    }
  }

  const restant = chime.durationSec - t;
  return restant < RELEASE_SEC ? value * Math.max(0, restant / RELEASE_SEC) : value;
}

/** Amplitude de la sonnerie a l'instant `t`, en secondes depuis son debut. */
export function restChimeSample(t: number, id?: ChimeId): number {
  const chime = getChime(id);
  if (t < 0 || t > chime.durationSec) return 0;
  return rawChime(chime, t) * normalization(chime);
}
