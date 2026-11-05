/**
 * Verifie deux choses a l'ecran, dans une seance reelle :
 *  - la barre de repos annonce la duree de depart a cote du temps restant ;
 *  - un record se met a jour quand on corrige les reps APRES avoir coche.
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

await page.getByRole('button', { name: 'Démarrer une séance vide' }).click();
await page.waitForTimeout(500);

await page.getByRole('button', { name: /Ajouter des exercices/ }).click();
await page.waitForTimeout(500);
await page.locator('li button[aria-pressed]').first().click();
await page.getByRole('button', { name: /Ajouter \d+ exercices?/ }).click();
await page.waitForTimeout(600);

await page.getByRole('button', { name: /Ajouter une série/ }).click();
await page.waitForTimeout(300);

// Premiere serie : 100 kg x 5, record du jour puisque l'historique est vide.
await page.locator('input[aria-label^="Poids série 1"]').fill('100');
await page.locator('input[aria-label^="Répétitions série 1"]').fill('5');
await page.getByRole('button', { name: 'Valider la série' }).first().click();
await page.waitForTimeout(600);

// Le chrono tourne : la barre doit montrer « restant / total ».
const barre = (await page.locator('button[aria-label*="repos"]').first().innerText()).replace(
  /\s+/g,
  ' ',
);
await page.screenshot({ path: `${OUT}/repos-total.png` });

const badges = () => page.locator('span.animate-pr-pop').count();

// Deuxieme serie cochee sous le record : aucun badge.
const poidsDeux = page.locator('input[aria-label^="Poids série 2"]');
await poidsDeux.fill('95');
await page.locator('input[aria-label^="Répétitions série 2"]').fill('5');
await page.getByRole('button', { name: 'Valider la série' }).first().click();
await page.waitForTimeout(600);
const avant = await badges();

// Le geste reel : on corrige la charge APRES avoir coche. C'etait 105.
await poidsDeux.fill('105');
await page.waitForTimeout(600);
const apres = await badges();
await page.screenshot({ path: `${OUT}/pr-apres-correction.png` });

// Puis retour en arriere : le badge doit repartir.
await poidsDeux.fill('95');
await page.waitForTimeout(600);
const retour = await badges();

const okBarre = / \/ \d+:\d\d/.test(barre);
const okPr = apres > avant && retour < apres;
console.log(`barre="${barre}" (${okBarre ? 'OK' : 'ECHEC'})`);
console.log(`badges avant=${avant} apres=${apres} retour=${retour} (${okPr ? 'OK' : 'ECHEC'})`);

await browser.close();
process.exit(okBarre && okPr ? 0 : 1);
