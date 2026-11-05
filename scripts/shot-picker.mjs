/**
 * Verifie que le pied de page des feuilles modales reste atteignable.
 *
 * Teste sur WebKit ET Chromium. Le bug d'origine ne se voyait QUE sur
 * Safari iOS : un element fixe s'y cale sur le viewport de mise en page,
 * plus haut que le viewport visible sur lequel l'app est dimensionnee. Un
 * test sur Chromium de bureau passait au vert sans rien prouver.
 */

import { chromium, devices, webkit } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';
const OUT = process.env.OUT ?? 'scripts/out';

let failures = 0;

for (const [label, engine] of [
  ['webkit', webkit],
  ['chromium', chromium],
]) {
  const browser = await engine.launch();
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    // Playwright force parfois le moteur ; on garde la taille d'ecran reelle.
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/#/routines/nouvelle`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  await page.getByRole('button', { name: 'Ajouter des exercices' }).click();
  await page.waitForTimeout(500);

  const options = page.locator('li button[aria-pressed]');
  const count = Math.min(4, await options.count());
  for (let i = 0; i < count; i++) await options.nth(i).click();
  await page.waitForTimeout(300);

  const confirm = page.getByRole('button', { name: /Ajouter \d+ exercices?/ });
  const box = await confirm.boundingBox();

  // Hauteur reellement visible, telle que l'app la calcule.
  const visibleHeight = await page.evaluate(
    () => window.visualViewport?.height ?? window.innerHeight,
  );

  const bottom = box ? box.y + box.height : Infinity;
  const inside = bottom <= visibleHeight + 1;

  // La barre d'onglets ne doit pas recouvrir le bouton.
  const navTop = await page.evaluate(() => {
    const nav = document.querySelector('nav');
    return nav ? nav.getBoundingClientRect().top : Number.POSITIVE_INFINITY;
  });
  const overlappedByNav = box ? box.y + box.height > navTop && box.y < navTop : false;

  // Test de collision : quel element se trouve REELLEMENT au centre du
  // bouton ? C'est la seule preuve que la barre d'onglets ne passe pas devant.
  const hit = box
    ? await page.evaluate(
        ([x, y]) => {
          const el = document.elementFromPoint(x, y);
          if (!el) return 'rien';
          return el.closest('nav') ? 'NAV (masque le bouton)' : (el.textContent ?? '').trim().slice(0, 30);
        },
        [box.x + box.width / 2, box.y + box.height / 2],
      )
    : 'introuvable';

  let clickable = false;
  try {
    await confirm.click({ timeout: 3000 });
    clickable = true;
  } catch {
    clickable = false;
  }

  await page.screenshot({ path: `${OUT}/picker-${label}.png` });

  const ok = inside && clickable && !String(hit).startsWith('NAV');
  if (!ok) failures++;

  console.log(
    `${label.padEnd(9)} bas=${Math.round(bottom)} visible=${Math.round(visibleHeight)} ` +
      `dansEcran=${inside} chevauchementNav=${overlappedByNav} auCentre="${hit}" clic=${clickable} ${ok ? 'OK' : 'ECHEC'}`,
  );

  await browser.close();
}

process.exit(failures > 0 ? 1 : 0);
