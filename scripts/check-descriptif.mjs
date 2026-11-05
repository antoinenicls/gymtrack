/**
 * Rejoue la sequence exacte decrite : seance lancee, descriptif modifie
 * PENDANT, seance terminee, puis « Fermer ». On releve le descriptif a chaque
 * etape pour voir OU il revient en arriere.
 *
 * Deux variantes, parce que l'ecran de fin propose un report vers la seance
 * enregistree et que rien ne dit laquelle des deux a ete empruntee.
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';

let failures = 0;
const check = (nom, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'OK   ' : 'ECHEC'} ${nom}${detail ? ` : ${detail}` : ''}`);
};

const ANCIEN = 'Ancien descriptif';
const NOUVEAU = 'Nouveau descriptif écrit pendant la séance';

for (const variante of ['fermer', 'reporter']) {
  console.log(`\n--- Variante : ${variante === 'fermer' ? '« Fermer » directement' : '« Mettre à jour la séance » puis « Fermer »'} ---`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'onLine', { get: () => false });
  });

  await page.goto(`${BASE}/#/seance`, { waitUntil: 'networkidle' });
  await attendreBase(page);

  await page.evaluate(async (ancien) => {
    const db = await new Promise((resolve) => {
      const request = indexedDB.open('gymtrack');
      request.onsuccess = () => resolve(request.result);
    });
    const tx = db.transaction(['routines', 'exercises'], 'readwrite');
    tx.objectStore('exercises').put({
      id: 'x-dc', name: 'Développé couché', muscleGroup: 'pectoraux', equipment: 'barre',
      defaultRestSec: 180, isCustom: false, createdAt: 1,
    });
    tx.objectStore('routines').put({
      id: 'r-push', name: 'PUSH A', description: ancien, folderId: null,
      items: [{
        id: 'i-1', exerciseId: 'x-dc',
        sets: [{ id: 'rs-1', type: 'normale', targetWeightKg: 60, targetReps: 8 }],
        restSec: 180, supersetGroup: null, notes: '', order: 0,
      }],
      createdAt: 1, updatedAt: 1, lastPerformedAt: null,
    });
    await new Promise((resolve) => { tx.oncomplete = resolve; });
  }, ANCIEN);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 1. Lancer la seance.
  await page.getByRole('button', { name: 'Lancer' }).first().click();
  await page.waitForTimeout(900);

  const auLancement = await page.getByLabel(/Notes de la séance|Description de la séance/).inputValue();
  check('au lancement, le descriptif est repris', auLancement === ANCIEN, `« ${auLancement} »`);

  // 2. Valider une serie, sinon la seance est vide et ne s'enregistre pas.
  await page.getByRole('button', { name: 'Valider la série' }).first().click();
  await page.waitForTimeout(700);

  // 3. Modifier le descriptif DANS LA SEANCE, la ou il s'affiche sous le nom.
  await page.getByLabel('Description de la séance').fill(NOUVEAU);
  await page.waitForTimeout(900);

  const apresSaisie = await lireDescriptifEnBase(page);
  check(
    'saisi en séance, le descriptif remonte vers la séance enregistrée',
    apresSaisie === NOUVEAU,
    `« ${apresSaisie} »`,
  );

  // 4. Terminer la seance.
  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.waitForTimeout(1200);

  // 5. Variante : reporter vers la seance enregistree, ou non.
  if (variante === 'reporter') {
    const report = page.getByRole('button', { name: /Mettre à jour la séance/ });
    if (await report.count()) {
      await report.click();
      await page.waitForTimeout(900);
    } else {
      console.log('     (aucun report proposé, la séance correspondait au prévu)');
    }
  }

  // 6. Fermer le recapitulatif. Le fond de la feuille EST le bouton de
  // fermeture ; viser un libelle texte tombait sur lui et restait bloque.
  await page.locator('button[aria-label="Fermer"]').last().click();
  await page.waitForTimeout(1500);

  const apresFermeture = await lireDescriptifEnBase(page);
  check(
    'après « Fermer », le descriptif est TOUJOURS le nouveau',
    apresFermeture === NOUVEAU,
    `« ${apresFermeture} »`,
  );

  // Et ce que l'ecran AFFICHE, pas seulement ce que la base contient : c'est
  // sur la liste que le retour en arriere se voyait.
  const surLaListe = await page.getByText(NOUVEAU).count();
  check('et la liste des séances l’affiche', surLaListe > 0);

  await browser.close();
}

async function attendreBase(page) {
  await page.waitForFunction(
    async () => {
      const bases = await indexedDB.databases();
      if (!bases.some((b) => b.name === 'gymtrack')) return false;
      const db = await new Promise((resolve) => {
        const request = indexedDB.open('gymtrack');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
      if (!db) return false;
      const pret = db.objectStoreNames.contains('routines');
      db.close();
      return pret;
    },
    null,
    { timeout: 15000 },
  );
}

/** Lit le descriptif DANS LA BASE : l'ecran peut afficher un etat en cache. */
function lireDescriptifEnBase(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const request = indexedDB.open('gymtrack');
      request.onsuccess = () => resolve(request.result);
    });
    const tx = db.transaction('routines', 'readonly');
    const routine = await new Promise((resolve) => {
      const request = tx.objectStore('routines').get('r-push');
      request.onsuccess = () => resolve(request.result);
    });
    return routine?.description ?? '(vide)';
  });
}

process.exit(failures > 0 ? 1 : 0);
