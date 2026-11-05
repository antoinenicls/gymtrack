/**
 * Verifie l'insertion d'une serie au milieu, depuis le menu de la pastille.
 *
 * Le geste est teste en ENTIER : on chiffre trois series, on en valide deux, on
 * insere avant la troisieme, et on relit le tableau. Un bouton present dans le
 * DOM ne prouve rien tant que la ligne n'a pas atterri au bon rang.
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
await page.waitForTimeout(500);

await page.getByRole('button', { name: /Ajouter une série/ }).click();
await page.getByRole('button', { name: /Ajouter une série/ }).click();
await page.waitForTimeout(300);

// Trois series chiffrees, les deux premieres validees.
const poids = page.locator('input[aria-label^="Poids"]');
const reps = page.locator('input[aria-label^="Répétitions"]');
const charges = [
  [60, 10],
  [70, 8],
  [80, 6],
];
for (let i = 0; i < 3; i += 1) {
  await poids.nth(i).fill(String(charges[i][0]));
  await reps.nth(i).fill(String(charges[i][1]));
}
// Une serie validee change d'intitule : c'est donc toujours la premiere
// « Valider » restante qui correspond a la ligne suivante.
await page.locator('button[aria-label="Valider la série"]').nth(0).click();
await page.waitForTimeout(200);
await page.locator('button[aria-label="Valider la série"]').nth(0).click();
await page.waitForTimeout(300);

const avant = await page.locator('button[aria-label^="Série "]').count();
await page.screenshot({ path: `${OUT}/inserer-avant.png` });

await page.locator('button[aria-label^="Série 3"]').first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/inserer-menu.png` });

const bouton = page.getByRole('button', { name: /Insérer une série au-dessus/ });
const visible = await bouton.isVisible();
await bouton.click();
await page.waitForTimeout(500);

const apres = await page.locator('button[aria-label^="Série "]').count();
const valeurs = await poids.evaluateAll((els) => els.map((e) => e.value));
const coches = await page
  .locator('button[aria-label="Valider la série"], button[aria-label="Annuler la validation"]')
  .evaluateAll((els) => els.map((e) => e.getAttribute('aria-pressed')));
await page.screenshot({ path: `${OUT}/inserer-apres.png` });

// La ligne 3 est neuve et reprend 70, l'ancienne 3e (80) descend en 4.
const ok =
  visible &&
  apres === avant + 1 &&
  valeurs.join(',') === '60,70,70,80' &&
  coches.slice(0, 4).join(',') === 'true,true,false,false';

console.log(
  `series ${avant}->${apres} bouton=${visible} poids=[${valeurs}] coches=[${coches}] ${ok ? 'OK' : 'ECHEC'}`,
);

await browser.close();
process.exit(ok ? 0 : 1);
