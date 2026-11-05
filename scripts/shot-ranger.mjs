/**
 * Verifie le mode « Changer l'ordre » de l'onglet Seance.
 *
 * Deux pieges qu'une simple capture ne montrerait pas : un ordre qui bouge a
 * l'ecran mais ne survit pas au rechargement, et des fleches qui deplacent une
 * seance HORS de son dossier. On relit donc la liste apres reload, dossier par
 * dossier.
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
await page.waitForTimeout(700);

// Deux dossiers, trois seances dans le premier : de quoi monter, descendre, et
// verifier que le contenu ne fuit pas d'un dossier a l'autre.
await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('gymtrack');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const tx = db.transaction(['routines', 'routineFolders'], 'readwrite');
  const folders = tx.objectStore('routineFolders');
  folders.put({ id: 'f-haut', name: 'Bloc 1', order: 0, createdAt: 1 });
  folders.put({ id: 'f-bas', name: 'Bloc 2', order: 1, createdAt: 2 });

  const routines = tx.objectStore('routines');
  const base = { items: [], createdAt: 1, lastPerformedAt: null };
  routines.put({ ...base, id: 'r-a', name: 'PUSH', folderId: 'f-haut', updatedAt: 300 });
  routines.put({ ...base, id: 'r-b', name: 'PULL', folderId: 'f-haut', updatedAt: 200 });
  routines.put({ ...base, id: 'r-c', name: 'LEGS', folderId: 'f-haut', updatedAt: 100 });
  routines.put({ ...base, id: 'r-d', name: 'FULL', folderId: 'f-bas', updatedAt: 50 });

  await new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
});

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);

/** Lit la liste telle qu'elle est affichee, dossier par dossier. */
const lire = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('section')]
      .map((section) => {
        const titre = section.querySelector('[aria-expanded]')?.textContent?.trim() ?? '';
        // Le nom porte `font-display` ; viser le premier `span` attraperait
        // l'enveloppe qui contient aussi le nombre d'exercices.
        const seances = [...section.querySelectorAll('li')].map(
          (li) => li.querySelector('.font-display')?.textContent?.trim() ?? '',
        );
        return { titre, seances };
      })
      .filter((s) => s.titre || s.seances.length > 0),
  );

const depart = await lire();
check(
  'ordre de depart = plus recente en premier',
  depart[0]?.seances.join() === 'PUSH,PULL,LEGS',
  depart[0]?.seances.join(),
);

// Entree dans le mode rangement.
await page.getByRole('button', { name: 'Autres actions sur mes séances' }).click();
await page.waitForTimeout(300);
const entree = page.getByRole('button', { name: /Changer l’ordre/ });
check('« Changer l’ordre » présent dans Organiser', (await entree.count()) === 1);
await entree.click();
await page.waitForTimeout(400);

await page.screenshot({ path: `${OUT}/ranger-mode.png`, clip: { x: 0, y: 0, width: 390, height: 600 } });

// « Lancer » doit avoir disparu : lancer une seance en voulant la deplacer est
// l'erreur que ce mode doit rendre impossible.
check(
  'le bouton « Lancer » cede la place aux fleches',
  (await page.getByRole('button', { name: 'Lancer' }).count()) === 0,
);

// LEGS, en bas de Bloc 1, remonte d'un cran.
await page.getByRole('button', { name: 'Monter LEGS' }).click();
await page.waitForTimeout(400);
const apresSeance = await lire();
check(
  'LEGS remonte dans son dossier',
  apresSeance[0]?.seances.join() === 'PUSH,LEGS,PULL',
  apresSeance[0]?.seances.join(),
);
check(
  'Bloc 2 est reste intact',
  apresSeance[1]?.seances.join() === 'FULL',
  apresSeance[1]?.seances.join(),
);

// Bloc 2 passe devant Bloc 1.
await page.getByRole('button', { name: 'Monter le dossier Bloc 2' }).click();
await page.waitForTimeout(400);
const apresDossier = await lire();
check(
  'Bloc 2 passe en premier',
  apresDossier[0]?.titre.startsWith('Bloc 2'),
  apresDossier.map((s) => s.titre).join(' | '),
);

// Les extremites ne doivent pas etre cliquables : une fleche active qui ne fait
// rien laisse croire a un blocage.
check(
  'la fleche haute du premier dossier est desactivee',
  await page.getByRole('button', { name: 'Monter le dossier Bloc 2' }).isDisabled(),
);

await page.getByRole('button', { name: 'Terminé' }).click();
await page.waitForTimeout(300);
check(
  '« Lancer » revient en sortant du mode',
  (await page.getByRole('button', { name: 'Lancer' }).count()) > 0,
);

// Le vrai test : l'ordre survit-il au rechargement ?
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const apresReload = await lire();
check(
  'ordre des dossiers conserve apres rechargement',
  apresReload[0]?.titre.startsWith('Bloc 2'),
  apresReload.map((s) => s.titre).join(' | '),
);
check(
  'ordre des seances conserve apres rechargement',
  apresReload[1]?.seances.join() === 'PUSH,LEGS,PULL',
  apresReload[1]?.seances.join(),
);

await page.screenshot({ path: `${OUT}/ranger-apres.png`, clip: { x: 0, y: 0, width: 390, height: 600 } });

await browser.close();
process.exit(failures > 0 ? 1 : 0);
