/**
 * Capture le reglage d'enseigne et la bibliotheque d'exercices avec la
 * pastille de disponibilite, pour verifier le rendu reel plutot que de
 * supposer que le JSX est bon.
 */
import { webkit, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';
const browser = await webkit.launch();
const ctx = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 },
});

const page = await ctx.newPage();

// Reglages : on choisit une enseigne.
await page.goto(`${BASE}/#/profil/reglages`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'Fitness Park' }).click();
await page.waitForTimeout(400);
await page.getByText('Enseigne').scrollIntoViewIfNeeded();
await page.screenshot({ path: 'scripts/out/gym-reglages.png' });

// Bibliotheque : la pastille doit apparaitre sur les mouvements confirmes,
// et rien du tout sur les non releves (hack squat, rowing t-bar).
await page.goto(`${BASE}/#/exercices`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'scripts/out/gym-exercices.png' });

await page.getByLabel('Rechercher un exercice').fill('squat');
await page.waitForTimeout(500);
await page.screenshot({ path: 'scripts/out/gym-squat.png' });

console.log('captures ok');
await browser.close();
