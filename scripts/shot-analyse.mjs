/**
 * Rendu de l'ecran Analyse sur un historique fabrique.
 *
 * Douze semaines de seances, avec une progression et deux trous volontaires :
 * une page d'analyse ne se juge pas sur des donnees parfaites, ou toutes les
 * courbes montent et ou aucun cas limite n'apparait.
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

const seeded = await page.evaluate(async () => {
  const open = () =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open('gymtrack');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  const db = await open();

  const exercises = await new Promise((resolve, reject) => {
    const request = db.transaction('exercises').objectStore('exercises').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const pick = (name) => exercises.find((e) => e.name === name) ?? exercises[0];
  const plan = [
    { exercise: pick('Développé couché'), base: 80 },
    { exercise: pick('Squat barre'), base: 100 },
    { exercise: pick('Rowing barre'), base: 70 },
    { exercise: pick('Curl barre'), base: 30 },
  ];

  const DAY = 24 * 60 * 60 * 1000;
  const workouts = [];
  let counter = 0;

  for (let week = 11; week >= 0; week--) {
    // Deux semaines creuses, pour voir ce que la page raconte d'un trou.
    const sessions = week === 4 || week === 7 ? 1 : 3;
    for (let s = 0; s < sessions; s++) {
      const startedAt = Date.now() - week * 7 * DAY - s * 2 * DAY - 4 * 60 * 60 * 1000;
      const progress = (11 - week) * 1.25;

      workouts.push({
        id: `seed-${counter++}`,
        name: ['PUSH', 'PULL', 'LEGS'][s % 3],
        routineId: null,
        startedAt,
        endedAt: startedAt + 70 * 60 * 1000,
        durationSec: 70 * 60,
        notes: '',
        entries: plan.slice(s % 2, (s % 2) + 3).map((item, index) => ({
          id: `entry-${counter}-${index}`,
          exerciseId: item.exercise.id,
          supersetGroup: null,
          order: index,
          notes: '',
          restSec: 120,
          sets: [
            {
              id: `set-${counter}-${index}-w`,
              type: 'echauffement',
              weightKg: item.base * 0.5,
              reps: 10,
              rpe: null,
              done: true,
            },
            ...[0, 1, 2].map((n) => ({
              id: `set-${counter}-${index}-${n}`,
              type: 'normale',
              weightKg: Math.round((item.base + progress) * 2) / 2,
              reps: 8 - n,
              rpe: 7 + n * 0.5,
              done: true,
              completedAt: startedAt + n * 60000,
            })),
          ],
        })),
      });
    }
  }

  const tx = db.transaction('workouts', 'readwrite');
  for (const workout of workouts) tx.objectStore('workouts').put(workout);
  await new Promise((resolve) => {
    tx.oncomplete = resolve;
  });

  return workouts.length;
});

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.screenshot({ path: `${OUT}/analyse-haut.png`, clip: { x: 0, y: 0, width: 390, height: 844 } });

const main = page.locator('main');
await main.evaluate((element) => element.scrollTo(0, 900));
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/analyse-milieu.png` });

await main.evaluate((element) => element.scrollTo(0, 2000));
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/analyse-bas.png` });

await main.evaluate((element) => element.scrollTo(0, 0));
await page.getByRole('button', { name: 'Personnaliser l’analyse' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/analyse-personnalisation.png` });

// Aucune carte ne doit deborder horizontalement. On nomme le coupable : un
// booleen seul obligerait a re-instrumenter la page pour le retrouver.
const guilty = await page.evaluate(() => {
  // Un element pose DANS un defilement horizontal assume (le choix des
  // exercices) sort legitimement du cadre : ce n'est pas un debordement.
  const inScroller = (element) => {
    for (let node = element.parentElement; node; node = node.parentElement) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return true;
    }
    return false;
  };

  return [...document.querySelectorAll('main *')]
    .filter((element) => {
      const box = element.getBoundingClientRect();
      if (box.right <= window.innerWidth + 1 && box.left >= -1) return false;
      return !inScroller(element);
    })
    .slice(0, 8)
    .map((element) => `${element.tagName}.${String(element.className).slice(0, 60)}`);
});
const overflow = guilty.length > 0;
if (overflow) console.log('debordent :', guilty.join('\n            '));

const cards = await page.locator('section > h2.section-label').count();
console.log(`seances=${seeded} cartes=${cards} debordementHorizontal=${overflow}`);
console.log(!overflow && cards >= 6 ? 'OK' : 'ECHEC');

await browser.close();
process.exit(!overflow && cards >= 6 ? 0 : 1);
