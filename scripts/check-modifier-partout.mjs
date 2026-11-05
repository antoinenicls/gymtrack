/**
 * Verifie qu'un exercice cree se corrige depuis la fiche ouverte PAR-DESSUS
 * un ecran, et pas seulement depuis l'onglet Exercices.
 *
 * Scenario : une seance enregistree contient un mouvement mal nomme. On le
 * corrige depuis la vue d'ensemble de la seance, puis depuis son editeur, puis
 * pendant la seance lancee. A chaque fois, le titre de la feuille et le nom
 * affiche dessous doivent suivre, sans quitter l'ecran. Un mouvement du
 * catalogue ne doit toujours pas proposer la correction.
 *
 * A lancer avec un serveur :
 *   npx vite --port 5178
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5178';
const OUT = process.env.OUT ?? 'scripts/out';

let failures = 0;
const check = (nom, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'OK   ' : 'ECHEC'} ${nom}${detail ? ` : ${detail}` : ''}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();


await page.goto(`${BASE}/#/seance`, { waitUntil: 'load' });

// Attendre que l'APP ait cree la base, voir check-description.mjs.
await page.waitForFunction(
  async () => {
    const bases = await indexedDB.databases();
    if (!bases.some((base) => base.name === 'gymtrack')) return false;
    const db = await new Promise((resolve) => {
      const request = indexedDB.open('gymtrack');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    if (!db) return false;
    const pret = db.objectStoreNames.contains('routines') && db.objectStoreNames.contains('exercises');
    db.close();
    return pret;
  },
  null,
  { timeout: 15000 },
);

await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('gymtrack');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const tx = db.transaction(['routines', 'exercises'], 'readwrite');
  const exercices = [
    { id: 'x-dc', name: 'Développé couché', muscleGroup: 'pectoraux', equipment: 'barre', isCustom: false },
    { id: 'x-ry', name: 'Rowng Yates', muscleGroup: 'biceps', equipment: 'halteres', isCustom: true },
  ];
  for (const e of exercices) {
    tx.objectStore('exercises').put({ ...e, defaultRestSec: 120, createdAt: 1, notes: 'Prise large' });
  }
  tx.objectStore('routines').put({
    id: 'r-test',
    name: 'PULL B',
    folderId: null,
    items: exercices.map((e, order) => ({
      id: `i-${order}`,
      exerciseId: e.id,
      sets: [{ id: `rs-${order}`, type: 'normale', targetWeightKg: 60, targetReps: 8 }],
      restSec: 120,
      supersetGroup: null,
      notes: '',
      order,
    })),
    createdAt: 1,
    updatedAt: 1,
    lastPerformedAt: null,
  });
  await new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
});

const dialogue = page.getByRole('dialog').first();

/** Ouvre la fiche, corrige le nom, et verifie titre de feuille et ecran dessous. */
const corriger = async (ou, ouvrir, ancien, nouveau, groupe, url) => {
  await ouvrir(ancien);
  await page.waitForTimeout(800);
  await dialogue.getByRole('button', { name: 'Modifier' }).click();
  await page.waitForTimeout(500);
  check(`${ou} : le nom est pre-rempli`, (await page.locator('#ex-name').inputValue()) === ancien);
  await page.locator('#ex-name').fill(nouveau);
  const feuille = page.getByLabel('Modifier l’exercice');
  await feuille.getByRole('button', { name: groupe, exact: true }).click();
  await feuille.getByRole('button', { name: 'Enregistrer' }).click();
  await page.waitForTimeout(800);

  const titre = (await dialogue.getByRole('heading').first().innerText()).trim();
  check(`${ou} : le titre de la feuille suit`, titre === nouveau, titre);
  check(
    `${ou} : la note est conservee`,
    (await page.getByLabel('Note sur cet exercice').inputValue()) === 'Prise large',
  );
  await page.screenshot({ path: `${OUT}/modifier-partout-${ou}.png` });

  await dialogue.getByRole('button', { name: 'Fermer' }).first().click();
  await page.waitForTimeout(800);
  check(`${ou} : on n'a pas quitte l'ecran`, page.url().endsWith(url), page.url());
  check(`${ou} : le nom suit dessous`, (await page.getByText(nouveau, { exact: true }).count()) > 0);
  check(`${ou} : l'ancien nom a disparu`, (await page.getByText(ancien, { exact: true }).count()) === 0);
};

// Vue d'ensemble d'une seance enregistree.
await page.goto(`${BASE}/#/routines/r-test`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await corriger(
  'vue-ensemble',
  (nom) => page.getByRole('button', { name: new RegExp(nom) }).click(),
  'Rowng Yates',
  'Rowing Yatess',
  'Dos',
  '#/routines/r-test',
);

// Le catalogue ne se corrige toujours pas, meme en feuille.
await page.getByRole('button', { name: /Développé couché/ }).click();
await page.waitForTimeout(800);
check('catalogue : pas de correction', (await dialogue.getByRole('button', { name: 'Modifier' }).count()) === 0);
await dialogue.getByRole('button', { name: 'Fermer' }).first().click();
await page.waitForTimeout(600);

// Editeur de seance.
await page.goto(`${BASE}/#/routines/r-test/modifier`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await corriger(
  'editeur',
  (nom) => page.getByRole('button', { name: nom, exact: true }).click(),
  'Rowing Yatess',
  'Rowing Yates',
  'Dos',
  '#/routines/r-test/modifier',
);

// Seance lancee.
await page.goto(`${BASE}/#/routines/r-test`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.getByRole('button', { name: 'Démarrer l’entraînement' }).click();
await page.waitForTimeout(1500);
const urlSeance = new URL(page.url()).hash;
await corriger(
  'seance-en-cours',
  (nom) => page.getByRole('button', { name: nom }).first().click(),
  'Rowing Yates',
  'Rowing Yates poulie',
  'Dos',
  urlSeance,
);

await browser.close();
console.log(failures === 0 ? '\nOK : tout passe.' : `\n${failures} echec(s).`);
process.exit(failures === 0 ? 0 : 1);
