/**
 * Verifie qu'on peut faire defiler une seance en cours AU DOIGT sur Android.
 *
 * Bug remonte sur un Pixel : dans la seance en cours, le glisser vertical ne
 * faisait rien, seul le haut de la seance restait visible. Cause : un
 * conteneur `overflow-y: auto` + `overscroll-behavior: contain` niche dans le
 * <main> qui defile. Sans hauteur bornee il n'a rien a faire defiler, mais
 * Chrome Android refusait quand meme de passer le geste au <main>.
 *
 * On reproduit avec Chromium en emulation Pixel (ecran tactile, mode mobile)
 * et de vrais evenements tactiles envoyes par le protocole DevTools, qui
 * passent par le compositeur comme un doigt, et non par un scrollTop pose en
 * script. L'editeur de routine, construit sur le meme gabarit, est verifie
 * aussi.
 *
 * A lancer avec un serveur :
 *   npx vite --port 5191
 */
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5191';
const OUT = process.env.OUT ?? 'scripts/out';

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const { width, height } = page.viewportSize();

/**
 * Glisser du doigt vers le haut, au milieu de l'ecran.
 * Des evenements tactiles bruts, pas Input.synthesizeScrollGesture : ce
 * dernier ne fait rien defiler en headless, meme sur une page saine, et
 * donnerait donc un faux echec.
 */
async function swipeUp() {
  const x = Math.round(width / 2);
  const y0 = Math.round(height * 0.7);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 20; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 - i * 20 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(800);
}

/** Ajoute cinq exercices depuis le selecteur : de quoi depasser l'ecran. */
async function addFiveExercises() {
  await page.getByRole('button', { name: /Ajouter des exercices/ }).click();
  await page.waitForTimeout(600);
  const choix = page.locator('li button[aria-pressed]');
  for (let i = 0; i < 5; i += 1) await choix.nth(i).click();
  await page.getByRole('button', { name: /Ajouter \d+ exercices?/ }).click();
  await page.waitForTimeout(800);
}

/** De combien le contenu remonte sous un glisser. */
async function scrolledBy(name) {
  const repere = page.getByRole('button', { name: /Ajouter des exercices/ });
  const avant = await repere.boundingBox();
  await page.screenshot({ path: `${OUT}/scroll-${name}-1-avant.png` });
  await swipeUp();
  const apres = await repere.boundingBox();
  await page.screenshot({ path: `${OUT}/scroll-${name}-2-apres.png` });
  return Math.round((avant?.y ?? 0) - (apres?.y ?? 0));
}

const resultats = [];

/* Seance en cours. */
await page.goto(`${BASE}/#/seance`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: 'Démarrer une séance vide' }).click();
await page.waitForTimeout(500);
await addFiveExercises();
const seance = await scrolledBy('seance');
// La barre du chrono doit rester collee en haut pendant qu'on descend.
const barre = await page.getByRole('button', { name: 'Terminer' }).boundingBox();
const barreCollee = (barre?.y ?? 999) < 80;
resultats.push(['seance en cours : defile au doigt', seance > 100, `${seance}px`]);
resultats.push(['seance en cours : en-tete reste en haut', barreCollee, `y=${Math.round(barre?.y ?? -1)}`]);

/* Editeur de routine. */
await page.getByRole('button', { name: 'Réduire la séance' }).click();
await page.waitForTimeout(400);
await page.goto(`${BASE}/#/routines/nouvelle`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await addFiveExercises();
const editeur = await scrolledBy('editeur');
resultats.push(['editeur de routine : defile au doigt', editeur > 100, `${editeur}px`]);

for (const [nom, ok, detail] of resultats) console.log(`${ok ? 'OK    ' : 'ECHEC '} ${nom} (${detail})`);
await browser.close();
process.exit(resultats.every(([, ok]) => ok) ? 0 : 1);
