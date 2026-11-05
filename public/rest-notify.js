/**
 * Notification de fin de repos, ARMEE A L'AVANCE.
 *
 * Importe par le service worker genere (voir `workbox.importScripts` dans
 * vite.config.ts). Ce fichier n'est PAS un service worker a lui seul : il ne
 * fait qu'ajouter des ecouteurs a celui de l'app.
 *
 * POURQUOI LE WORKER. La page ne peut pas afficher elle-meme la notification :
 * des que l'ecran s'eteint, le systeme la gele, ses minuteurs s'arretent, et le
 * moment de la fin passe sans que personne ne le constate. Le worker, lui,
 * survit a la page et tient l'heure sans elle.
 *
 * LA REGLE. La page arme des le LANCEMENT du repos, puis rearme en quittant
 * l'ecran. C'est le worker qui decide, a l'heure dite, s'il y a lieu d'afficher.
 * L'armement ne se faisait avant qu'au passage en arriere-plan, par un chemin
 * qui attendait la base et le worker : la page etait gelee avant d'avoir
 * poste son message, et rien ne sonnait. Pire, ce message en suspens partait
 * au retour dans l'app, avec une echeance passee, et la notification sortait
 * alors sous les yeux, longtemps apres la fin.
 *
 * DEUX REFUS au moment d'afficher :
 *  - une fenetre de l'app est a l'ecran : la barre de repos et le son y
 *    previennent deja, une notification par-dessus serait du bruit ;
 *  - l'heure est passee depuis plus de `LATE_MS` : le worker a dormi avec le
 *    telephone, et annoncer « repos termine » a son reveil, c'est-a-dire au
 *    retour dans l'app, n'apprend plus rien a personne.
 *
 * TROIS MESSAGES, parce que trois choses differentes arrivent :
 *  - `arm`    : poser l'echeance (remplace la precedente) ;
 *  - `cancel` : oublier l'echeance, SANS toucher a ce qui est affiche. Le repos
 *               s'arrete aussi tout seul a la fin : fermer a ce moment-la
 *               retirait la notification une seconde apres son apparition ;
 *  - `clear`  : fermer ce qui est affiche, au retour dans l'app.
 *
 * LIMITE ASSUMEE : un worker maintenu par `waitUntil` survit a un repos de
 * quelques minutes sur Android, pas a tout. Sur iPhone, il dort avec l'app, et
 * aucune API web ne programme une notification locale sans serveur de push.
 * Le declencheur horodate (`TimestampTrigger`) qui l'aurait permis a ete
 * abandonne par Chrome sans jamais sortir de l'essai : il n'est plus tente.
 */

/* eslint-env serviceworker */

const REST_TAG = 'gymtrack-rest';
const REST_TITLE = 'GymTrack';
const REST_BODY = 'Repos terminé. À toi de jouer.';

/** Retard au-dela duquel la fin du repos ne s'annonce plus. */
const LATE_MS = 10000;

/**
 * Numero de l'echeance en cours.
 *
 * Chaque message le fait avancer : une attente dont le numero n'est plus le
 * bon a ete remplacee ou annulee, et ne doit rien afficher.
 */
let restGeneration = 0;

function restOptions() {
  return {
    body: REST_BODY,
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: REST_TAG,
    // Pas de `renotify` : la page peut afficher la meme notification de son
    // cote si elle est encore vivante. Meme etiquette, donc remplacement
    // silencieux au lieu d'une seconde alerte pour un seul repos.
    silent: false,
  };
}

/** Ferme les notifications de repos affichees. */
async function closeRestNotifications() {
  if (!self.registration || !self.registration.getNotifications) return;
  try {
    const shown = await self.registration.getNotifications({ tag: REST_TAG });
    for (const notification of shown) notification.close();
  } catch {
    // Rien a fermer.
  }
}

async function appOnScreen() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return windows.some((client) => client.visibilityState === 'visible');
}

async function armRest(endsAt, mine) {
  // Une notification d'un repos precedent n'a plus rien a dire.
  await closeRestNotifications();

  const delay = endsAt - Date.now();
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  if (mine !== restGeneration) return;
  if (Date.now() - endsAt > LATE_MS) return;
  if (await appOnScreen()) return;
  if (mine !== restGeneration) return;

  await self.registration.showNotification(REST_TITLE, restOptions());
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'gymtrack-rest-arm' && typeof data.endsAt === 'number') {
    restGeneration += 1;
    event.waitUntil(armRest(data.endsAt, restGeneration));
    return;
  }

  if (data.type === 'gymtrack-rest-cancel') {
    restGeneration += 1;
    return;
  }

  if (data.type === 'gymtrack-rest-clear') {
    event.waitUntil(closeRestNotifications());
    return;
  }

  // Message des versions precedentes de la page, encore ouvertes le temps de
  // la mise a jour : annuler ET fermer, comme elles l'attendent.
  if (data.type === 'gymtrack-rest-disarm') {
    restGeneration += 1;
    event.waitUntil(closeRestNotifications());
  }
});

/**
 * Toucher la notification ramene DANS l'app, sans en ouvrir une seconde copie.
 *
 * Sans cet ecouteur, l'appui ne faisait rien du tout : c'est pourtant le geste
 * naturel quand la notification arrive sur l'ecran verrouille, et le repos
 * qu'on vient d'y lire se termine dans GymTrack.
 */
self.addEventListener('notificationclick', (event) => {
  if (event.notification.tag !== REST_TAG) return;
  event.notification.close();

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clients[0];
      if (existing) {
        await existing.focus();
        return;
      }
      if (self.clients.openWindow) await self.clients.openWindow('/');
    })(),
  );
});
