/**
 * Verifie que la vue d'une seance enregistree, avant lancement, ouvre la fiche
 * de l'exercice qu'on y touche.
 *
 * Scenario : une routine de deux mouvements, on ouvre sa vue d'ensemble, on
 * touche le SECOND. La fiche qui s'ouvre doit etre la sienne, par-dessus
 * l'ecran, et la refermer doit ramener sur la seance, toujours non lancee.
 *
 * A lancer avec un serveur :
 *   npx vite build && npx vite preview --port 4177
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:4177';
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
    { id: 'x-dc', name: 'Développé couché', muscleGroup: 'pectoraux', equipment: 'barre' },
    { id: 'x-ry', name: 'Rowing Yates', muscleGroup: 'dos', equipment: 'barre', notes: 'Prise large' },
  ];
  for (const e of exercices) {
    tx.objectStore('exercises').put({ ...e, defaultRestSec: 120, isCustom: true, createdAt: 1 });
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

await page.goto(`${BASE}/#/routines/r-test`, { waitUntil: 'load' });
await page.waitForTimeout(1500);

await page.getByRole('button', { name: /Rowing Yates/ }).click();
await page.waitForTimeout(800);

const dialogue = page.getByRole('dialog');
const titre = await dialogue.getByRole('heading').first().innerText().catch(() => '');
check('la fiche du mouvement touche s’ouvre', titre.includes('Rowing Yates'), titre);
check(
  'avec sa note',
  (await page.getByLabel('Note sur cet exercice').inputValue().catch(() => '')) === 'Prise large',
);
await page.screenshot({ path: `${OUT}/fiche-depuis-seance.png` });

await page.keyboard.press('Escape');
await page.waitForTimeout(800);
check('refermee, on est toujours sur la seance', page.url().endsWith('#/routines/r-test'), page.url());
check(
  'et elle n’a pas ete lancee',
  (await page.getByRole('button', { name: 'Démarrer l’entraînement' }).count()) === 1,
);

await browser.close();
console.log(failures === 0 ? '\nOK : tout passe.' : `\n${failures} echec(s).`);
process.exit(failures === 0 ? 0 : 1);
