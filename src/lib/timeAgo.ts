/**
 * Depuis combien de temps, dit comme on le dirait a voix haute.
 *
 * Une date seche oblige a un calcul mental : « 12/05, on est le 14, donc
 * avant-hier ». Ce qu'on cherche a savoir en ouvrant la liste des seances,
 * c'est laquelle est la plus fraiche, et une phrase le dit d'un coup d'oeil.
 *
 * Le relatif a pourtant une portee COURTE. Passe une semaine, « il y a onze
 * jours » ne situe plus rien, et « il y a trois ans » situe encore moins :
 * c'est la date qui redevient l'information utile. La fonction rend donc null
 * au-dela du seuil, et chaque ecran garde son propre format de date.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Au-dela, on repasse a la date. Une semaine pleine. */
const SEUIL_JOURS = 7;

/**
 * Phrase relative, ou null s'il vaut mieux afficher la date.
 *
 * Le compte se fait en JOURS DE CALENDRIER, jamais en tranches de 24 h. C'est
 * ce qui separe les deux facons de parler : tant qu'aucun minuit n'a ete
 * franchi, la seance est celle du jour et l'heure la situe (« il y a 3
 * heures ») ; des qu'un minuit est passe, elle est d'hier et on le dit. Compter
 * en tranches donnerait « il y a 22 heures » pour une seance d'hier soir, et
 * « il y a 2 jours » des ce soir pour une seance d'hier matin : deux phrases
 * que personne ne prononce.
 */
export function timeAgo(at: number, now: number = Date.now()): string | null {
  const jours = calendarDaysBetween(at, now);

  if (jours <= 0) {
    // Une date dans l'avenir n'a rien de normal, mais l'horloge du telephone
    // peut avancer de quelques minutes sur celle qui a ecrit la seance.
    const ms = Math.max(now - at, 0);
    if (ms < MINUTE) return 'à l’instant';
    if (ms < HOUR) {
      const minutes = Math.floor(ms / MINUTE);
      return minutes === 1 ? 'il y a une minute' : `il y a ${minutes} minutes`;
    }
    const heures = Math.floor(ms / HOUR);
    return heures === 1 ? 'il y a une heure' : `il y a ${heures} heures`;
  }

  if (jours === 1) return 'hier';
  if (jours < SEUIL_JOURS) return `il y a ${jours} jours`;
  return null;
}

/** Nombre de minuits franchis entre les deux instants, heure locale. */
function calendarDaysBetween(at: number, now: number): number {
  const debut = midnight(at);
  const fin = midnight(now);
  // Division par un jour PLEIN apres remise a minuit : les changements
  // d'heure decalent la journee d'une heure, l'arrondi les absorbe.
  return Math.round((fin - debut) / DAY);
}

function midnight(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
