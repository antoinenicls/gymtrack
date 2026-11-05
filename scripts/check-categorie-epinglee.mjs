/**
 * Verifie le titre de groupe musculaire epingle dans la bibliotheque.
 *
 * Ce qu'on prouve, dans les deux sens de defilement :
 *  - un titre est toujours colle juste sous la barre de recherche ;
 *  - c'est bien celui du groupe des exercices qu'on a sous les yeux ;
 *  - il change de lui-meme au passage d'un groupe a l'autre.
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

await page.goto(`${BASE}/#/exercices`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

/**
 * Ce qui est reellement EPINGLE, mesure a l'ecran.
 *
 * On ne fait pas confiance aux classes : on lit la position de chaque titre et
 * on garde celui qui touche le bas de la barre de recherche. Et on lit au
 * passage le premier exercice visible juste dessous, pour verifier que le
 * titre epingle est bien le sien.
 */
const etat = () =>
  page.evaluate(() => {
    const barre = document.querySelector('main .sticky.top-0');
    const bas = barre.getBoundingClientRect().bottom;

    let epingle = null;
    for (const titre of document.querySelectorAll('main section > h2')) {
      const r = titre.getBoundingClientRect();
      if (Math.abs(r.top - bas) < 2) epingle = titre.textContent.trim();
    }

    // Premier exercice dont le haut passe sous la barre ET sous le titre.
    let premier = null;
    for (const lien of document.querySelectorAll('main section ul a')) {
      const r = lien.getBoundingClientRect();
      if (r.top >= bas + 20 && premier === null) {
        premier = {
          nom: lien.querySelector('span span').textContent.trim(),
          groupe: lien.closest('section').querySelector('h2').textContent.trim(),
        };
      }
    }

    return { epingle, premier, scroll: document.querySelector('main').scrollTop };
  });

const main = (y) =>
  page.evaluate((cible) => {
    document.querySelector('main').scrollTop = cible;
  }, y);

const releves = [];
let echecs = 0;

async function releve(label) {
  await page.waitForTimeout(350);
  const e = await etat();
  releves.push({ label, ...e });

  if (e.epingle === null) {
    echecs += 1;
    console.log(`ECHEC  ${label} (scroll ${e.scroll}) : aucun titre epingle`);
    return;
  }
  if (e.premier && e.premier.groupe !== e.epingle) {
    echecs += 1;
    console.log(
      `ECHEC  ${label} (scroll ${e.scroll}) : « ${e.epingle} » epingle alors que ` +
        `« ${e.premier.nom} » appartient a « ${e.premier.groupe} »`,
    );
    return;
  }
  console.log(
    `OK     ${label} (scroll ${e.scroll}) : « ${e.epingle} »` +
      (e.premier ? ` au-dessus de « ${e.premier.nom} »` : ''),
  );
}

const hauteur = await page.evaluate(() => document.querySelector('main').scrollHeight);
console.log(`hauteur de liste : ${hauteur}px\n`);

console.log('--- en descendant');
for (const y of [200, 600, 1200, 2000, 3000, 4200]) {
  await main(y);
  await releve(`descente ${y}`);
}
await page.screenshot({ path: 'scripts/out/categorie-1-descente.png' });

console.log('\n--- en remontant');
for (const y of [3000, 2000, 1200, 600, 200]) {
  await main(y);
  await releve(`remontee ${y}`);
}
await page.screenshot({ path: 'scripts/out/categorie-2-remontee.png' });

// Le titre doit CHANGER en cours de route : un titre unique colle en haut
// prouverait seulement qu'on a epingle le premier groupe et rien d'autre.
const vus = [...new Set(releves.map((r) => r.epingle).filter(Boolean))];
console.log(`\ngroupes epingles rencontres : ${vus.join(', ')}`);
if (vus.length < 2) {
  echecs += 1;
  console.log('ECHEC : le titre epingle n’a jamais change');
}

// Tout en haut, la barre de recherche ne doit rien avoir sous elle qui la
// recouvre : le titre passe DESSOUS, jamais dessus.
await main(0);
await page.waitForTimeout(300);
const recouvre = await page.evaluate(() => {
  const barre = document.querySelector('main .sticky.top-0');
  const r = barre.getBoundingClientRect();
  const dessus = document.elementFromPoint(r.left + 30, r.top + r.height / 2);
  return !barre.contains(dessus);
});
if (recouvre) {
  echecs += 1;
  console.log('ECHEC : un titre passe par-dessus la barre de recherche');
} else {
  console.log('OK     : la barre de recherche reste au premier plan');
}
await page.screenshot({ path: 'scripts/out/categorie-3-haut.png' });

await browser.close();
console.log(echecs === 0 ? '\nTout est bon.' : `\n${echecs} echec(s).`);
process.exit(echecs === 0 ? 0 : 1);
