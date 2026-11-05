/**
 * Reproduit les deux lectures possibles du bug signale.
 *
 * A. Modifier la description d'une seance enregistree, puis la lancer :
 *    la note de la seance en cours doit porter la NOUVELLE description.
 * B. Pendant une seance en cours, modifier la note : elle doit survivre a un
 *    rechargement, donc avoir ete ecrite dans la base et pas seulement a
 *    l'ecran.
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';
const OUT = process.env.OUT ?? 'scripts/out';

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

/**
 * Attendre que l'APP ait cree la base.
 *
 * Ouvrir `gymtrack` sans numero de version alors qu'elle n'existe pas encore
 * la cree vide, en version 1 : le script gagne la course contre l'app, qui se
 * retrouve devant une base sans aucun magasin. Une temporisation fixe ne
 * protege de rien, on attend donc la presence reelle des magasins.
 */
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
    const pret = db.objectStoreNames.contains('routines') && db.objectStoreNames.contains('exercises');
    db.close();
    return pret;
  },
  null,
  { timeout: 15000 },
);

await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('gymtrack');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const tx = db.transaction(['routines', 'exercises'], 'readwrite');
  tx.objectStore('exercises').put({
    id: 'x-dc',
    name: 'Développé couché',
    muscleGroup: 'pectoraux',
    equipment: 'barre',
    defaultRestSec: 180,
    isCustom: false,
    createdAt: 1,
  });
  tx.objectStore('routines').put({
    id: 'r-push',
    name: 'PUSH A',
    description: 'Description initiale',
    folderId: null,
    items: [
      {
        id: 'i-1',
        exerciseId: 'x-dc',
        sets: [{ id: 'rs-1', type: 'normale', targetWeightKg: 60, targetReps: 8 }],
        restSec: 180,
        supersetGroup: null,
        notes: '',
        order: 0,
      },
    ],
    createdAt: 1,
    updatedAt: 1,
    lastPerformedAt: null,
  });

  await new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
});

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);

/* -------------------------------------------------------------------------- */
/* A. Description modifiee, puis seance lancee                                 */
/* -------------------------------------------------------------------------- */

// Passage par l'editeur, comme le ferait l'utilisateur.
await page.getByText('PUSH A').first().click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: /Modifier/ }).first().click();
await page.waitForTimeout(600);

const champ = page.getByLabel('Description de la séance');
check('le champ description est atteignable', (await champ.count()) === 1);
await champ.fill('Description modifiée');
await page.getByRole('button', { name: /Enregistrer/ }).first().click();
await page.waitForTimeout(800);

// Retour a l'onglet Seance, puis lancement depuis la liste.
await page.getByRole('link', { name: 'Séance' }).click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: 'Lancer' }).first().click();
await page.waitForTimeout(900);

const note = page.getByLabel('Notes de la séance');
const valeurA = await note.inputValue();
check(
  'A. la note reprend la description MODIFIÉE',
  valeurA === 'Description modifiée',
  `« ${valeurA} »`,
);

await page.screenshot({ path: `${OUT}/description-a.png`, clip: { x: 0, y: 0, width: 390, height: 420 } });

/* -------------------------------------------------------------------------- */
/* B. Note modifiee pendant la seance                                          */
/* -------------------------------------------------------------------------- */

await note.fill('Note écrite pendant la séance');
await page.waitForTimeout(700);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const valeurB = await page.getByLabel('Notes de la séance').inputValue();
check(
  'B. la note modifiée survit au rechargement',
  valeurB === 'Note écrite pendant la séance',
  `« ${valeurB} »`,
);

/* -------------------------------------------------------------------------- */
/* C. Description modifiee PENDANT la seance                                   */
/* -------------------------------------------------------------------------- */

/** Va modifier la description de la routine, seance en cours, puis revient. */
async function modifierDescription(texte) {
  await page.goto(`${BASE}/#/routines/r-push/modifier`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.getByLabel('Description de la séance').fill(texte);
  await page.getByRole('button', { name: /Enregistrer/ }).first().click();
  await page.waitForTimeout(900);
  await page.goto(`${BASE}/#/seance`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
}

// La note porte encore un texte ecrit a la main : elle ne doit PAS bouger.
await modifierDescription('Description pendant la séance');
const valeurC1 = await page.getByLabel('Notes de la séance').inputValue();
check(
  'C1. une note écrite à la main est préservée',
  valeurC1 === 'Note écrite pendant la séance',
  `« ${valeurC1} »`,
);

// On rend la note a la description : elle redevient « rattrapable ».
await page.getByLabel('Notes de la séance').fill('Description pendant la séance');
await page.waitForTimeout(700);

await modifierDescription('Consigne ajoutée en cours de route');
const valeurC2 = await page.getByLabel('Notes de la séance').inputValue();
check(
  'C2. une note non touchée suit la description',
  valeurC2 === 'Consigne ajoutée en cours de route',
  `« ${valeurC2} »`,
);

// Et la propagation doit avoir ete ECRITE, pas seulement affichee.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const valeurC3 = await page.getByLabel('Notes de la séance').inputValue();
check(
  'C3. la propagation survit au rechargement',
  valeurC3 === 'Consigne ajoutée en cours de route',
  `« ${valeurC3} »`,
);

await browser.close();
process.exit(failures > 0 ? 1 : 0);
