/**
 * Un chrono de repos ne compte JAMAIS a l'envers.
 *
 * Le defaut observe : mis en pause a 1:26 puis relance, il affichait 1:31
 * pendant un quart de seconde avant de retomber a 1:25. Le sursaut valait
 * exactement la duree de la pause, parce que l'horloge d'affichage restait
 * figee sur l'instant de la mise en pause pendant tout l'arret.
 *
 * On echantillonne donc l'affichage aussitot apres la reprise : aucune valeur
 * ne doit depasser celle qui etait figee pendant la pause.
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';
const OUT = process.env.OUT ?? 'scripts/out';

/** « 1:26 » vers 86 secondes. */
const toSeconds = (texte) => {
  const [m, s] = texte.trim().split(':');
  return Number(m) * 60 + Number(s);
};

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

await page.locator('input[aria-label^="Poids série 1"]').fill('60');
await page.locator('input[aria-label^="Répétitions série 1"]').fill('5');
await page.getByRole('button', { name: 'Valider la série' }).first().click();
await page.waitForTimeout(700);

const chrono = page.locator('button[aria-label*="repos"]').first();
const lire = async () => (await chrono.innerText()).match(/\d+:\d\d/)?.[0] ?? '';

/**
 * Deux moments de pause, et les deux comptent.
 *
 * Tot, la valeur figee vaut encore le total du repos. Tard, elle est nettement
 * en dessous : le sursaut y passe alors sous le plafond de la duree totale, et
 * seul le recalage de l'horloge d'affichage peut l'eviter.
 */
let failures = 0;

for (const avantPause of [0, 6000]) {
  await page.waitForTimeout(avantPause);

  await page.getByRole('button', { name: 'Mettre le repos en pause' }).click();
  await page.waitForTimeout(400);
  const fige = await lire();
  await page.screenshot({ path: `${OUT}/repos-pause.png` });

  // Pause de cinq secondes, comme dans le cas signale.
  await page.waitForTimeout(5000);
  const pendant = await lire();

  await page.getByRole('button', { name: 'Reprendre le repos' }).click();

  // Echantillonnage serre juste apres la reprise : le sursaut ne durait qu'un
  // quart de seconde, un simple waitForTimeout serait passe a cote.
  const releves = [];
  const fin = Date.now() + 600;
  while (Date.now() < fin) {
    releves.push(await lire());
  }
  const uniques = [...new Set(releves)];
  const sursauts = uniques.filter((v) => toSeconds(v) > toSeconds(fige));

  const ok = fige === pendant && sursauts.length === 0;
  if (!ok) failures++;
  console.log(
    `pause a +${avantPause / 1000}s : fige=${fige} apres5s=${pendant} ` +
      `releves=[${uniques.join(', ')}] sursauts=[${sursauts.join(', ')}] ${ok ? 'OK' : 'ECHEC'}`,
  );
}

await browser.close();
process.exit(failures > 0 ? 1 : 0);
