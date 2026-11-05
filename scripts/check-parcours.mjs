/**
 * Parcours COMPLET de l'app, en une passe.
 *
 * Les autres scripts de ce dossier verifient un point precis. Celui-ci sert
 * d'apres-coup : apres une refonte transverse, il repond a la seule question
 * qui compte, « est-ce que quelque chose a casse ailleurs ». Il traverse les
 * six onglets, la fiche d'un exercice, une seance de bout en bout et l'editeur
 * de seance enregistree, et releve la moindre erreur console.
 *
 *   node scripts/check-parcours.mjs
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5177';
const OUT = process.env.OUT ?? 'scripts/out';
const errors = [];
const steps = [];
let failures = 0;

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();

page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

const shot = (n) => page.screenshot({ path: `${OUT}/parcours-${n}.png` });

/**
 * Toutes les surfaces modales ne se ferment pas pareil : les feuilles portent
 * un « Fermer », le menu de type de serie est centre et se ferme au clic hors
 * cadre, le resume de fin propose « Non merci ». On tente les trois.
 */
const closeSheets = async () => {
  for (let i = 0; i < 5; i++) {
    const fermer = page.getByText('Fermer', { exact: true });
    const nonMerci = page.getByText('Non merci', { exact: true });
    if (await fermer.count()) {
      await fermer.last().click({ timeout: 3000 }).catch(() => {});
    } else if (await nonMerci.count()) {
      await nonMerci.last().click({ timeout: 3000 }).catch(() => {});
    } else {
      // Modale centree : son voile est un bouton sans texte, seulement
      // etiquete pour les lecteurs d'ecran.
      const voile = page.locator('[aria-label="Fermer"]');
      if ((await voile.count()) === 0) break;
      await voile.last().click({ timeout: 3000, force: true }).catch(() => {});
    }
    await page.waitForTimeout(450);
  }
};

/**
 * Le rattrapage ne se declenche QUE sur echec. Le passer apres chaque etape
 * refermait la feuille que l'etape venait d'ouvrir pour la suivante, et toutes
 * les etapes d'apres echouaient sur un ecran qui n'existait plus.
 */
const step = async (name, fn) => {
  const before = errors.length;
  try {
    await fn();
    if (errors.length > before) failures++;
    steps.push(`${errors.length > before ? 'ERREUR' : 'OK    '} ${name}`);
  } catch (e) {
    failures++;
    steps.push(`ECHEC  ${name} : ${e.message.split('\n')[0].slice(0, 130)}`);
    await shot(`echec-${name.replace(/[^a-z0-9]+/gi, '-')}`);
    await closeSheets();
  }
};

/** Fermeture explicite, demandee par l'etape qui a ouvert la feuille. */
const close = async () => { await closeSheets(); };

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// ---------- Onglets ----------
for (const tab of ['Profil', 'Historique', 'Séance', 'Exercices', 'Analyse']) {
  await step(`onglet ${tab}`, async () => {
    const lien = page.getByRole('link', { name: tab, exact: true });
    await lien.click();
    await page.waitForTimeout(900);
    const body = await page.locator('body').innerText();
    if (/undefined|NaN|Une erreur/.test(body)) throw new Error('texte suspect: ' + body.slice(0, 100));
    await shot(`tab-${tab}`);
  });
}

// ---------- Bibliotheque ----------
await step('Exercices : recherche', async () => {
  await page.getByRole('link', { name: 'Exercices', exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByRole('searchbox').fill('squat');
  await page.waitForTimeout(500);
  if (!(await page.locator('body').innerText()).includes('Squat')) throw new Error('recherche vide');
});

await step('Fiche exercice (route) : contenu', async () => {
  await page.locator('a[href*="/exercices/"]').first().click();
  await page.waitForTimeout(1200);
  const body = await page.locator('body').innerText();
  if (!/Ma note/i.test(body)) throw new Error('bloc note absent');
  if (!body.includes('1RM estimé')) throw new Error('stats absentes');
  if (!body.includes('Supprimer cet exercice')) throw new Error('suppression absente de la route');
  await shot('fiche-route');
});

await step('Fiche : note persistee apres reload', async () => {
  await page.getByRole('textbox', { name: /Note sur cet exercice/ }).fill('Repere test');
  await page.locator('h1').click();
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);
  const v = await page.getByRole('textbox', { name: /Note sur cet exercice/ }).inputValue();
  if (v !== 'Repere test') throw new Error(`note non persistee: "${v}"`);
});

await step('Fiche : retour arriere', async () => {
  await page.getByRole('button', { name: 'Retour' }).click();
  await page.waitForTimeout(900);
  if (!page.url().includes('/exercices')) throw new Error('retour casse: ' + page.url());
});

// ---------- Seance ----------
await step('Seance : demarrage', async () => {
  await page.getByRole('link', { name: 'Séance', exact: true }).click();
  await page.waitForTimeout(900);
  const start = page.getByText('Démarrer une séance vide');
  if (await start.count()) await start.click();
  else await page.getByText('Reprendre').first().click();
  await page.waitForTimeout(1100);
});

await step('Selecteur : filtre par groupe musculaire', async () => {
  await page.getByText('Ajouter des exercices').first().click();
  await page.waitForTimeout(900);
  const chip = page.locator('button').filter({ hasText: /^Dos$/ }).first();
  await chip.click();
  await page.waitForTimeout(500);
  if ((await page.locator('button[aria-label^="Détails de"]').count()) === 0)
    throw new Error('aucune icone info apres filtre');
  await page.locator('button').filter({ hasText: /^Tous$/ }).first().click();
  await page.waitForTimeout(400);
});

await step('Selecteur : fiche en feuille + ajout', async () => {
  await page.locator('button[aria-label^="Détails de"]').first().click();
  await page.waitForTimeout(1000);
  const body = await page.locator('body').innerText();
  if (!body.includes('1RM estimé')) throw new Error('fiche non rendue');
  if (body.includes('Supprimer cet exercice')) throw new Error('suppression presente dans le selecteur');
  await shot('fiche-feuille');
  await page.getByRole('button', { name: 'Ajouter à la sélection' }).click();
  await page.waitForTimeout(700);
  for (const name of ['Squat barre', 'Rowing barre']) {
    const row = page.locator('li').filter({ hasText: name }).first();
    if (await row.count()) await row.locator('button').first().click();
  }
  await page.getByRole('button', { name: /^Ajouter \d+ exercice/ }).click();
  await page.waitForTimeout(1300);
  await shot('seance-3ex');
});

await step('Seance : saisie charge + reps + validation', async () => {
  const kg = page.locator('input[aria-label^="Poids série"]').first();
  await kg.fill('60');
  const reps = page.locator('input[aria-label^="Répétitions série"]').first();
  await reps.fill('8');
  await page.waitForTimeout(400);
  await page.locator('button[aria-label*="alider"]').first().click();
  await page.waitForTimeout(900);
  const header = await page.locator('header').first().innerText();
  if (!/1 série/.test(header)) throw new Error('serie non comptee: ' + header.replace(/\n/g, ' '));
  await shot('saisie');
});

await step('Seance : note en un seul appui', async () => {
  await page.getByRole('button', { name: 'Ajouter une note' }).first().click();
  await page.waitForTimeout(400);
  const f = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  if (f !== 'Note sur l’exercice') throw new Error('champ non focalise: ' + f);
  await page.keyboard.type('note smoke');
  // On sort du champ par un element INERTE : le nom de l'exercice ouvre
  // desormais sa fiche, et la feuille bloquerait toutes les etapes suivantes.
  await page.getByText('PRÉCÉDENT').first().click();
  await page.waitForTimeout(700);
  const nv = await page.getByRole('textbox', { name: 'Note sur l’exercice' }).first().inputValue();
  if (nv !== 'note smoke') throw new Error('note non conservee: ' + nv);
});

await step('Seance : reorganisation', async () => {
  await page.getByRole('button', { name: 'Réorganiser les exercices' }).click();
  await page.waitForTimeout(900);
  const names = () => page.locator('li p.font-semibold').allInnerTexts();
  const before = await names();
  await page.getByRole('button', { name: /^Descendre / }).first().click();
  await page.waitForTimeout(600);
  if (JSON.stringify(before) === JSON.stringify(await names())) throw new Error('ordre inchange');
  await shot('reorder');
  await close();
});

await step('Seance : menu « … » de l exercice', async () => {
  await page.getByRole('button', { name: 'Options de l’exercice' }).first().click();
  await page.waitForTimeout(1000);
  await shot('menu-exercice');
  const body = await page.locator('body').innerText();
  if (!/temps de repos/i.test(body)) throw new Error('menu incomplet');
  if (!/générer l’échauffement/i.test(body)) throw new Error('echauffement absent');
  if (!/retirer de la séance/i.test(body)) throw new Error('retrait absent');
  await close();
});

await step('Seance : superset', async () => {
  const link = page.locator('button[aria-label="Lier en superset"]').first();
  await link.click();
  await page.waitForTimeout(900);
  if (!/superset/i.test(await page.locator('body').innerText())) throw new Error('superset non forme');
  await shot('superset');
});

await step('Seance : calculateur de disques', async () => {
  await page.locator('header button').first().click();
  await page.waitForTimeout(900);
  await shot('disques');
  if (!/barre/i.test(await page.locator('body').innerText())) throw new Error('calculateur vide');
  await close();
});

await step('Seance : terminer + resume', async () => {
  await page.getByText('Terminer').first().click();
  await page.waitForTimeout(1400);
  await shot('fin-seance');
  const body = await page.locator('body').innerText();
  if (/undefined|NaN/.test(body)) throw new Error('resume corrompu');
  if (!/volume total/i.test(body)) throw new Error('resume sans volume');
  await close();
});

await step('Historique renseigne', async () => {
  await page.getByRole('link', { name: 'Historique', exact: true }).click();
  await page.waitForTimeout(1300);
  await shot('historique');
  const body = await page.locator('body').innerText();
  if (/undefined|NaN/.test(body)) throw new Error('historique corrompu');
});

// ---------- Editeur ----------
await step('Editeur : creation', async () => {
  await page.goto(`${BASE}/#/routines/nouvelle`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await page.getByRole('textbox', { name: 'Nom de la séance' }).fill('Smoke Push');
  await page.getByRole('button', { name: 'Ajouter des exercices' }).click();
  await page.waitForTimeout(900);
  for (const name of ['Développé couché', 'Squat barre', 'Rowing barre']) {
    const row = page.locator('li').filter({ hasText: name }).first();
    if (await row.count()) await row.locator('button').first().click();
  }
  await page.getByRole('button', { name: /^Ajouter \d+ exercice/ }).click();
  await page.waitForTimeout(1300);
  await shot('editeur');
});

await step('Editeur : consigne en un appui', async () => {
  await page.getByRole('button', { name: 'Ajouter une consigne' }).first().click();
  await page.waitForTimeout(400);
  const f = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  if (f !== 'Consigne pour cet exercice') throw new Error('champ non focalise: ' + f);
  await page.keyboard.type('Tempo 3-1-1');
  await page.getByText('Tu construis la séance', { exact: false }).click();
  await page.waitForTimeout(700);
  const cv = await page.getByRole('textbox', { name: 'Consigne pour cet exercice' }).first().inputValue();
  if (cv !== 'Tempo 3-1-1') throw new Error('consigne perdue: ' + cv);
});

await step('Editeur : menu « … » allege', async () => {
  await page.getByRole('button', { name: 'Options de l’exercice' }).first().click();
  await page.waitForTimeout(1000);
  const body = await page.locator('body').innerText();
  if (!/temps de repos/i.test(body)) throw new Error('repos absent');
  if (/Monter|Descendre/.test(body)) throw new Error('fleches encore dans le menu');
  await shot('editeur-menu');
  await close();
});

await step('Editeur : reorganisation', async () => {
  await page.getByRole('button', { name: 'Réorganiser les exercices' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^Descendre / }).first().click();
  await page.waitForTimeout(600);
  await shot('editeur-reorder');
  await close();
});

await step('Editeur : cible + type de serie', async () => {
  await page.locator('input[aria-label*="Charge cible"]').first().fill('80');
  await page.waitForTimeout(400);
  await page.locator('button[aria-label^="Série 1, type"]').first().click();
  await page.waitForTimeout(900);
  await shot('type-serie');
  await close();
});

await step('Editeur : enregistrement', async () => {
  await shot('avant-enregistrement');
  await page.getByRole('button', { name: 'Enregistrer la séance' }).click();
  await page.waitForTimeout(1600);
  if (!(await page.locator('body').innerText()).includes('Smoke Push')) throw new Error('routine non enregistree');
  await shot('routine-enregistree');
});

// ---------- Analyse / Profil / persistance ----------
await step('Analyse : personnaliser', async () => {
  await page.getByRole('link', { name: 'Analyse', exact: true }).click();
  await page.waitForTimeout(1300);
  const btn = page.getByRole('button', { name: /Personnaliser/ });
  if ((await btn.count()) === 0) throw new Error('bouton personnaliser absent');
  await btn.first().click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^Descendre / }).first().click();
  await page.waitForTimeout(500);
  await shot('analyse-perso');
  await close();
});

await step('Profil', async () => {
  await page.getByRole('link', { name: 'Profil', exact: true }).click();
  await page.waitForTimeout(1300);
  await shot('profil');
  if (/undefined|NaN/.test(await page.locator('body').innerText())) throw new Error('profil corrompu');
});

await step('Persistance apres rechargement', async () => {
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.getByRole('link', { name: 'Séance', exact: true }).click();
  await page.waitForTimeout(1200);
  if (!(await page.locator('body').innerText()).includes('Smoke Push')) throw new Error('routine perdue au reload');
  await shot('apres-reload');
});

for (const s of steps) console.log(s);
console.log(
  errors.length === 0
    ? '\nOK     aucune erreur console'
    : `\nECHEC  erreurs console :\n${[...new Set(errors)].join('\n')}`,
);

await browser.close();
process.exit(failures > 0 ? 1 : 0);
