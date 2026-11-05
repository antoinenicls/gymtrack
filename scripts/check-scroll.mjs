/**
 * Verifie la restauration du defilement sur la bibliotheque d'exercices.
 *
 * Scenario reproduit : on descend dans la liste, on ouvre un exercice, on
 * revient. La position doit etre celle qu'on avait laissee, pas le haut.
 *
 * A lancer avec un serveur :
 *   npx vite --port 5178
 */
import { webkit, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5178';
const browser = await webkit.launch();
const ctx = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 },
});
const page = await ctx.newPage();

const scrollTop = () => page.evaluate(() => document.querySelector('main').scrollTop);

// 'domcontentloaded' et non 'networkidle' : le websocket de HMR de Vite garde
// le reseau actif en permanence, networkidle n'arrive donc jamais.
await page.goto(`${BASE}/#/exercices`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

// On descend jusqu'a un exercice qui n'est pas visible au chargement.
const cible = page.getByRole('link', { name: /Extension corde/ });
await cible.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

const avant = await scrollTop();
console.log('position avant ouverture :', avant);
if (avant === 0) throw new Error('le test ne prouve rien si la liste n’a pas defile');

await page.screenshot({ path: 'scripts/out/scroll-1-liste.png' });

await cible.click();
await page.waitForTimeout(900);
console.log('fiche ouverte :', page.url().split('#')[1]);
await page.screenshot({ path: 'scripts/out/scroll-2-fiche.png' });

// Retour par le bouton en haut a gauche, celui que l'utilisateur utilise.
await page.getByRole('button', { name: /Retour/i }).click();
await page.waitForTimeout(1200);

const apres = await scrollTop();
console.log('position apres retour  :', apres);
await page.screenshot({ path: 'scripts/out/scroll-3-retour.png' });

const ecart = Math.abs(apres - avant);
console.log(ecart <= 2 ? `OK : position restauree (ecart ${ecart}px)` : `ECHEC : ecart ${ecart}px`);

/* -------------------------------------------------------------------------- */
/* Second scenario : la recherche doit survivre au retour, sinon la position   */
/* serait restauree sur une liste redevenue complete.                          */
/* -------------------------------------------------------------------------- */

const recherche = page.getByLabel('Rechercher un exercice');
await recherche.fill('e');
await page.waitForTimeout(600);

// On descend jusqu'a un exercice reellement visible, puis on clique dessus.
// Ne PAS placer scrollTop a la main pour cliquer ensuite ailleurs : Playwright
// ramene l'element cible dans le champ avant de cliquer, et c'est ce
// defilement parasite qu'on mesurerait, pas celui de l'athlete.
const cibleFiltre = page.getByRole('link', { name: /Relevé de jambes suspendu/ });
await cibleFiltre.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);

const avantFiltre = await scrollTop();
const texteAvant = await recherche.inputValue();
console.log(`\nrecherche « ${texteAvant} », position ${avantFiltre}`);

await cibleFiltre.click();
await page.waitForTimeout(900);
await page.getByRole('button', { name: /Retour/i }).click();
await page.waitForTimeout(1200);

const texteApres = await page.getByLabel('Rechercher un exercice').inputValue();
const apresFiltre = await scrollTop();
console.log(`apres retour : recherche « ${texteApres} », position ${apresFiltre}`);
await page.screenshot({ path: 'scripts/out/scroll-4-recherche.png' });

const rechercheOk = texteApres === texteAvant;
const positionOk = Math.abs(apresFiltre - avantFiltre) <= 2;
console.log(rechercheOk ? 'OK : recherche conservee' : `ECHEC : recherche perdue (« ${texteApres} »)`);
console.log(positionOk ? 'OK : position conservee sur liste filtree' : 'ECHEC : position perdue');

await browser.close();
process.exit(ecart <= 2 && rechercheOk && positionOk ? 0 : 1);
