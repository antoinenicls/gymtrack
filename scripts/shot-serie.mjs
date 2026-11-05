/**
 * Verifie le menu d'une serie : ouverture depuis la pastille, et suppression.
 *
 * La suppression se joue au CLIC reel et non sur la seule presence du bouton :
 * le geste precedent (glissement) etait, lui aussi, parfaitement present dans
 * le DOM, et c'est de l'atteindre qui posait probleme.
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

// Trois series, pour que la suppression ait quelque chose a retirer.
await page.getByRole('button', { name: /Ajouter une série/ }).click();
await page.getByRole('button', { name: /Ajouter une série/ }).click();
await page.waitForTimeout(300);

const rowsBefore = await page.locator('button[aria-label^="Série "]').count();

await page.locator('button[aria-label^="Série 2"]').first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/serie-menu.png` });

const deleteButton = page.getByRole('button', { name: 'Supprimer la série' });
const visible = await deleteButton.isVisible();
await deleteButton.click();
await page.waitForTimeout(500);

const rowsAfter = await page.locator('button[aria-label^="Série "]').count();
await page.screenshot({ path: `${OUT}/serie-apres.png` });

const ok = visible && rowsAfter === rowsBefore - 1;
console.log(
  `series avant=${rowsBefore} apres=${rowsAfter} boutonVisible=${visible} ${ok ? 'OK' : 'ECHEC'}`,
);

await browser.close();
process.exit(ok ? 0 : 1);
