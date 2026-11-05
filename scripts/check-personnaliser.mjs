/**
 * Reproduit : dans « Personnaliser l'analyse », decocher / recocher / decocher
 * une carte ne la remet pas en grise au troisieme geste.
 *
 * On lit l'etat REEL apres chaque tap : `aria-pressed` du bouton oeil, et la
 * couleur calculee du titre. Se fier a la seule capture ne dirait pas
 * lequel des deux ment.
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';

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

await page.goto(`${BASE}/#/analyse`, { waitUntil: 'networkidle' });

await page.waitForFunction(
  async () => {
    const bases = await indexedDB.databases();
    if (!bases.some((base) => base.name === 'gymtrack')) return false;
    const db = await new Promise((resolve) => {
      const request = indexedDB.open('gymtrack');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    if (!db) return false;
    const pret = db.objectStoreNames.contains('workouts');
    db.close();
    return pret;
  },
  null,
  { timeout: 15000 },
);

// Une seance suffit a peupler l'ecran : sans donnees, Analyse montre un vide.
await page.evaluate(async () => {
  const db = await new Promise((resolve) => {
    const request = indexedDB.open('gymtrack');
    request.onsuccess = () => resolve(request.result);
  });
  const tx = db.transaction(['exercises', 'workouts'], 'readwrite');
  tx.objectStore('exercises').put({
    id: 'x-dc',
    name: 'Développé couché',
    muscleGroup: 'pectoraux',
    equipment: 'barre',
    defaultRestSec: 180,
    isCustom: false,
    createdAt: 1,
  });
  for (let i = 0; i < 4; i++) {
    tx.objectStore('workouts').put({
      id: `w-${i}`,
      name: 'Séance',
      routineId: null,
      startedAt: Date.now() - i * 3 * 86400000,
      endedAt: Date.now() - i * 3 * 86400000 + 3600000,
      entries: [
        {
          id: `e-${i}`,
          exerciseId: 'x-dc',
          sets: [
            { id: `s-${i}`, type: 'normale', weightKg: 60, reps: 8, rpe: 8, done: true,
              completedAt: Date.now() - i * 3 * 86400000 },
          ],
          notes: '',
          restSec: 180,
          supersetGroup: null,
          order: 0,
        },
      ],
      notes: '',
      durationSec: 3600,
    });
  }
  await new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
});

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

/**
 * Brider le processeur, sans quoi le bug reste invisible.
 *
 * Chaque bascule redessine les douze cartes de l'ecran, graphiques compris.
 * Sur une machine de bureau ce rendu passe entre deux taps et tout semble
 * correct ; sur un telephone il dure plus longtemps que l'intervalle entre
 * deux appuis, et c'est la que le second tap lit un etat perime. Le facteur 20
 * reproduit cet ecart.
 */
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });

await page.getByRole('button', { name: 'Personnaliser l’analyse' }).click();
await page.waitForTimeout(1500);

// Toutes les cartes, pas une seule : le bug ne se produit visiblement pas sur
// n'importe laquelle, et un echantillon unique l'aurait manque.
const titres = await page.locator('li p.text-\\[15px\\]').allTextContents();
console.log(`${titres.length} cartes proposées\n`);

for (const titre of titres) {
  const oeil = page.getByRole('button', {
    name: new RegExp(`^(Masquer|Afficher) ${echappe(titre)}$`),
  });
  const ligne = page.locator('li', { has: oeil });

  const etat = async () => {
    const pressed = await oeil.getAttribute('aria-pressed');
    // La couleur du TITRE et non l'opacite de la ligne : le grise se fait
    // desormais par teinte, et une opacite d'ensemble ne le dirait plus.
    const couleur = await ligne.evaluate((el) => {
      const titre = el.querySelector('p');
      return titre ? getComputedStyle(titre).color : '';
    });
    const grise = couleur !== 'rgb(29, 29, 31)';
    // Le grise doit SUIVRE l'etat : c'est leur desaccord qui est le bug.
    return { pressed, couleur, coherent: (pressed === 'false') === grise };
  };

  const debut = await etat();
  let souci = debut.coherent ? '' : `départ pressed=${debut.pressed} couleur=${debut.couleur}`;

  /**
   * DEUX clics DOM dans le meme tour de boucle d'evenements.
   *
   * Deux et non trois, et c'est tout le test : avec un nombre pair, un code
   * correct revient a l'etat de depart. Un code qui relit un etat perime, lui,
   * calcule deux fois la MEME bascule et n'en applique qu'une. Trois clics
   * donnaient le meme resultat dans les deux cas et ne prouvaient rien.
   *
   * `locator.click()` ne convient pas ici : il attend que l'element soit stable,
   * donc se synchronise avec le rendu et ne peut pas reproduire un tap qui
   * arrive avant le redessin. Un doigt, lui, n'attend rien.
   */
  await oeil.evaluate((el) => {
    el.click();
    el.click();
  });
  await page.waitForTimeout(2500);

  const apres = await etat();
  if (souci === '' && apres.pressed !== debut.pressed) {
    souci = `2 taps rapides : pressed=${apres.pressed}, attendu ${debut.pressed} (bascule perdue)`;
  }
  if (souci === '' && !apres.coherent) {
    souci = `pressed=${apres.pressed} mais titre en ${apres.couleur}`;
  }

  // Remise a l'etat de depart pour ne pas fausser la carte suivante.
  if (apres.pressed !== debut.pressed) {
    await oeil.click();
    await page.waitForTimeout(1200);
  }

  check(titre, souci === '', souci);
}

function echappe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

await browser.close();
process.exit(failures > 0 ? 1 : 0);
