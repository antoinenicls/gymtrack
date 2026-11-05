/**
 * Verifie qu'un exercice cree se corrige apres coup.
 *
 * Scenario : on cree un mouvement avec une faute dans le nom, rangé dans le
 * mauvais groupe et avec le mauvais materiel, on lui met une note, puis on le
 * corrige depuis sa fiche. Le nom, le groupe et le materiel doivent changer et
 * survivre a un rechargement, la note doit rester intacte, et un exercice du
 * catalogue ne doit PAS proposer la correction.
 *
 * A lancer avec un serveur :
 *   npx vite --port 5178
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5178';
const OUT = process.env.OUT ?? 'scripts/out';
const NOTE = 'Siège au cran 4';

let failures = 0;
const check = (nom, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'OK   ' : 'ECHEC'} ${nom}${detail ? ` : ${detail}` : ''}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();


await page.goto(`${BASE}/#/exercices`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

// Creation avec les erreurs d'une saisie faite trop vite.
await page.getByLabel('Rechercher un exercice').locator('xpath=../..').getByRole('button').last().click();
await page.waitForTimeout(500);
await page.locator('#ex-name').fill('Rowng Yates');
await page.getByRole('button', { name: 'Biceps', exact: true }).click();
await page.getByRole('button', { name: 'halteres', exact: true }).click();
await page.getByRole('button', { name: 'Créer l’exercice' }).click();
await page.waitForTimeout(800);

await page.getByLabel('Rechercher un exercice').fill('Rowng');
await page.waitForTimeout(400);
await page.getByRole('link', { name: /Rowng Yates/ }).click();
await page.waitForTimeout(900);

const champ = page.getByLabel('Note sur cet exercice');
await champ.fill(NOTE);
await champ.blur();
await page.waitForTimeout(400);

// Correction depuis la fiche.
await page.getByRole('button', { name: 'Modifier' }).click();
await page.waitForTimeout(500);
check('le nom est pre-rempli', (await page.locator('#ex-name').inputValue()) === 'Rowng Yates');
check('la note n’est pas dupliquee dans la feuille', (await page.locator('#ex-note').count()) === 0);
await page.screenshot({ path: `${OUT}/modifier-1-feuille.png` });

await page.locator('#ex-name').fill('Rowing Yates');
await page.getByRole('button', { name: 'Dos', exact: true }).click();
await page.getByRole('button', { name: 'barre', exact: true }).click();
await page.getByRole('button', { name: 'Enregistrer' }).click();
await page.waitForTimeout(800);

const lire = async () => ({
  titre: (await page.locator('h1').first().innerText()).trim(),
  ligne: (await page.locator('header p').first().innerText()).trim(),
  note: await page.getByLabel('Note sur cet exercice').inputValue(),
});

let fiche = await lire();
check('le titre suit la correction', fiche.titre === 'Rowing Yates', fiche.titre);
check('groupe et materiel corriges', fiche.ligne === 'Dos · barre', fiche.ligne);
check('la note est conservee', fiche.note === NOTE, fiche.note);
await page.screenshot({ path: `${OUT}/modifier-2-fiche.png` });

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
fiche = await lire();
check('la correction survit au rechargement', fiche.titre === 'Rowing Yates' && fiche.ligne === 'Dos · barre', `${fiche.titre} / ${fiche.ligne}`);
check('la note survit au rechargement', fiche.note === NOTE, fiche.note);

// Un mouvement du catalogue ne se corrige pas.
await page.goto(`${BASE}/#/exercices`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.getByLabel('Rechercher un exercice').fill('Développé couché');
await page.waitForTimeout(400);
await page.getByRole('link', { name: /Développé couché/ }).first().click();
await page.waitForTimeout(900);
check('pas de correction sur le catalogue', (await page.getByRole('button', { name: 'Modifier' }).count()) === 0);

await browser.close();
console.log(failures === 0 ? '\nOK : tout passe.' : `\n${failures} echec(s).`);
process.exit(failures === 0 ? 0 : 1);
