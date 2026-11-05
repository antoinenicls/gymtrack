/**
 * Verifie que la note d'un exercice se met a jour DANS la seance en cours.
 *
 * Scenario reproduit, celui qui ne marchait pas : seance lancee, on tape le nom
 * du mouvement pour ouvrir sa fiche, on y ecrit la note de reglage, on referme.
 * Le bandeau de note du bloc doit afficher le nouveau texte sur-le-champ, sans
 * avoir a sortir de la seance.
 *
 * A lancer avec un serveur :
 *   npx vite --port 5178
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5178';
const OUT = process.env.OUT ?? 'scripts/out';
const NOTE = 'Siège au cran 4, prise serrée';

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();


await page.goto(`${BASE}/#/seance`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

await page.getByRole('button', { name: 'Démarrer une séance vide' }).click();
await page.waitForTimeout(600);

await page.getByRole('button', { name: /Ajouter des exercices/ }).click();
await page.waitForTimeout(700);
await page.locator('li button[aria-pressed]').first().click();
await page.getByRole('button', { name: /Ajouter \d+ exercices?/ }).click();
await page.waitForTimeout(800);

const nom = await page.locator('article h3').first().innerText();
console.log(`exercice de la seance : ${nom}`);

/** Texte de la note du MOUVEMENT affichee dans le bloc, ou null. */
const noteAffichee = () =>
  page.evaluate(() => {
    const bloc = document.querySelector('article');
    const ligne = bloc?.querySelector('p.text-ink-2 span');
    return ligne ? ligne.textContent.trim() : null;
  });

console.log('note affichee avant :', await noteAffichee());
await page.screenshot({ path: `${OUT}/note-live-1-avant.png` });

// On ouvre la fiche en tapant le nom, comme en salle.
await page.locator('article h3').first().click();
await page.waitForTimeout(900);

const champ = page.getByLabel('Note sur cet exercice');
await champ.fill(NOTE);
// La note s'enregistre a la sortie du champ.
await champ.blur();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/note-live-2-fiche.png` });

// Fermeture de la feuille par le fond, comme au pouce.
await page.keyboard.press('Escape');
await page.waitForTimeout(900);

const apres = await noteAffichee();
console.log('note affichee apres  :', apres);
await page.screenshot({ path: `${OUT}/note-live-3-apres.png` });

await browser.close();

if (apres === NOTE) {
  console.log('\nOK : la note apparait dans la seance en cours.');
  process.exit(0);
}
console.log(`\nECHEC : le bloc affiche « ${apres} » au lieu de « ${NOTE} ».`);
process.exit(1);
