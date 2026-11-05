/**
 * Verifie le nouveau choix d'exercice de la carte « Progression par exercice ».
 *
 * L'ancienne rangee defilante plafonnait a douze mouvements : on controle donc
 * qu'un exercice situe AU-DELA de ce rang reste atteignable, ce qui etait
 * precisement impossible avant.
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

// Dix-huit exercices, travailles un nombre DECROISSANT de fois : le dernier se
// retrouve donc bien au-dela du douzieme rang de l'ancienne rangee.
await page.evaluate(async () => {
  const db = await new Promise((resolve) => {
    const request = indexedDB.open('gymtrack');
    request.onsuccess = () => resolve(request.result);
  });
  const tx = db.transaction(['exercises', 'workouts'], 'readwrite');

  const noms = [
    ['Développé couché', 'pectoraux'], ['Squat', 'quadriceps'], ['Soulevé de terre', 'dos'],
    ['Développé militaire', 'epaules'], ['Rowing barre', 'dos'], ['Tractions', 'dos'],
    ['Dips', 'pectoraux'], ['Curl barre', 'biceps'], ['Extension triceps', 'triceps'],
    ['Presse à cuisses', 'quadriceps'], ['Leg curl', 'ischios'], ['Mollets debout', 'mollets'],
    ['Élévations latérales', 'epaules'], ['Face pull', 'epaules'], ['Hip thrust', 'fessiers'],
    ['Crunch', 'abdominaux'], ['Curl marteau', 'biceps'], ['Écarté poulie', 'pectoraux'],
  ];

  noms.forEach(([nom, groupe], index) => {
    tx.objectStore('exercises').put({
      id: `x-${index}`,
      name: nom,
      muscleGroup: groupe,
      equipment: 'barre',
      defaultRestSec: 180,
      isCustom: false,
      createdAt: 1,
    });
  });

  let w = 0;
  noms.forEach((_, index) => {
    // 18 seances pour le premier, 1 pour le dernier : le rang suit l'index.
    const seances = noms.length - index;
    for (let s = 0; s < seances; s++) {
      const startedAt = Date.now() - (w % 60) * 86400000;
      tx.objectStore('workouts').put({
        id: `w-${w++}`,
        name: 'Séance',
        routineId: null,
        startedAt,
        endedAt: startedAt + 3600000,
        entries: [
          {
            id: `e-${w}`,
            exerciseId: `x-${index}`,
            sets: [
              { id: `s-${w}`, type: 'normale', weightKg: 60 + s, reps: 8, rpe: 8, done: true,
                completedAt: startedAt },
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
  });

  await new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
});

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const carte = page.locator('section', { has: page.getByText('Progression par exercice') });
await carte.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

// Le bouton porte l'exercice courant : le plus travaille, donc le premier.
const bouton = carte.getByRole('button').first();
const libelle = (await bouton.textContent()) ?? '';
check('le bouton annonce l’exercice courant', /Développé couché/.test(libelle), libelle.trim());
check('et son nombre de séances', /18 séances/.test(libelle), libelle.trim());

await carte.screenshot({ path: `${OUT}/selecteur-bouton.png` });

await bouton.click();
await page.waitForTimeout(600);

const recherche = page.getByRole('searchbox', { name: 'Rechercher un exercice' });
check('la recherche est présente', (await recherche.count()) === 1);

// « Écarté poulie » est le 18e : inatteignable avec l'ancienne limite de 12.
await recherche.fill('ecarte');
await page.waitForTimeout(500);

const resultats = page.locator('li button');
const nombre = await resultats.count();
check('la recherche ignore les accents', nombre === 1, `${nombre} résultat(s)`);

await page.screenshot({ path: `${OUT}/selecteur-recherche.png`, clip: { x: 0, y: 200, width: 390, height: 500 } });

await resultats.first().click();
await page.waitForTimeout(800);

const apres = (await carte.getByRole('button').first().textContent()) ?? '';
check(
  'un exercice au-delà du 12e rang est sélectionnable',
  /Écarté poulie/.test(apres),
  apres.trim(),
);
check('avec son compte de séances', /1 séance ·/.test(apres), apres.trim());

// Filtre par muscle : l'autre facon de reduire la liste.
await carte.getByRole('button').first().click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Biceps', exact: true }).click();
await page.waitForTimeout(500);

const biceps = await page.locator('li button').allTextContents();
check(
  'le filtre par muscle ne garde que les siens',
  biceps.length === 2 && biceps.every((t) => /Curl/.test(t)),
  biceps.join(' | '),
);

await browser.close();
process.exit(failures > 0 ? 1 : 0);
