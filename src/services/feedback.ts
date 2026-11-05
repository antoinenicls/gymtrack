/**
 * Retour sonore et haptique de fin de repos.
 *
 * L'athlete a souvent le telephone pose et le nez en l'air : il faut le
 * prevenir sans qu'il regarde l'ecran. On combine vibration et son court.
 *
 * PRINCIPE : le bip est programme A L'AVANCE, des le lancement du repos, sur
 * l'horloge audio. Il ne dependait avant que d'un compteur JavaScript, et un
 * compteur est ralenti des que l'onglet passe au second plan, puis gele net
 * quand l'ecran s'eteint : le son arrivait alors en retard, ou pas du tout.
 * L'horloge audio, elle, tient l'heure toute seule, dans le materiel.
 *
 * Trois limites reelles a connaitre :
 *  - navigator.vibrate n'existe pas sur iOS Safari. Aucune API web ne donne
 *    l'haptique sur iPhone. On appelle quand meme, ca marche sur Android, et
 *    le son prend le relais ailleurs.
 *  - Un navigateur bloque tout son tant que l'utilisateur n'a pas interagi
 *    avec la page. Comme le chrono demarre toujours apres un tap sur une
 *    coche, le contexte audio est deja debloque quand on en a besoin.
 *  - iOS SUSPEND le contexte des qu'on quitte l'app, et il ne repart pas tout
 *    seul. C'est ce qui faisait qu'apres etre sorti une fois de GymTrack, le
 *    son ne revenait plus du tout. On le reveille donc a chaque retour a
 *    l'ecran et a chaque geste, et on garde la session eveillee pendant un
 *    repos.
 */

import { settingsRepo } from './repositories';
import { chimeDurationSec, restChimeSample, type ChimeId } from '@/lib/restChime';

let audioContext: AudioContext | null = null;

/**
 * Le contexte audio ne se cree que sur un GESTE de l'athlete.
 *
 * D'ou le drapeau. Un contexte ouvert en dehors d'un geste nait suspendu sur
 * iPhone, et le systeme se montre bien moins cooperatif pour le reveiller
 * ensuite : c'est un cas connu, et c'est celui qu'on rencontrait, la
 * reapparition de l'app suffisant a en creer un avant le moindre appui. Les
 * chemins qui ne descendent pas d'un geste se contentent donc de reveiller
 * celui qui existe deja, s'il existe.
 */
function getAudioContext(creerSiBesoin: boolean): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;
  if (!creerSiBesoin) return null;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  audioContext = new Ctor();
  return audioContext;
}

/**
 * Reveille le contexte, et ATTEND qu'il soit reellement reparti.
 *
 * L'ancienne version lancait la reprise sans l'attendre, puis programmait le
 * bip dans la foulee. Sur un contexte encore endormi, l'horloge n'avance pas :
 * le son se retrouvait programme a une heure deja passee, et ne sortait
 * jamais. C'est la premiere cause des « une fois sur deux ».
 */
async function wakeAudio(creerSiBesoin = false): Promise<AudioContext | null> {
  const ctx = getAudioContext(creerSiBesoin);
  if (!ctx) return null;
  if (ctx.state !== 'running') {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx.state === 'running' ? ctx : null;
}

/**
 * La sonnerie, rendue dans un tampon plutot que jouee par des oscillateurs.
 *
 * Elle etait montee ici, a coups d'oscillateurs et d'enveloppes. Depuis qu'il y
 * a plusieurs sonneries au choix, chacune avec ses partiels et ses frappes, ce
 * montage aurait ete a refaire pour chacune. Le son est donc DECRIT une fois
 * dans `@/lib/restChime`, sous forme d'une amplitude a l'instant `t`, et il ne
 * reste ici qu'a remplir un tampon avec.
 *
 * Toujours zero octet a telecharger, ce qui reste la contrainte : l'app doit
 * sonner dans un sous-sol sans reseau.
 *
 * Le tampon est garde d'un repos a l'autre, et refait des que la sonnerie
 * choisie ou la frequence du materiel change.
 */
let chimeBuffer: { buffer: AudioBuffer; rate: number; id: ChimeId | undefined } | null = null;

function getChimeBuffer(ctx: AudioContext, id: ChimeId | undefined): AudioBuffer {
  if (chimeBuffer && chimeBuffer.rate === ctx.sampleRate && chimeBuffer.id === id) {
    return chimeBuffer.buffer;
  }

  const frames = Math.ceil(chimeDurationSec(id) * ctx.sampleRate);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) channel[i] = restChimeSample(i / ctx.sampleRate, id);

  chimeBuffer = { buffer, rate: ctx.sampleRate, id };
  return buffer;
}

function playChime(ctx: AudioContext, startAt: number, id: ChimeId | undefined): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = getChimeBuffer(ctx, id);
  source.connect(ctx.destination);
  source.start(startAt);
  return source;
}

/**
 * PAS de lecteur audio, jamais. Le son passe par l'horloge audio, un point.
 *
 * Il a existe ici une piste « silence puis cloche », confiee au lecteur du
 * telephone, pour sonner ecran eteint sur iPhone. Le principe marchait, et il
 * a ete retire quand meme : sur iOS, ouvrir une lecture prend la SESSION AUDIO
 * du telephone, et iOS ne la partage pas. Trois consequences, toutes vecues :
 * la musique de l'athlete se mettait en pause, GymTrack apparaissait dans le
 * lecteur de l'ecran verrouille, et le simple deblocage du lecteur — quelques
 * echantillons muets joues au premier appui pour acquerir le droit de lire
 * plus tard — suffisait a interrompre le contexte audio et a rendre l'app
 * silencieuse. Ce deblocage tournait a chaque geste, reglage eteint compris.
 *
 * On s'entraine en musique. Un chrono de repos n'a pas a l'arreter, et aucune
 * API web ne permet a la fois de sonner malgre le bouton silence et de laisser
 * jouer ce qui joue : ce sont deux categories de session audio exclusives. On
 * choisit donc de ne jamais prendre la session, et le prix est connu : ecran
 * eteint sur iPhone, c'est la notification qui previent, pas le son.
 *
 * `scripts/check-audio-non-intrusif.mjs` verrouille cette regle.
 */

/* -------------------------------------------------------------------------- */
/* Son programme a l'avance                                                    */
/* -------------------------------------------------------------------------- */

/** Son en attente, et l'heure AUDIO a laquelle il doit sonner. */
let scheduled: { node: AudioBufferSourceNode; playsAt: number } | null = null;

/**
 * Numero de la programmation en cours.
 *
 * `scheduleRestBeep` attend les reglages et le reveil du contexte : sans ce
 * numero, une programmation annulee pendant cette attente s'installerait quand
 * meme, et un repos arrete sonnerait dans le vide.
 */
let generation = 0;

/** Oscillateur inaudible qui empeche la session audio de s'endormir. */
let keepAlive: OscillatorNode | null = null;

/**
 * Maintient la session audio eveillee pendant le repos.
 *
 * Sans elle, le systeme endort la sortie audio des qu'on quitte l'app ou que
 * l'ecran s'eteint, et le bip programme ne sort pas. Un oscillateur a volume
 * quasi nul suffit a la garder active. Il ne tourne QUE pendant un repos, la
 * ou l'on a justement besoin d'etre prevenu sans regarder l'ecran.
 */
function startKeepAlive(ctx: AudioContext): void {
  if (keepAlive) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  // Inaudible, mais pas nul : une sortie strictement muette est traitee comme
  // du silence, et la session s'endort quand meme.
  gain.gain.value = 0.0001;
  oscillator.frequency.value = 30;
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  keepAlive = oscillator;
}

function stopKeepAlive(): void {
  if (!keepAlive) return;
  try {
    keepAlive.stop();
  } catch {
    // Deja arrete : rien a faire.
  }
  keepAlive.disconnect();
  keepAlive = null;
}

/**
 * Programme le bip de fin de repos, `delayMs` a partir de maintenant.
 *
 * A rappeler a chaque fois que l'echeance bouge : lancement, +15, -15, pause,
 * reprise. Chaque appel remplace le precedent.
 */
export async function scheduleRestBeep(delayMs: number): Promise<void> {
  cancelRestBeep();
  const mine = generation;

  const settings = await settingsRepo.get();
  if (!settings.soundEnabled) return;

  // `true` : le chrono part sur la validation d'une serie, donc sur un appui.
  const ctx = await wakeAudio(true);
  // Annule pendant l'attente : on ne pose rien.
  if (!ctx || mine !== generation) return;

  startKeepAlive(ctx);
  const playsAt = ctx.currentTime + Math.max(0, delayMs) / 1000;
  scheduled = { node: playChime(ctx, playsAt, settings.chimeId), playsAt };
}

/** Annule le son en attente et laisse la session audio se rendormir. */
export function cancelRestBeep(): void {
  generation += 1;
  if (scheduled) {
    try {
      scheduled.node.stop();
    } catch {
      // Deja termine.
    }
    scheduled.node.disconnect();
    scheduled = null;
  }
  stopKeepAlive();
}

/**
 * Fait sonner le bip s'il n'a PAS pu sonner a l'heure.
 *
 * L'horloge audio ne tourne pas quand la session est interrompue. Si elle
 * n'a pas atteint l'heure prevue, c'est que le bip programme n'est jamais
 * sorti : on le joue alors sur-le-champ, plutot que de laisser passer la fin
 * du repos en silence.
 */
function flushRestBeep(): void {
  const manque = !scheduled || !audioContext || audioContext.currentTime < scheduled.playsAt;

  if (!manque) {
    // Le son programme sort a l'instant meme : on ne touche pas a son noeud,
    // qui s'arrete tout seul. L'annuler ici le couperait en pleine cloche.
    scheduled = null;
    generation += 1;
    stopKeepAlive();
    return;
  }

  cancelRestBeep();
  void (async () => {
    const settings = await settingsRepo.get();
    const ctx = await wakeAudio(true);
    if (!ctx) return;
    playChime(ctx, ctx.currentTime, settings.chimeId);
  })();
}

/** Ce qui est arrive a une ecoute demandee. Voir `previewRestChime`. */
export type ChimeOutcome = 'joue' | 'bloque' | 'indisponible';

/**
 * Fait entendre une sonnerie tout de suite, et DIT ce qui s'est passe.
 *
 * On passe l'identifiant plutot que de relire les reglages : on veut entendre
 * celle qu'on touche, y compris avant qu'elle ne soit enregistree.
 *
 * Deux choix qui viennent d'un silence inexplique signale par l'utilisateur,
 * et qu'aucune trace ne permettait d'expliquer :
 *
 *  - On pose le son AVANT d'attendre quoi que ce soit. La version precedente
 *    attendait que le contexte soit reparti et renoncait s'il ne l'etait pas
 *    encore, ce qui arrive precisement au premier appui, quand le contexte
 *    vient de naitre. Un son pose sur un contexte qui repart sort quand il
 *    repart ; renoncer, lui, ne produit jamais rien.
 *  - On renvoie le resultat. Un echec silencieux ne laisse a l'athlete que
 *    « je n'entends rien », sans rien pour agir. L'ecran des reglages en fait
 *    une phrase.
 */
export function previewRestChime(id?: ChimeId): Promise<ChimeOutcome> {
  // Appelee depuis un appui : c'est le bon moment pour ouvrir le contexte.
  const ctx = getAudioContext(true);
  if (!ctx) return Promise.resolve('indisponible');

  const reprise = ctx.state === 'running' ? Promise.resolve() : ctx.resume().catch(() => undefined);
  playChime(ctx, ctx.currentTime, id);

  return reprise.then(() => (ctx.state === 'running' ? 'joue' : 'bloque'));
}

/**
 * Retard au-dela duquel la fin du repos ne s'annonce plus.
 *
 * La page ne constate la fin qu'en etant eveillee. Si elle dormait, c'est au
 * retour dans l'app qu'elle la decouvre, parfois des minutes apres : sonner et
 * vibrer a ce moment-la faisait croire a un repos qui venait de finir, alors
 * qu'il etait fini depuis longtemps. Meme seuil que le worker.
 */
export const REST_LATE_MS = 10_000;

/**
 * Signal de fin de repos, ou rien s'il arrive trop tard.
 *
 * `lateMs` : de combien la fin est deja passee quand la page la constate.
 */
export async function notifyRestOver(lateMs = 0): Promise<void> {
  if (lateMs > REST_LATE_MS) {
    // Sorti a l'heure, le son programme est fini depuis longtemps. Sinon,
    // c'est que l'horloge audio dormait, et il partirait a son reveil, au
    // retour dans l'app : on le retire.
    cancelRestBeep();
    // Et la notification de l'ecran verrouille a ete vue, ou ne sert plus :
    // l'app rouverte de zero ne recoit aucun retour au premier plan pour la
    // fermer.
    clearRestNotification();
    return;
  }

  const settings = await settingsRepo.get();

  if (settings.vibrationEnabled) {
    // Motif long-court-long : reconnaissable dans le bruit d'une salle.
    navigator.vibrate?.([200, 100, 200]);
  }
  if (settings.soundEnabled) flushRestBeep();
  else cancelRestBeep();
  if (settings.notificationsEnabled) void showRestNotification();
}

/** Vibration breve de confirmation, sur validation d'une serie. */
export function tapFeedback(): void {
  navigator.vibrate?.(15);
}

/** Vibration marquee pour un record personnel. */
export function prFeedback(): void {
  navigator.vibrate?.([40, 60, 40, 60, 120]);
}

/**
 * Garde le contexte audio pret. A appeler une fois au demarrage de l'app.
 *
 * A CHAQUE geste et a chaque retour a l'ecran, et non au premier geste
 * seulement : un contexte debloque une fois ne le reste pas. iOS le suspend
 * des qu'on quitte l'app, et seul un geste de l'utilisateur peut le relancer.
 * Ne le reveiller qu'une fois, c'etait perdre le son pour tout le reste de la
 * seance des qu'on avait consulte autre chose sur son telephone.
 */
export function primeAudio(): void {
  // L'appui a le droit de CREER le contexte, le retour a l'ecran seulement de
  // reveiller celui qui existe : voir `getAudioContext`.
  document.addEventListener('pointerdown', () => void wakeAudio(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void wakeAudio(false);
  });
}

/* -------------------------------------------------------------------------- */
/* Notifications systeme                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Notification de fin de repos.
 *
 * LIMITES REELLES, a connaitre avant de compter dessus :
 *
 *  - Sur iPhone, les notifications web n'existent QUE si l'app a ete ajoutee a
 *    l'ecran d'accueil (iOS 16.4+). Dans un onglet Safari, l'API est absente.
 *  - GymTrack n'a pas de serveur, donc pas de push au sens strict : la
 *    notification est programmee localement par la page. Si le systeme gele
 *    l'app en arriere-plan, elle peut arriver en retard. Le son et la
 *    vibration restent le signal principal, la notification est un renfort.
 *  - On n'affiche rien quand l'ecran est deja sur l'app : la barre de repos
 *    est visible, une notification par-dessus serait du bruit.
 */
export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

/** Demande la permission. A n'appeler que depuis un geste utilisateur. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

async function showRestNotification(): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  // Inutile de notifier quelqu'un qui a l'app sous les yeux.
  if (document.visibilityState === 'visible') return;

  const body = 'Repos terminé. À toi de jouer.';

  try {
    // Passer par le service worker est la seule voie sur Android et en PWA
    // installee ; `new Notification()` y est refuse.
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.showNotification('GymTrack', {
        body,
        icon: '/pwa-192.png',
        badge: '/pwa-192.png',
        tag: 'gymtrack-rest',
        // Pas de `renotify` : le worker a pu poser la meme notification a
        // l'heure dite. Meme etiquette, donc celle-ci la remplace en silence
        // au lieu de faire sonner le telephone une seconde fois.
        silent: false,
      } as NotificationOptions);
      return;
    }
  } catch {
    // On retombe sur la notification de page.
  }

  try {
    new Notification('GymTrack', { body, icon: '/pwa-192.png', tag: 'gymtrack-rest' });
  } catch {
    // Certains navigateurs refusent le constructeur direct : le son et la
    // vibration ont deja fait le travail.
  }
}

/* -------------------------------------------------------------------------- */
/* Notification programmee d'avance                                            */
/* -------------------------------------------------------------------------- */

/**
 * La notification de fin de repos ne peut PAS etre affichee par la page.
 *
 * Le battement de chrono qui constate la fin s'arrete net quand l'ecran
 * s'eteint, c'est-a-dire precisement dans le cas ou l'on veut etre prevenu. On
 * confie donc l'heure au service worker, qui survit a la page, et c'est lui qui
 * decide a l'echeance s'il faut afficher. Voir `public/rest-notify.js`.
 *
 * ARMER SANS RIEN ATTENDRE au moment ou l'app quitte l'ecran. L'armement
 * lisait les reglages en base et attendait le worker avant de poster : le
 * systeme gelait la page entre-temps, le message ne partait pas, et rien ne
 * sonnait. Il partait en revanche au retour dans l'app, echeance depassee, et
 * la notification sortait sous les yeux, comme un repos qui venait de finir.
 * Les reglages et le worker sont donc lus AU LANCEMENT du repos, et le passage
 * en arriere-plan n'a plus qu'un message a poster, sur-le-champ.
 */
let notifyGeneration = 0;

/** Lu au lancement du repos, pour que le passage en arriere-plan n'attende rien. */
let notifyTarget: { worker: ServiceWorker; endsAt: number } | null = null;

function post(worker: ServiceWorker | null | undefined, message: Record<string, unknown>): void {
  try {
    worker?.postMessage(message);
  } catch {
    // Worker remplace entre-temps : le son et la vibration restent le filet.
  }
}

function currentWorker(): ServiceWorker | null {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return null;
  return navigator.serviceWorker.controller ?? notifyTarget?.worker ?? null;
}

/**
 * Arme la notification pour l'heure de fin du repos, des son lancement.
 *
 * Armer alors que l'app est a l'ecran ne fait rien sonner : le worker verifie,
 * a l'echeance, qu'aucune fenetre de l'app n'est visible.
 */
export async function armRestNotification(endsAt: number): Promise<void> {
  const mine = ++notifyGeneration;
  notifyTarget = null;

  const settings = await settingsRepo.get();
  if (!settings.notificationsEnabled) return;
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;

  let worker: ServiceWorker | null = null;
  try {
    const registration = await navigator.serviceWorker.ready;
    // `controller` est null au tout premier chargement suivant l'installation,
    // la page n'etant pas encore controlee : on vise alors le worker actif de
    // l'enregistrement, qui existe des que `ready` a resolu.
    worker = navigator.serviceWorker.controller ?? registration.active;
  } catch {
    return;
  }
  // Annule ou remplace pendant l'attente : on ne pose rien.
  if (!worker || mine !== notifyGeneration) return;

  notifyTarget = { worker, endsAt };
  post(worker, { type: 'gymtrack-rest-arm', endsAt });
}

/**
 * Rearme sur-le-champ, en quittant l'ecran. Synchrone, par construction.
 *
 * Le worker tient deja l'echeance depuis le lancement ; ce second message lui
 * redonne un sursis complet, un worker en attente n'etant pas eternel.
 */
export function rearmRestNotification(): void {
  if (!notifyTarget) return;
  post(currentWorker(), { type: 'gymtrack-rest-arm', endsAt: notifyTarget.endsAt });
}

/**
 * Oublie l'echeance : repos arrete, mis en pause, ou fini.
 *
 * Ne ferme PAS la notification affichee. Le repos s'arrete aussi tout seul a
 * la fin, et la fermer la faisait disparaitre une seconde apres son arrivee.
 */
export function cancelRestNotification(): void {
  notifyGeneration += 1;
  const worker = currentWorker();
  notifyTarget = null;
  post(worker, { type: 'gymtrack-rest-cancel' });
}

/** Ferme la notification affichee, au retour dans l'app : elle a ete lue. */
export function clearRestNotification(): void {
  post(currentWorker(), { type: 'gymtrack-rest-clear' });
}
