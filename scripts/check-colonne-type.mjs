/**
 * La colonne « Type » de l'editeur de routine doit se lire en entier.
 *
 * Elle etait tronquee : « Dégressive · à l… », c'est-a-dire que le seul mot
 * qui distinguait une descente d'une descente menee a l'echec etait celui qui
 * sautait. On verifie donc qu'aucun libelle n'est rogne, aux largeurs les plus
 * etroites et avec la colonne RPE affichee, qui est le cas le plus serre.
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';
const OUT = process.env.OUT ?? 'scripts/out';
const WIDTHS = [320, 360, 390];

const ROUTINE = {
  id: 'routine-types',
  name: 'Tous les types',
  folderId: null,
  items: [
    {
      id: 'item-1',
      exerciseId: 'developpe-couche',
      sets: [
        { id: 's1', type: 'echauffement', targetWeightKg: 40, targetReps: 0, targetRpe: null },
        { id: 's2', type: 'normale', targetWeightKg: 100, targetReps: 8, targetRpe: null },
        { id: 's3', type: 'echec', targetWeightKg: 100, targetReps: 6, targetRpe: null },
        {
          id: 's4',
          type: 'drop',
          targetWeightKg: 90,
          targetReps: 8,
          targetRpe: null,
          dropStart: true,
          toFailure: true,
        },
        { id: 's5', type: 'drop', targetWeightKg: 70, targetReps: 8, targetRpe: null },
        { id: 's6', type: 'myo', targetWeightKg: 60, targetReps: 12, targetRpe: null },
      ],
      restSec: 120,
      supersetGroup: null,
      notes: '',
      order: 0,
    },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastPerformedAt: null,
};

let failures = 0;
const browser = await chromium.launch();

for (const width of WIDTHS) {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width, height: 900 },
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'onLine', { get: () => false });
  });

  await page.goto(`${BASE}/#/seances`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  await page.evaluate(async (routine) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('gymtrack');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(['routines', 'settings'], 'readwrite');
    tx.objectStore('routines').put(routine);
    // Colonne RPE affichee : c'est la grille la plus serree.
    tx.objectStore('settings').put({ id: 'settings', showRpe: true });
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
  }, ROUTINE);

  await page.goto(`${BASE}/#/routines/routine-types/modifier`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  await page.screenshot({ path: `${OUT}/colonne-type-${width}.png` });

  // Un libelle rogne se voit a son scrollWidth, plus large que la place qu'il
  // occupe reellement.
  const { labels, clipped } = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('p')].filter((p) =>
      ['Normale', 'Échauffement', 'Dégressive', 'À l’échec', 'Myo-reps', 'à l’échec'].includes(
        p.textContent?.trim() ?? '',
      ),
    );
    return {
      labels: cells.map((p) => p.textContent?.trim()),
      clipped: cells
        .filter((p) => p.scrollWidth > p.clientWidth + 1)
        .map((p) => p.textContent?.trim()),
    };
  });

  // Les paliers d'une degressive n'ecrivent plus leur type : c'est l'entete du
  // cadre qui l'annonce, une fois pour la descente entiere.
  const entete = (await page.locator('text=/DÉGRESSIVE.*PALIERS.*ÉCHEC/i').count()) > 0;

  const ok = labels.length === 4 && clipped.length === 0 && entete;
  if (!ok) failures++;
  console.log(
    `${String(width).padEnd(4)} libelles=[${labels.join(', ')}] rognes=[${clipped.join(
      ', ',
    )}] entete=${entete} ${ok ? 'OK' : 'ECHEC'}`,
  );

  await context.close();
}

await browser.close();
process.exit(failures > 0 ? 1 : 0);
