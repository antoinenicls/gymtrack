/**
 * Un dossier replie le reste.
 *
 * Deux allers-retours a verifier, et ce sont ceux que l'utilisateur fait :
 * changer d'onglet puis revenir, et fermer puis rouvrir l'app. L'etat vivait
 * dans l'ecran, donc il se perdait des le premier des deux.
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';
const OUT = process.env.OUT ?? 'scripts/out';

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

await page.addInitScript(() => {
  Object.defineProperty(navigator, 'onLine', { get: () => false });
});

await page.goto(`${BASE}/#/seance`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Deux dossiers, chacun avec une seance : replier l'un ne doit pas replier
// l'autre.
await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('gymtrack');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const tx = db.transaction(['routines', 'routineFolders'], 'readwrite');
  const folders = tx.objectStore('routineFolders');
  const routines = tx.objectStore('routines');
  folders.put({ id: 'dossier-a', name: 'Haut du corps', order: 0, createdAt: 1 });
  folders.put({ id: 'dossier-b', name: 'Bas du corps', order: 1, createdAt: 2 });
  routines.put({
    id: 'r-a',
    name: 'PUSH A',
    folderId: 'dossier-a',
    items: [],
    createdAt: 1,
    updatedAt: 1,
    lastPerformedAt: null,
  });
  routines.put({
    id: 'r-b',
    name: 'LEGS A',
    folderId: 'dossier-b',
    items: [],
    createdAt: 2,
    updatedAt: 2,
    lastPerformedAt: null,
  });
  await new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
});

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const dossier = (nom) => page.locator(`button[aria-expanded]:has-text("${nom}")`);
const etat = async () => ({
  haut: await dossier('Haut du corps').getAttribute('aria-expanded'),
  bas: await dossier('Bas du corps').getAttribute('aria-expanded'),
  pushVisible: await page.getByText('PUSH A').isVisible(),
});

const depart = await etat();

// On replie « Haut du corps », et lui seul.
await dossier('Haut du corps').click();
await page.waitForTimeout(500);
const replie = await etat();
await page.screenshot({ path: `${OUT}/dossier-replie.png` });

// Aller-retour par les onglets.
await page.getByRole('link', { name: 'Historique' }).click();
await page.waitForTimeout(600);
await page.getByRole('link', { name: 'Séance' }).click();
await page.waitForTimeout(900);
const apresOnglet = await etat();

// Fermeture et reouverture de l'app.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const apresRelance = await etat();

const decrit = (e) => `haut=${e.haut} bas=${e.bas} pushVisible=${e.pushVisible}`;
const conserve = (e) => e.haut === 'false' && e.bas === 'true' && e.pushVisible === false;

const ok =
  depart.haut === 'true' &&
  conserve(replie) &&
  conserve(apresOnglet) &&
  conserve(apresRelance);

console.log(`depart      ${decrit(depart)}`);
console.log(`replie      ${decrit(replie)}`);
console.log(`onglet      ${decrit(apresOnglet)}`);
console.log(`relance     ${decrit(apresRelance)}`);
console.log(ok ? 'OK' : 'ECHEC');

await browser.close();
process.exit(ok ? 0 : 1);
