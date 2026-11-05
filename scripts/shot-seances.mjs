/**
 * Mesure la barre d'actions de l'onglet Seance a plusieurs largeurs.
 *
 * Le bug d'origine ne se voyait qu'a l'oeil : les trois actions tenaient dans
 * l'ecran, mais leur arrangement etait laid a toutes les largeurs. Elles se
 * reduisent maintenant a « Créer » plus un menu, poses sur la ligne du titre.
 *
 * On verifie donc que titre et actions tiennent bien sur UNE ligne, et que
 * rien ne touche le bord. Une simple mesure de debordement ne dirait pas si la
 * ligne s'est cassee en deux, qui est precisement ce qu'on veut eviter.
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';
const OUT = process.env.OUT ?? 'scripts/out';
const WIDTHS = [320, 360, 390, 430];

let failures = 0;

const browser = await chromium.launch();

for (const width of WIDTHS) {
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width, height: 844 } });
  const page = await context.newPage();


  await page.goto(`${BASE}/#/seance`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  // Une seance enregistree, sinon la troisieme action ne s'affiche pas et on
  // mesurerait precisement le cas qui ne pose pas de probleme.
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('gymtrack');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction('routines', 'readwrite');
    tx.objectStore('routines').put({
      id: 'routine-mesure',
      name: 'PUSH',
      folderId: null,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastPerformedAt: null,
    });
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
  });

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const titre = page.getByRole('heading', { name: 'Mes séances' });
  const creer = page.getByRole('button', { name: 'Créer', exact: true });
  const menu = page.getByRole('button', { name: 'Autres actions sur mes séances' });

  const boxes = [
    await titre.boundingBox(),
    await creer.boundingBox(),
    await menu.boundingBox(),
  ];

  await page.screenshot({ path: `${OUT}/seances-${width}.png`, clip: { x: 0, y: 0, width, height: 420 } });

  const missing = boxes.some((box) => box === null);
  const right = missing ? Infinity : Math.max(...boxes.map((box) => box.x + box.width));
  const inside = right <= width - 15;

  // Titre et actions doivent partager une SEULE ligne : c'est tout l'interet
  // d'avoir reduit les trois actions a une seule plus un menu.
  const sameRow =
    !missing && Math.abs((boxes[0]?.y ?? 0) - (boxes[1]?.y ?? 0)) < (boxes[1]?.height ?? 0);

  const truncated = await page.evaluate(() =>
    [...document.querySelectorAll('button')].some(
      (button) => button.scrollWidth > button.clientWidth + 1,
    ),
  );

  // Les deux actions doivent rester atteignables au pouce.
  const tallEnough = boxes.slice(1).every((box) => (box?.height ?? 0) >= 36);

  const ok = !missing && inside && sameRow && !truncated && tallEnough;
  if (!ok) failures++;

  console.log(
    `${String(width).padEnd(4)} bordDroit=${Math.round(right)} dansEcran=${inside} ` +
      `memeLigne=${sameRow} rogne=${truncated} hauteurOk=${tallEnough} ${ok ? 'OK' : 'ECHEC'}`,
  );

  await context.close();
}

await browser.close();
process.exit(failures > 0 ? 1 : 0);
