/**
 * Verifie la notification de fin de repos, de bout en bout.
 *
 * Deux symptomes signales, qui avaient la meme origine :
 *  - ecran eteint, la fin du repos passait parfois SANS notification ;
 *  - au retour dans l'app, la notification (et la cloche) partait aussitot,
 *    comme si le repos venait de finir, alors qu'il etait fini depuis
 *    longtemps.
 * L'armement ne se faisait qu'en quittant l'ecran, apres une lecture en base :
 * la page etait gelee avant d'avoir poste, et le message partait au retour,
 * echeance depassee.
 *
 * Ce qui est prouve ici :
 *  1. LE WORKER : il tient l'heure seul, ne notifie pas quand l'app est a
 *     l'ecran, ni en retard, et `cancel` ne ferme pas ce qui est affiche.
 *  2. LA PAGE : elle arme des le lancement du repos, rearme SANS ATTENDRE en
 *     quittant l'ecran, ferme au retour, annule a l'arret.
 *  3. L'APP QUITTEE pendant le repos, puis rouverte longtemps apres la fin.
 *     La notification doit sortir a l'heure, sans la page, et au retour ni
 *     cloche ni vibration ne doivent faire croire a un repos qui vient de
 *     finir.
 *
 * Ce qu'on ne peut PAS reproduire ici : un ecran eteint. Chromium pilote garde
 * ses fenetres « visibles » meme reduites ou masquees. Quitter l'app se joue
 * donc en NAVIGUANT ailleurs : le worker n'a plus aucune fenetre a l'ecran, ce
 * qui est exactement ce qu'il verifie. Les notifications se lisent depuis le
 * worker lui-meme, une page de l'app ouverte pour les lire comptant comme une
 * fenetre visible.
 *
 * A lancer sur une BUILD, jamais sur le serveur de dev ou le worker est
 * desactive :
 *   npx vite build && npx vite preview --port 4177
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:4177';
const OUT = process.env.OUT ?? 'scripts/out';

// Mode visible impose : en mode invisible, Chromium REFUSE les notifications
// quoi qu'on lui accorde.
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 },
  permissions: ['notifications'],
});
await context.grantPermissions(['notifications'], { origin: BASE });

const page = await context.newPage();
await page.addInitScript(() => {

  /**
   * Visibilite pilotable, pour la partie 2 : on y teste la logique branchee sur
   * l'evenement, sans quitter l'app a chaque fois.
   */
  let cache = null;
  const vraie = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
  window.__eteindre = (valeur) => {
    cache = valeur;
    document.dispatchEvent(new Event('visibilitychange'));
  };
  window.__visibiliteReelle = () => {
    cache = null;
  };
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (cache === null ? vraie.get.call(document) : cache ? 'hidden' : 'visible'),
  });

  /** Mouchard sur les messages envoyes au worker par la page. */
  window.__messagesWorker = [];
  const envoi = ServiceWorker.prototype.postMessage;
  ServiceWorker.prototype.postMessage = function (message, ...reste) {
    window.__messagesWorker.push(message);
    return envoi.call(this, message, ...reste);
  };

  /** Compte les cloches lancees, pour voir si quelque chose repart au retour. */
  window.__cloches = 0;
  const lancer = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    window.__cloches += 1;
    return lancer.apply(this, args);
  };
});

await page.goto(`${BASE}/#/seance`, { waitUntil: 'load' });
// L'app se met a jour toute seule : la prise de controle du worker recharge
// la page. On laisse cette secousse passer avant de mesurer quoi que ce soit.
await page.waitForTimeout(5000);

/** Le worker de l'app, pour lire ses notifications sans fenetre ouverte. */
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));

/** Quitte l'app : plus aucune fenetre de son origine n'est a l'ecran. */
const quitter = () => page.goto('about:blank');
const revenir = async () => {
  await page.goto(`${BASE}/#/seance`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
};

let echecs = 0;
const check = (nom, ok, detail = '') => {
  if (!ok) echecs += 1;
  console.log(`${ok ? 'OK   ' : 'ECHEC'} ${nom}${detail ? ` : ${detail}` : ''}`);
};

const posees = () =>
  worker.evaluate(
    async () => (await self.registration.getNotifications({ tag: 'gymtrack-rest' })).length,
  );

const versWorker = (message) =>
  page.evaluate(async (m) => {
    const registration = await navigator.serviceWorker.ready;
    const endsAt = m.dansMs === undefined ? undefined : Date.now() + m.dansMs;
    registration.active.postMessage({ type: m.type, endsAt });
  }, message);

const actif = await page.evaluate(async () => (await navigator.serviceWorker.ready).active !== null);
if (!actif) {
  console.log('ECHEC : aucun worker actif, la build n’est pas servie ici.');
  await browser.close();
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* 1. Le worker                                                                */
/* -------------------------------------------------------------------------- */

console.log('\n--- le worker, seul');

await versWorker({ type: 'gymtrack-rest-arm', dansMs: 3000 });
await page.waitForTimeout(4500);
check('rien quand l’app est a l’ecran', (await posees()) === 0);

await versWorker({ type: 'gymtrack-rest-arm', dansMs: 6000 });
await quitter();
await page.waitForTimeout(1500);
check('rien avant l’heure', (await posees()) === 0);
await page.waitForTimeout(6000);
check('le worker tient l’heure sans la page', (await posees()) === 1);
await revenir();

await versWorker({ type: 'gymtrack-rest-cancel' });
await page.waitForTimeout(600);
check('annuler ne ferme pas la notification affichee', (await posees()) === 1);

await versWorker({ type: 'gymtrack-rest-clear' });
await page.waitForTimeout(600);
check('clear ferme la notification affichee', (await posees()) === 0);

await versWorker({ type: 'gymtrack-rest-arm', dansMs: 3000 });
await page.waitForTimeout(500);
await versWorker({ type: 'gymtrack-rest-cancel' });
await quitter();
await page.waitForTimeout(4000);
check('un repos annule ne notifie pas', (await posees()) === 0);
await revenir();

await versWorker({ type: 'gymtrack-rest-arm', dansMs: -30000 });
await quitter();
await page.waitForTimeout(1500);
check('une echeance depassee depuis longtemps ne notifie pas', (await posees()) === 0);
await revenir();

/* -------------------------------------------------------------------------- */
/* 2. La page                                                                  */
/* -------------------------------------------------------------------------- */

console.log('\n--- la page');

// Le reglage est desactive par defaut : la permission ne se demandant qu'apres
// un geste explicite, on fait ce geste, par l'ecran prevu pour.
await page.goto(`${BASE}/#/profil/reglages`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
// La case elle-meme est `sr-only` : on vise l'interrupteur visible.
const ligne = page.locator('label').filter({ hasText: 'Notification en fin de repos' }).first();
await ligne.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const boite = await ligne.locator('span[aria-hidden]').boundingBox();
await page.mouse.click(boite.x + boite.width / 2, boite.y + boite.height / 2);
await page.waitForTimeout(1200);
check('reglage active', await ligne.locator('input[type=checkbox]').isChecked());

await page.goto(`${BASE}/#/seance`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.getByRole('button', { name: 'Démarrer une séance vide' }).click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: /Ajouter des exercices/ }).click();
await page.waitForTimeout(900);
await page.locator('li button[aria-pressed]').first().click();
await page.getByRole('button', { name: /Ajouter \d+ exercices?/ }).click();
await page.waitForTimeout(900);

const messages = () => page.evaluate(() => window.__messagesWorker.map((m) => m.type));
const vider = () => page.evaluate(() => (window.__messagesWorker.length = 0));

await vider();
await page.locator('input[aria-label^="Poids série 1"]').fill('60');
await page.locator('input[aria-label^="Répétitions série 1"]').fill('8');
await page.getByRole('button', { name: 'Valider la série' }).first().click();
await page.waitForTimeout(1000);
check('arme des le lancement du repos', (await messages()).includes('gymtrack-rest-arm'));

// L'evenement et la lecture dans la MEME tache : un message qui attendrait
// quoi que ce soit n'y serait pas encore, exactement comme sur un telephone
// qui gele la page dans la foulee.
await vider();
const auDepart = await page.evaluate(() => {
  window.__eteindre(true);
  return window.__messagesWorker.map((m) => m.type);
});
check('rearme sans attendre en quittant l’ecran', auDepart.includes('gymtrack-rest-arm'), auDepart.join(', '));

await vider();
await page.evaluate(() => window.__eteindre(false));
await page.waitForTimeout(400);
check('ferme l’affiche au retour', (await messages()).includes('gymtrack-rest-clear'));

await vider();
await page.getByRole('button', { name: 'Arrêter le repos' }).click();
await page.waitForTimeout(600);
check('annule a l’arret du repos', (await messages()).includes('gymtrack-rest-cancel'));
await page.evaluate(() => window.__visibiliteReelle());

/* -------------------------------------------------------------------------- */
/* 3. Une vraie mise en veille                                                 */
/* -------------------------------------------------------------------------- */

console.log('\n--- l’app quittee pendant le repos, rouverte bien apres');

/** Relance un repos court : on part du chrono par defaut et on retire 15 s. */
const reposCourt = async () => {
  await page.getByRole('button', { name: /Ajouter une série/ }).first().click();
  await page.waitForTimeout(500);
  await page.locator('input[aria-label^="Poids série 2"]').fill('60');
  await page.locator('input[aria-label^="Répétitions série 2"]').fill('8');
  await page.getByRole('button', { name: 'Valider la série' }).first().click();
  await page.waitForTimeout(600);
  const bar = page.getByRole('button', { name: 'Arrêter le repos' }).locator('xpath=../..');
  for (let i = 0; i < 40; i += 1) {
    const texte = await bar.innerText();
    const m = texte.match(/(\d+):(\d\d)/);
    const reste = m ? Number(m[1]) * 60 + Number(m[2]) : 0;
    if (reste <= 20) return reste;
    await page.getByRole('button', { name: 'Retirer 15 secondes' }).click();
    await page.waitForTimeout(120);
  }
  return null;
};

const reste = await reposCourt();
console.log(`repos restant au depart : ${reste} s`);
await page.waitForTimeout(500);

await quitter();
await page.waitForTimeout((reste + 2) * 1000);
check('notifie a l’heure, app quittee', (await posees()) === 1);

// On reste dehors bien au-dela du seuil de retard, puis on revient : la
// seance et son chrono fini sont relus en base.
await page.waitForTimeout(12000);
await page.goto(`${BASE}/#/seance`, { waitUntil: 'load' });
await page.waitForTimeout(3000);

const cloches = await page.evaluate(() => window.__cloches);
check('aucune cloche au retour', cloches === 0, String(cloches));
check('la notification perimee se ferme au retour', (await posees()) === 0);
check(
  'le chrono est arrete au retour',
  (await page.getByRole('button', { name: 'Arrêter le repos' }).count()) === 0,
);

await page.screenshot({ path: `${OUT}/notif-retour.png` });
await browser.close();

console.log(echecs === 0 ? '\nTout est bon.' : `\n${echecs} echec(s).`);
process.exit(echecs === 0 ? 0 : 1);
