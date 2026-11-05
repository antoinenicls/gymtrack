/**
 * Verifie qu'une seance en cours peut se replier, se consulter ailleurs, puis
 * se rouvrir intacte.
 *
 * Le parcours est teste en ENTIER, parce que c'est le tout du geste : on ouvre
 * une seance, on chiffre une serie, on replie, on va lire une seance
 * enregistree sur un autre ecran, on revient par la barre du bas, et on relit
 * ce qui avait ete saisi. Une barre presente dans le DOM ne prouve rien tant
 * que la seance n'est pas revenue avec ses chiffres.
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';
const OUT = process.env.OUT ?? 'scripts/out';

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['iPhone 13'],
  // 320 px de large : le plus etroit encore en service. C'est la largeur ou
  // l'en-tete de seance, qui gagne un quatrieme element, risque de deborder.
  viewport: { width: 320, height: 720 },
});
const page = await context.newPage();

await page.addInitScript(() => {
  Object.defineProperty(navigator, 'onLine', { get: () => false });
});

await page.goto(`${BASE}/#/seance`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

/* Une seance enregistree, pour avoir quelque chose a consulter pendant que
   l'entrainement tourne. */
await page.getByRole('button', { name: 'Créer' }).click();
await page.waitForTimeout(600);
await page.getByRole('textbox', { name: /Nom de la séance/i }).fill('Jour de jambes');
await page.getByRole('button', { name: /Ajouter des exercices/ }).click();
await page.waitForTimeout(500);
await page.locator('li button[aria-pressed]').first().click();
await page.getByRole('button', { name: /Ajouter \d+ exercices?/ }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Enregistrer la séance' }).click();
await page.waitForTimeout(700);

await page.goto(`${BASE}/#/seance`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

/* La seance en cours, avec une serie chiffree. */
await page.getByRole('button', { name: 'Démarrer une séance vide' }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Ajouter des exercices/ }).click();
await page.waitForTimeout(500);
await page.locator('li button[aria-pressed]').first().click();
await page.getByRole('button', { name: /Ajouter \d+ exercices?/ }).click();
await page.waitForTimeout(500);

await page.locator('input[aria-label^="Poids"]').first().fill('82.5');
await page.locator('input[aria-label^="Répétitions"]').first().fill('7');
await page.locator('button[aria-label="Valider la série"]').first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/reduire-1-en-cours.png` });

// L'en-tete tient-il sur 320 px ? On mesure le debordement horizontal reel.
const enteteOk = await page.evaluate(() => {
  const el = document.querySelector('header');
  return el ? el.scrollWidth <= el.clientWidth + 1 : false;
});

/* Repli. */
await page.getByRole('button', { name: 'Réduire la séance' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/reduire-2-barre.png` });

const barre = page.getByRole('button', { name: /Séance en cours/ });
const barreVisible = await barre.isVisible();
// Le lanceur a repris la main : la liste des seances enregistrees est la.
const listeVisible = await page.getByText('Jour de jambes').first().isVisible();
const reprendreVisible = await page
  .getByRole('button', { name: 'Reprendre la séance en cours' })
  .isVisible();

/* Lancer une AUTRE seance ne doit pas ecraser celle qui tourne. */
await page.getByRole('button', { name: 'Lancer' }).first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/reduire-3-barrage.png` });
const barrageVisible = await page.getByText('Séance déjà en cours').isVisible();
await page.getByRole('button', { name: 'Rester ici' }).click();
await page.waitForTimeout(400);

/* Consultation d'un autre onglet : la barre suit. */
await page.getByRole('link', { name: 'Historique' }).click();
await page.waitForTimeout(600);
const barreAilleurs = await page.getByRole('button', { name: /Séance en cours/ }).isVisible();
await page.screenshot({ path: `${OUT}/reduire-4-autre-onglet.png` });

/* Consultation d'une seance programmee, puis retour par la barre. */
await page.getByRole('link', { name: 'Séance' }).click();
await page.waitForTimeout(500);
await page.getByText('Jour de jambes').first().click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/reduire-5-programmee.png` });
const barreSurFiche = await page.getByRole('button', { name: /Séance en cours/ }).isVisible();

await page.getByRole('button', { name: /Séance en cours/ }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/reduire-6-retour.png` });

/* Tout doit etre revenu comme on l'avait laisse. */
const poids = await page.locator('input[aria-label^="Poids"]').first().inputValue();
const reps = await page.locator('input[aria-label^="Répétitions"]').first().inputValue();
const coche = await page
  .locator('button[aria-label="Annuler la validation"]')
  .first()
  .getAttribute('aria-pressed');

const ok =
  enteteOk &&
  barreVisible &&
  listeVisible &&
  reprendreVisible &&
  barrageVisible &&
  barreAilleurs &&
  barreSurFiche &&
  // Le champ affiche la virgule decimale francaise, pas le point saisi.
  poids === '82,5' &&
  reps === '7' &&
  coche === 'true';

console.log(
  `entete=${enteteOk} barre=${barreVisible} liste=${listeVisible} reprendre=${reprendreVisible} ` +
    `barrage=${barrageVisible} ailleurs=${barreAilleurs} fiche=${barreSurFiche} ` +
    `poids=${poids} reps=${reps} coche=${coche} ${ok ? 'OK' : 'ECHEC'}`,
);

await browser.close();
process.exit(ok ? 0 : 1);
