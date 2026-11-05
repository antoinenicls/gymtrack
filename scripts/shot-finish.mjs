/** Verifie que « Terminer » ouvre bien le recapitulatif, bug reellement vecu. */
import { webkit, devices } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5177';
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/#/seance`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

await page.getByRole('button', { name: 'Démarrer une séance vide' }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Ajouter des exercices' }).click();
await page.waitForTimeout(500);
await page.locator('li button[aria-pressed]').first().click();
await page.getByRole('button', { name: /Ajouter 1 exercice/ }).click();
await page.waitForTimeout(500);

// Saisir puis valider une serie.
await page.getByLabel('Poids série 1').fill('100');
await page.getByLabel('Répétitions série 1').fill('8');
await page.getByRole('button', { name: 'Valider la série' }).first().click();
await page.waitForTimeout(500);

await page.getByRole('button', { name: 'Terminer' }).click();
await page.waitForTimeout(900);

const visible = await page.getByRole('dialog', { name: 'Séance terminée' }).isVisible().catch(() => false);
console.log('recapitulatif affiche :', visible);
await page.screenshot({ path: 'scripts/out/finish.png' });
await browser.close();
process.exit(visible ? 0 : 1);
