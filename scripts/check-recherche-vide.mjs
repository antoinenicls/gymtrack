/**
 * La feuille de recherche ne doit PAS changer de hauteur quand on filtre.
 *
 * Elle est collee au bas de l'ecran et sa hauteur suivait son contenu : taper
 * un nom qui ne correspond a rien la reduisait a presque rien, elle descendait
 * donc sous le clavier, et la proposition « Créer « … » » devenait invisible
 * au moment precis ou elle sert.
 *
 * On mesure ce qui compte vraiment : la position du champ de recherche, et
 * celle de la proposition de creation. Les deux doivent rester dans le haut de
 * l'ecran, hors de la zone que le clavier occupe.
 *
 *   node scripts/check-recherche-vide.mjs
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';
const OUT = process.env.OUT ?? 'scripts/out';

/** Hauteur typique d'un clavier iOS : tout ce qui tombe dessous est perdu. */
const CLAVIER_PX = 336;

let failures = 0;
const check = (nom, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'OK   ' : 'ECHEC'} ${nom}${detail ? ` : ${detail}` : ''}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();

await page.addInitScript(() => {
  Object.defineProperty(navigator, 'onLine', { get: () => false });
});

await page.goto(`${BASE}/#/seance`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await page.getByText('Démarrer une séance vide').click();
await page.waitForTimeout(1000);
await page.getByText('Ajouter des exercices').first().click();
await page.waitForTimeout(900);

const hauteurEcran = page.viewportSize().height;
const limite = hauteurEcran - CLAVIER_PX;

const dialog = page.locator('[role="dialog"]');
const recherche = page.getByRole('searchbox', { name: 'Rechercher un exercice' });

const mesure = async () => ({
  feuille: Math.round((await dialog.boundingBox()).height),
  champ: Math.round((await recherche.boundingBox()).y),
});

// Liste complete : etat de reference.
const pleine = await mesure();
check(
  'liste pleine : le champ de recherche est au-dessus du clavier',
  pleine.champ < limite,
  `y=${pleine.champ}, limite=${limite}`,
);

// Recherche qui ne correspond a RIEN : le cas du bug.
await recherche.fill('zzzzqqq');
await page.waitForTimeout(700);
const vide = await mesure();

check(
  'liste vide : la feuille garde sa hauteur',
  Math.abs(vide.feuille - pleine.feuille) <= 2,
  `${pleine.feuille}px -> ${vide.feuille}px`,
);
check(
  'liste vide : le champ de recherche n’a pas bougé',
  Math.abs(vide.champ - pleine.champ) <= 2,
  `y=${pleine.champ} -> ${vide.champ}`,
);

const creer = page.getByRole('button', { name: /^Créer « / });
check('la proposition de création est présente', (await creer.count()) === 1);

const yCreer = Math.round((await creer.boundingBox()).y);
check(
  'et elle reste au-dessus du clavier',
  yCreer < limite,
  `y=${yCreer}, limite=${limite}`,
);

await page.screenshot({ path: `${OUT}/recherche-vide.png` });

// Un resultat unique retrecissait aussi la feuille : meme cause, meme controle.
await recherche.fill('curl marteau');
await page.waitForTimeout(700);
const unique = await mesure();
check(
  'un seul résultat : la feuille garde sa hauteur',
  Math.abs(unique.feuille - pleine.feuille) <= 2,
  `${pleine.feuille}px -> ${unique.feuille}px`,
);

await browser.close();
process.exit(failures > 0 ? 1 : 0);
