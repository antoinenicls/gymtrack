/**
 * Verifie que GymTrack ne prend JAMAIS la sortie audio du telephone.
 *
 * POURQUOI CE TEST EXISTE. Une version a essaye de sonner ecran eteint sur
 * iPhone en confiant au lecteur du telephone une piste « silence puis cloche ».
 * Le principe marchait, mais sur iOS ouvrir une lecture prend la SESSION AUDIO,
 * et iOS ne la partage pas : la musique de l'athlete se mettait en pause des
 * qu'il revenait dans l'app, et le simple deblocage du lecteur — quelques
 * echantillons muets joues au premier appui — suffisait a interrompre le
 * contexte audio et a rendre l'app entierement silencieuse. Les deux symptomes
 * venaient de la meme ligne, et elle tournait a chaque geste.
 *
 * On s'entraine en musique. La regle est donc : aucune lecture, aucune session
 * media, aucun changement de categorie audio. Le son de fin de repos passe par
 * l'horloge audio, qui se melange a ce qui joue au lieu de l'arreter.
 *
 * Ce que le test surveille, sur un parcours complet : lancement de l'app, tap
 * sur un bouton, retour au premier plan, seance avec un repos qui va jusqu'a sa
 * sonnerie, et l'essai des quatre sonneries dans les reglages.
 *
 * Il verifie aussi le contraire du silence : quand le telephone REFUSE le son,
 * l'app doit le dire. Un echec muet ne laisse a l'athlete que « je n'entends
 * rien », sans rien pour agir, et c'est exactement ce qui s'est passe.
 *
 * A lancer sur une BUILD, en mode visible :
 *   npx vite build && npx vite preview --port 4177
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:4177';
const OUT = process.env.OUT ?? 'scripts/out';

// Mode visible : Chromium invisible refuse les lectures audio, et le test ne
// pourrait alors pas distinguer « rien joue » de « rien autorise ».
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

await page.addInitScript(() => {

  /**
   * Tout ce qui pourrait prendre la sortie audio est trace.
   *
   * Un element media cree en memoire n'apparait nulle part dans le document :
   * seul le mouchard peut le voir. On surveille aussi la session audio et les
   * metadonnees du lecteur, qui sont les deux autres facons de se declarer
   * comme lecture principale aupres du systeme.
   */
  window.__intrusions = [];

  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    window.__intrusions.push(`lecture d’un élément média (durée ${this.duration})`);
    return play.apply(this, args);
  };

  const session = navigator.audioSession;
  if (session) {
    let type = session.type;
    Object.defineProperty(navigator.audioSession, 'type', {
      configurable: true,
      get: () => type,
      set: (valeur) => {
        if (valeur !== 'auto') window.__intrusions.push(`session audio passée en « ${valeur} »`);
        type = valeur;
      },
    });
  }

  if ('mediaSession' in navigator) {
    const descripteur = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(navigator.mediaSession),
      'metadata',
    );
    if (descripteur) {
      Object.defineProperty(navigator.mediaSession, 'metadata', {
        configurable: true,
        get: () => descripteur.get.call(navigator.mediaSession),
        set: (valeur) => {
          if (valeur) window.__intrusions.push('métadonnées posées dans le lecteur du système');
          descripteur.set.call(navigator.mediaSession, valeur);
        },
      });
    }
  }
});

const intrusions = () => page.evaluate(() => window.__intrusions);

let echecs = 0;
async function verifier(etape) {
  const trouvees = await intrusions();
  if (trouvees.length > 0) {
    echecs += 1;
    console.log(`ECHEC  ${etape} : ${trouvees.join(' / ')}`);
    await page.evaluate(() => {
      window.__intrusions.length = 0;
    });
  } else {
    console.log(`OK     ${etape}`);
  }
}

await page.goto(`${BASE}/#/seance`, { waitUntil: 'load' });
await page.waitForTimeout(5000);
await verifier('au lancement de l’app');

/* -------------------------------------------------------------------------- */
/* Une seance complete, jusqu'a la cloche                                      */
/* -------------------------------------------------------------------------- */

await page.getByRole('button', { name: 'Démarrer une séance vide' }).click();
await page.waitForTimeout(700);
await verifier('au premier appui');

await page.getByRole('button', { name: /Ajouter des exercices/ }).click();
await page.waitForTimeout(900);
await page.locator('li button[aria-pressed]').first().click();
await page.getByRole('button', { name: /Ajouter \d+ exercices?/ }).click();
await page.waitForTimeout(900);

await page.locator('input[aria-label^="Poids série 1"]').fill('60');
await page.locator('input[aria-label^="Répétitions série 1"]').fill('8');
await page.getByRole('button', { name: 'Valider la série' }).first().click();
await page.waitForTimeout(900);
await verifier('au lancement du repos');

// Le repos est raccourci d'apres ce qu'affiche la barre, jusqu'a une poignee de
// secondes : le repos par defaut depend de l'exercice tire de la bibliotheque.
const restantSec = async () => {
  const barre = page.locator('button[aria-label*="repos"]').first();
  if ((await barre.count()) === 0) return null;
  const texte = (await barre.innerText()).replace(/\s+/g, ' ');
  const [minutes, secondes] = texte.split('/')[0].trim().split(':').map(Number);
  return minutes * 60 + secondes;
};

const moins = page.getByRole('button', { name: 'Retirer 15 secondes' });
for (let garde = 0; garde < 20; garde += 1) {
  const reste = await restantSec();
  if (reste === null || reste - 15 < 6) break;
  await moins.click();
  await page.waitForTimeout(200);
}

const reste = await restantSec();
console.log(`repos raccourci a ${reste} s, on le laisse sonner`);
await page.waitForTimeout((reste + 4) * 1000);
await verifier('à la cloche de fin de repos');

// Retour au premier plan : c'est la que la musique se mettait en pause.
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await page.mouse.click(195, 300);
await page.waitForTimeout(800);
await verifier('au retour dans l’app');

/* -------------------------------------------------------------------------- */
/* Les reglages du son                                                         */
/* -------------------------------------------------------------------------- */

await page.goto(`${BASE}/#/profil/reglages`, { waitUntil: 'load' });
await page.waitForTimeout(2500);

/**
 * L'interrupteur du son doit se couper AU DOIGT, sur l'interrupteur lui-meme.
 *
 * Il a existe un bouton d'ecoute pose dans le libelle de cette ligne, et il a
 * tout casse : sans attribut `for`, un libelle s'associe a son PREMIER
 * descendant etiquetable, et un bouton en est un. Tout le rang declenchait donc
 * le bouton, et le son ne pouvait plus se couper. Bug signale par
 * l'utilisateur, verrouille ici.
 */
const ligneSon = page.locator('label').filter({ hasText: 'Son en fin de repos' }).first();
const caseSon = ligneSon.locator('input[type=checkbox]');
await ligneSon.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const boiteSon = await ligneSon.locator('span[aria-hidden]').boundingBox();

const avantBascule = await caseSon.isChecked();
await page.mouse.click(boiteSon.x + boiteSon.width / 2, boiteSon.y + boiteSon.height / 2);
await page.waitForTimeout(600);
const apresBascule = await caseSon.isChecked();

if (apresBascule === avantBascule) {
  echecs += 1;
  console.log('ECHEC  toucher l’interrupteur du son ne le bascule pas.');
} else {
  console.log('OK     l’interrupteur du son se coupe au doigt');
  // On le remet, la suite du test a besoin du choix de sonnerie.
  await page.mouse.click(boiteSon.x + boiteSon.width / 2, boiteSon.y + boiteSon.height / 2);
  await page.waitForTimeout(600);
}

const sonneries = page.locator('button[aria-pressed]').filter({ hasText: /Cloche|Bip|Triolet|Gong/ });
const combien = await sonneries.count();
console.log(`sonneries proposees : ${combien}`);
if (combien !== 4) {
  echecs += 1;
  console.log(`ECHEC  le choix de sonnerie n’en propose que ${combien}.`);
}
for (let i = 0; i < combien; i += 1) {
  await sonneries.nth(i).click();
  await page.waitForTimeout(1200);
}
await verifier('a l’essai des quatre sonneries');

// La derniere touchee doit etre retenue, et l'etre encore au retour.
const choisieAvant = await sonneries.last().getAttribute('aria-pressed');
await page.goto(`${BASE}/#/seance`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.goto(`${BASE}/#/profil/reglages`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
const choisieApres = await page
  .locator('button[aria-pressed]')
  .filter({ hasText: /Cloche|Bip|Triolet|Gong/ })
  .last()
  .getAttribute('aria-pressed');
if (choisieAvant !== 'true' || choisieApres !== 'true') {
  echecs += 1;
  console.log(`ECHEC  la sonnerie choisie n’est pas retenue (${choisieAvant} puis ${choisieApres}).`);
} else {
  console.log('OK     la sonnerie choisie est retenue d’un écran à l’autre');
}

await page.screenshot({ path: `${OUT}/audio-non-intrusif.png` });

/* -------------------------------------------------------------------------- */
/* Un telephone qui refuse le son doit etre annonce                            */
/* -------------------------------------------------------------------------- */

const sourd = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 },
});
const pageSourde = await sourd.newPage();
await pageSourde.addInitScript(() => {
  // Le systeme refuse de reveiller le contexte : ce que fait iOS quand il ne
  // veut pas donner la parole a la page.
  AudioContext.prototype.resume = () => Promise.reject(new Error('refusé'));
  Object.defineProperty(AudioContext.prototype, 'state', { get: () => 'suspended' });
});

await pageSourde.goto(`${BASE}/#/profil/reglages`, { waitUntil: 'load' });
await pageSourde.waitForTimeout(3000);
const premiere = pageSourde
  .locator('button[aria-pressed]')
  .filter({ hasText: /Cloche|Bip|Triolet|Gong/ })
  .first();
await premiere.scrollIntoViewIfNeeded();
await premiere.click();
await pageSourde.waitForTimeout(1000);

const dit = await pageSourde.locator('body').innerText();
if (dit.includes('refuse le son')) {
  console.log('OK     l’app annonce que le téléphone lui refuse le son');
} else {
  echecs += 1;
  console.log('ECHEC  le son est refusé et l’app n’en dit rien.');
}

// Et le rappel du bouton silence est la en permanence, refus ou pas.
if (!dit.includes('interrupteur sur la tranche')) {
  echecs += 1;
  console.log('ECHEC  le rappel du bouton silence de l’iPhone a disparu.');
} else {
  console.log('OK     le rappel du bouton silence de l’iPhone est visible');
}
await pageSourde.screenshot({ path: `${OUT}/audio-refus.png` });

await browser.close();

console.log(echecs === 0 ? '\nTout est bon.' : `\n${echecs} echec(s).`);
process.exit(echecs === 0 ? 0 : 1);
