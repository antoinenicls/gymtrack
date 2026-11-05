/**
 * Mode programme de l'ecran Analyse.
 *
 * On range trois routines dans un dossier, on compose la semaine type depuis
 * l'ecran (le dossier entier, puis Push une seconde fois), et on verifie que
 * l'analyse porte bien sur CETTE semaine : quatre seances, les seules cartes
 * qui ont un sens sur un programme, et les pectoraux comptes deux fois.
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

await page.goto(`${BASE}/#/analyse`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('gymtrack');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const exercises = await new Promise((resolve, reject) => {
    const request = db.transaction('exercises').objectStore('exercises').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const pick = (name) => exercises.find((e) => e.name === name) ?? exercises[0];

  let n = 0;
  const sets = (count, reps, warmup = false) => [
    ...(warmup
      ? [{ id: `s${n++}`, type: 'echauffement', targetWeightKg: 40, targetReps: 10, targetRpe: null }]
      : []),
    ...Array.from({ length: count }, () => ({
      id: `s${n++}`,
      type: 'normale',
      targetWeightKg: null,
      targetReps: reps,
      targetRpe: null,
    })),
  ];
  const item = (name, s, order) => ({
    id: `i${n++}`,
    exerciseId: pick(name).id,
    sets: s,
    restSec: 120,
    supersetGroup: null,
    notes: '',
    order,
  });
  const routine = (id, name, items, order) => ({
    id,
    name,
    folderId: 'f-ppl',
    order,
    items,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastPerformedAt: null,
  });

  const tx = db.transaction(['routines', 'routineFolders'], 'readwrite');
  tx.objectStore('routineFolders').put({ id: 'f-ppl', name: 'PPL', order: 0, createdAt: Date.now() });
  tx.objectStore('routines').put(
    routine('r-push', 'Push', [item('Développé couché', sets(4, 8, true), 0)], 0),
  );
  tx.objectStore('routines').put(
    routine(
      'r-pull',
      'Pull',
      [item('Rowing barre', sets(4, 10), 0), item('Curl barre', sets(3, 12), 1)],
      1,
    ),
  );
  tx.objectStore('routines').put(
    routine('r-legs', 'Legs', [item('Squat barre', [...sets(3, 6), ...sets(1, null)], 0)], 2),
  );
  await new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
});

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await page.getByRole('button', { name: 'Programme', exact: true }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/programme-vide.png` });

await page.getByRole('button', { name: 'Choisir mes séances' }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Choisir ce dossier' }).click();
await page.getByRole('button', { name: 'Une fois de plus par semaine : Push' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/programme-feuille.png` });

const footer = await page.getByRole('button', { name: /^Analyser/ }).textContent();
await page.getByRole('button', { name: /^Analyser/ }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/programme-haut.png` });

const main = page.locator('main');
await main.evaluate((element) => element.scrollTo(0, 900));
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/programme-bas.png` });

const titles = await page.locator('section > h2.section-label').allTextContents();
const text = await main.textContent();

// Le reglage doit survivre a un rechargement : on revient sur le meme ecran.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const kept = await page.getByText('4 séances par semaine').count();

const checks = {
  footer: footer?.includes('4 séances'),
  cartes: titles.join('|') === 'Séries par groupe musculaire|Respect des normes|Répartition des séries',
  rythme: text.includes('Ton programme compte 4 séances par semaine'),
  pectoraux: text.includes('8,0 /sem'),
  sansCible: text.includes('1 série sans répétitions visées'),
  conserve: kept > 0,
};
console.log(titles, checks);

const ok = Object.values(checks).every(Boolean);
console.log(ok ? 'OK' : 'ECHEC');
await browser.close();
process.exit(ok ? 0 : 1);
