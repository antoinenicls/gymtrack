/**
 * Verifie le libelle « dernière fois » sur la liste des seances et sur la fiche.
 *
 * Cinq routines datees a des distances differentes couvrent les quatre phrases
 * possibles plus le repli sur la date. On relit le texte REELLEMENT affiche :
 * la fonction est deja testee a l'unite, ce qui reste a prouver est qu'elle est
 * branchee des deux cotes et que la ligne ne se casse pas.
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

const attendus = [
  ['Ce matin', 'il y a 3 heures'],
  ['Hier soir', 'hier'],
  ['Avant-hier', 'il y a 2 jours'],
  ['La semaine derniere', null],
  ['Jamais lancee', ''],
];

await page.evaluate(async () => {
  const heure = 3600_000;
  const jour = 24 * heure;
  const minuit = new Date();
  minuit.setHours(0, 0, 0, 0);

  const quand = [
    Date.now() - 3 * heure,
    minuit.getTime() - 4 * heure, // hier en fin de soiree
    minuit.getTime() - jour - 4 * heure,
    Date.now() - 12 * jour,
    null,
  ];

  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('gymtrack');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const tx = db.transaction('routines', 'readwrite');
  const noms = ['Ce matin', 'Hier soir', 'Avant-hier', 'La semaine derniere', 'Jamais lancee'];
  noms.forEach((name, i) => {
    tx.objectStore('routines').put({
      id: `routine-${i}`,
      name,
      folderId: null,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastPerformedAt: quand[i],
    });
  });
  await new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
});

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/derniere-fois-liste.png` });

let failures = 0;

for (const [nom, phrase] of attendus) {
  const ligne = await page
    .locator('li', { hasText: nom })
    .first()
    .innerText();
  const compact = ligne.replace(/\s+/g, ' ');

  // Sans date connue, la ligne s'arrete au compte d'exercices.
  const ok =
    phrase === null
      ? / · fait le \d{2}\/\d{2}\/\d{4}/.test(compact)
      : phrase === ''
        ? !compact.includes('fait')
        : compact.includes(` · fait ${phrase}`);

  if (!ok) failures++;
  console.log(`liste ${nom.padEnd(20)} « ${compact} » ${ok ? 'OK' : 'ECHEC'}`);
}

// Fiche de la routine la plus recente : meme information, phrase complete.
await page.getByRole('button', { name: /Ce matin/ }).first().click();
await page.waitForTimeout(600);
const entete = await page.locator('header p').first().innerText();
await page.screenshot({ path: `${OUT}/derniere-fois-fiche.png` });

const ficheOk = entete.trim() === 'Dernière fois il y a 3 heures';
if (!ficheOk) failures++;
console.log(`fiche « ${entete.trim()} » ${ficheOk ? 'OK' : 'ECHEC'}`);

await browser.close();
process.exit(failures > 0 ? 1 : 0);
