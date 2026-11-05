/**
 * Partage de seances : selection de deux seances, feuille « Partager », envoi.
 *
 * Sans feuille de partage native (Chromium de bureau), l'envoi doit retomber
 * sur un telechargement, et le fichier doit etre un programme relisible.
 *
 * A lancer avec un serveur :
 *   npx vite --port 5177
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';
const OUT = process.env.OUT ?? 'scripts/out';

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`${BASE}/#/seance`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('gymtrack');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const exercises = await new Promise((resolve) => {
    const r = db.transaction('exercises').objectStore('exercises').getAll();
    r.onsuccess = () => resolve(r.result);
  });
  const tx = db.transaction('routines', 'readwrite');
  for (const [id, name] of [['r-push', 'PUSH'], ['r-pull', 'PULL']]) {
    tx.objectStore('routines').put({
      id, name, folderId: null, createdAt: Date.now(), updatedAt: Date.now(), lastPerformedAt: null,
      items: [{
        id: `${id}-1`, exerciseId: exercises[0].id, order: 0, restSec: 120, supersetGroup: null, notes: '',
        sets: [{ type: 'normal', targetWeightKg: 60, targetReps: 8, targetRpe: null }],
      }],
    });
  }
  await new Promise((resolve) => { tx.oncomplete = resolve; });
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);

await page.getByRole('button', { name: 'Autres actions sur mes séances' }).click();
await page.getByRole('button', { name: /Partager des séances/ }).click();
await page.getByText('PUSH', { exact: true }).click();
await page.getByText('PULL', { exact: true }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/partage-selection.png` });

await page.getByRole('button', { name: 'Partager', exact: true }).click();
await page.waitForTimeout(500);
await page.getByLabel('Nom du programme').fill('Push Pull');
await page.screenshot({ path: `${OUT}/partage-feuille.png` });

const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'Envoyer' }).click(),
]);
const path = await download.path();
const { readFile } = await import('node:fs/promises');
const program = JSON.parse(await readFile(path, 'utf8'));
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/partage-envoye.png` });

const ok =
  download.suggestedFilename() === 'push-pull.gymtrack.json' &&
  program.format === 'gymtrack.program' &&
  program.routines.length === 2 &&
  program.exercises.length === 1 &&
  errors.length === 0;

console.log(`fichier=${download.suggestedFilename()} seances=${program.routines.length} erreurs=${errors.length} ${ok ? 'OK' : 'ECHEC'}`);
await browser.close();
process.exit(ok ? 0 : 1);
