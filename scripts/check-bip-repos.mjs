/**
 * Le bip de fin de repos doit etre pose A L'AVANCE, et survivre a une sortie
 * de l'application.
 *
 * On instrumente l'API audio du navigateur : le son lui-meme ne s'entend pas
 * dans un navigateur sans haut-parleur, mais ce qu'on veut verifier n'est pas
 * le son, c'est QUAND il est programme et si la sortie audio est reveillee.
 *
 * Depuis le choix des sonneries, la cloche est un TAMPON rendu d'avance et lu
 * par un seul noeud (`createBufferSource`), et non plus deux oscillateurs : le
 * mouchard suit donc les deux sortes de noeuds. Seule la veilleuse reste un
 * oscillateur.
 *
 * Trois points :
 *  - la cloche est programmee a l'heure de fin, pas au moment ou l'on constate
 *    la fin ; c'est ce qui la rend insensible au gel des compteurs ;
 *  - un oscillateur inaudible garde la session eveillee pendant le repos ;
 *  - une session endormie, comme apres une sortie de l'app, repart au premier
 *    geste.
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

await page.addInitScript(() => {
  Object.defineProperty(navigator, 'onLine', { get: () => false });

  // Mouchard sur les noeuds audio : on note a quelle heure audio chacun est
  // programme, et depuis quelle heure il l'est. `cloche` pour les lectures de
  // tampon, `veilleuse` pour les oscillateurs.
  const espion = { notes: [], arrets: 0, ctx: null };
  window.__audio = espion;

  const suivre = (ctx, noeud, sorte) => {
    espion.ctx = ctx;
    const start = noeud.start.bind(noeud);
    noeud.start = (quand) => {
      espion.notes.push({ sorte, dans: (quand ?? ctx.currentTime) - ctx.currentTime });
      return start(quand);
    };
    const stop = noeud.stop.bind(noeud);
    noeud.stop = (quand) => {
      espion.arrets += 1;
      return stop(quand);
    };
    return noeud;
  };

  const creerOscillateur = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function () {
    return suivre(this, creerOscillateur.call(this), 'veilleuse');
  };
  const creerLecture = AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource = function () {
    return suivre(this, creerLecture.call(this), 'cloche');
  };
});

await page.goto(`${BASE}/#/seance`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

await page.getByRole('button', { name: 'Démarrer une séance vide' }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Ajouter des exercices/ }).click();
await page.waitForTimeout(500);
await page.locator('li button[aria-pressed]').first().click();
await page.getByRole('button', { name: /Ajouter \d+ exercices?/ }).click();
await page.waitForTimeout(600);

await page.locator('input[aria-label^="Poids série 1"]').fill('60');
await page.locator('input[aria-label^="Répétitions série 1"]').fill('5');
await page.getByRole('button', { name: 'Valider la série' }).first().click();
await page.waitForTimeout(1200);

const releve = await page.evaluate(() => ({
  notes: window.__audio.notes,
  etat: window.__audio.ctx?.state ?? 'aucun',
}));

// Le repos par defaut du premier exercice sert de reference : la barre affiche
// la duree totale a cote du temps restant.
const total = (await page.locator('button[aria-label*="repos"]').first().innerText())
  .match(/\/\s*(\d+):(\d\d)/);
const attendu = Number(total?.[1] ?? 0) * 60 + Number(total?.[2] ?? 0);

const cloches = releve.notes.filter((n) => n.sorte === 'cloche');
const veilleuse = releve.notes.find((n) => n.sorte === 'veilleuse');
const avance = cloches[0]?.dans ?? -1;

const okAvance = cloches.length === 1 && Math.abs(avance - attendu) < 3;
const okVeilleuse = veilleuse !== undefined;
const okEtat = releve.etat === 'running';

console.log(
  `repos=${attendu}s cloche programmee dans ${avance.toFixed(1)}s (${okAvance ? 'OK' : 'ECHEC'})`,
);
console.log(`veilleuse=${okVeilleuse ? 'OK' : 'ECHEC'} session=${releve.etat}`);

/**
 * Fin reelle du repos, raccourci a quinze secondes.
 *
 * La cloche posee a l'avance est celle qui sonne : le battement qui constate la
 * fin ne doit PAS en jouer une seconde par-dessus. On compte donc les cloches
 * programmees avant et apres l'echeance, elles doivent etre les memes.
 */
for (let i = 0; i < 3; i++) {
  await page.getByRole('button', { name: 'Retirer 15 secondes' }).click();
  await page.waitForTimeout(200);
}
const notesAvantFin = await page.evaluate(
  () => window.__audio.notes.filter((n) => n.sorte === 'cloche').length,
);

await page.locator('button[aria-label*="repos"]').first().waitFor({ state: 'detached', timeout: 25_000 });
await page.waitForTimeout(800);

const notesApresFin = await page.evaluate(
  () => window.__audio.notes.filter((n) => n.sorte === 'cloche').length,
);
const okPasDeDoublon = notesApresFin === notesAvantFin;
console.log(
  `fin du repos : ${notesApresFin - notesAvantFin} cloche rejouee (${okPasDeDoublon ? 'OK' : 'ECHEC'})`,
);

// Nouveau repos, pour verifier l'annulation.
await page.getByRole('button', { name: 'Annuler la validation' }).first().click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Valider la série' }).first().click();
await page.waitForTimeout(900);

// Arret du repos : la cloche en attente doit etre retiree, veilleuse comprise.
const arretsAvant = await page.evaluate(() => window.__audio.arrets);
await page.getByRole('button', { name: 'Arrêter le repos' }).click();
await page.waitForTimeout(500);
const arretsApres = await page.evaluate(() => window.__audio.arrets);
const okAnnulation = arretsApres >= arretsAvant + 2;
console.log(`annulation : ${arretsApres - arretsAvant} noeuds retires (${okAnnulation ? 'OK' : 'ECHEC'})`);

// Sortie de l'app : la session s'endort et ne repart pas seule. Elle doit
// repartir au premier geste.
await page.evaluate(async () => {
  await window.__audio.ctx.suspend();
});
const endormie = await page.evaluate(() => window.__audio.ctx.state);
await page.locator('body').click({ position: { x: 200, y: 300 } });
// Le reveil passe par une promesse : on attend la sortie de veille plutot
// qu'un delai fixe, qui rendait ce controle capricieux.
const reveillee = await page
  .waitForFunction(() => window.__audio.ctx.state === 'running', null, { timeout: 3000 })
  .then(() => 'running')
  .catch(() => page.evaluate(() => window.__audio.ctx.state));
const okReveil = endormie === 'suspended' && reveillee === 'running';
console.log(`apres sortie : ${endormie} puis ${reveillee} (${okReveil ? 'OK' : 'ECHEC'})`);

const ok = okAvance && okVeilleuse && okEtat && okPasDeDoublon && okAnnulation && okReveil;
await browser.close();
process.exit(ok ? 0 : 1);
