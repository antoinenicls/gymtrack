/**
 * Verifie la carte « Respect des normes » sur des donnees calibrees.
 *
 * On fabrique quatre semaines dont on connait d'avance le verdict de chaque
 * ligne, puis on relit ce que la carte affiche. Une capture seule ne dirait pas
 * si le compte « x sur y » est juste, or c'est tout l'interet de la carte.
 *
 * Calibrage sur la fenetre PAR DEFAUT de l'ecran, douze semaines : 24 seances
 * espacees de trois jours et demi, soit deux par semaine. Remplir moins que la
 * fenetre diluerait tout par le diviseur et mettrait chaque ligne sous la zone,
 * ce qui ne testerait plus rien.
 *
 *   pectoraux  4 series x 24 =  96 -> 8 /sem   DANS (6-12)
 *                                     4 /seance DANS (2-6), 2 passages DANS (2-3)
 *   mollets    1 serie  x 24 =  24 -> 2 /sem   SOUS (6-12)
 *                                     1 /seance SOUS (2-6), 2 passages DANS
 *   dos        8 series x 24 = 192 -> 16 /sem  DESSUS (6-12)
 *                                     8 /seance DESSUS (2-6), 2 passages DANS
 * Series par seance : 4 + 1 + 8 = 13 -> DANS (8-18).
 * Reps : 3 series sur 13 a 12 reps, donc 10/13 = 77 % dans la zone 4-10.
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
await page.waitForTimeout(900);

await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('gymtrack');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const tx = db.transaction(['exercises', 'workouts'], 'readwrite');
  const exercises = tx.objectStore('exercises');
  const plan = [
    { id: 'x-pec', name: 'Développé couché', muscleGroup: 'pectoraux', sets: 4 },
    { id: 'x-mol', name: 'Mollets debout', muscleGroup: 'mollets', sets: 1 },
    { id: 'x-dos', name: 'Rowing barre', muscleGroup: 'dos', sets: 8 },
  ];
  for (const item of plan) {
    exercises.put({
      id: item.id,
      name: item.name,
      muscleGroup: item.muscleGroup,
      equipment: 'barre',
      defaultRestSec: 180,
      isCustom: false,
      createdAt: 1,
    });
  }

  // Deux seances par semaine, sur les douze dernieres semaines.
  const workouts = tx.objectStore('workouts');
  const JOUR = 24 * 60 * 60 * 1000;
  for (let session = 0; session < 24; session++) {
    // Espacees de trois jours : 24 jours distincts, tous largement dans la
    // fenetre. A trois jours et demi, la plus ancienne tombait juste dehors et
    // faussait chaque moyenne d'un vingt-quatrieme.
    const startedAt = Date.now() - session * 3 * JOUR;

    const entries = plan.map((item, order) => {
      let stamp = startedAt;
      const sets = Array.from({ length: item.sets }, (_, i) => {
        // Ecart de 150 s entre deux series validees : deux minutes trente.
        stamp += 150 * 1000;
        return {
          id: `s-${session}-${order}-${i}`,
          type: 'normale',
          weightKg: 60,
          // Une serie sur quatre a 12 reps, le reste a 8 : la zone 4-10
          // doit ressortir majoritaire sans etre exclusive.
          reps: i % 4 === 3 ? 12 : 8,
          rpe: 8,
          done: true,
          completedAt: stamp,
        };
      });
      return {
        id: `e-${session}-${order}`,
        exerciseId: item.id,
        sets,
        notes: '',
        restSec: 180,
        supersetGroup: null,
        order,
      };
    });

    workouts.put({
      id: `w-${session}`,
      name: 'Séance test',
      routineId: null,
      startedAt,
      endedAt: startedAt + 3600 * 1000,
      entries,
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

const carte = page.locator('section', { has: page.getByText('Respect des normes') });
check('la carte est affichée', (await carte.count()) > 0);

await carte.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await carte.screenshot({ path: `${OUT}/normes.png` });

const texte = (await carte.textContent()) ?? '';

// Chaque ligne jugee, avec le compte attendu.
check('séries par séance = 13, dans la zone', /Séries par séance\s*13/.test(texte), extrait(texte, 'Séries par séance'));
check(
  'un seul muscle sur trois dans la zone hebdomadaire',
  /Séries par muscle et par semaine\s*1 \/ 3/.test(texte),
  extrait(texte, 'Séries par muscle et par semaine'),
);
check('les mollets sont nommés sous la zone', /Sous la zone : mollets\./.test(texte));
check('le dos est nommé au-dessus', /Au-dessus : dos\./.test(texte));
check(
  'les trois muscles sont vus 2 fois par semaine',
  /Passages par muscle et par semaine\s*3 \/ 3/.test(texte),
  extrait(texte, 'Passages par muscle et par semaine'),
);

// Reps : 10 series sur 13 dans la zone, soit 77 %.
check('77 % des reps dans la zone 4-10', /4 à 10 reps\s*77 %/.test(texte), extrait(texte, '4 à 10 reps'));
check('aucune série sous 4 reps affichée', !/moins de 4 reps/.test(texte));

// Le repos a ete retire de la carte : rien ne doit en subsister.
check('aucune mesure de repos ou d’écart', !/écart|repos/i.test(texte), extrait(texte, 'écart'));

// Format : 2 seances par semaine.
check('le format conseillé suit le rythme', /full body/.test(texte), extrait(texte, 'full body'));

function extrait(source, ancre) {
  const index = source.indexOf(ancre);
  return index < 0 ? `« ${ancre} » absent` : source.slice(index, index + 70).replace(/\s+/g, ' ');
}

await browser.close();
process.exit(failures > 0 ? 1 : 0);
