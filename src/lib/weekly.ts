/**
 * Agregation hebdomadaire des seances.
 *
 * Les semaines commencent le LUNDI, convention francaise. Utiliser le dimanche
 * (defaut de getDay) decalerait chaque semaine d'un jour et ferait basculer
 * les seances du dimanche dans la semaine suivante, ce qui fausserait
 * l'atteinte de l'objectif.
 */

export interface WeekBucket {
  /** Lundi 00h00 de la semaine, horodatage local. */
  start: number;
  /** Dimanche 23h59 de la semaine. */
  end: number;
  /** Nombre de seances terminees dans la semaine. */
  count: number;
  /** Libelle court, par exemple « 14 juil. ». */
  label: string;
  /** Vrai si c'est la semaine en cours. */
  isCurrent: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const SHORT_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

/** Lundi 00h00 de la semaine contenant la date donnee. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  // getDay() : 0 = dimanche. On ramene dimanche a 6 pour que lundi vaille 0.
  const dayIndex = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - dayIndex);
  return result;
}

/**
 * Repartit des seances en semaines glissantes, de la plus ancienne a la plus
 * recente, la derniere etant la semaine en cours.
 */
export function bucketByWeek(
  startedAtList: number[],
  weekCount: number,
  now: Date = new Date(),
): WeekBucket[] {
  const currentStart = startOfWeek(now);

  return Array.from({ length: weekCount }, (_, index) => {
    const start = new Date(currentStart);
    start.setDate(start.getDate() - (weekCount - 1 - index) * 7);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const startMs = start.getTime();
    const endMs = end.getTime();

    return {
      start: startMs,
      end: endMs - 1,
      count: startedAtList.filter((at) => at >= startMs && at < endMs).length,
      label: SHORT_DATE.format(start),
      isCurrent: index === weekCount - 1,
    };
  });
}

/**
 * Serie de semaines consecutives ou l'objectif a ete atteint, en remontant
 * depuis la semaine en cours.
 *
 * La semaine EN COURS ne casse jamais la serie : elle n'est pas finie, il
 * serait absurde d'annoncer une serie rompue un mardi matin. On la compte si
 * elle est deja atteinte, on l'ignore sinon.
 */
export function goalStreak(weeks: WeekBucket[], goal: number): number {
  if (goal <= 0) return 0;

  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const week = weeks[i];
    if (!week) break;

    if (week.count >= goal) {
      streak++;
      continue;
    }
    if (week.isCurrent) continue;
    break;
  }
  return streak;
}

export interface WeekStreak {
  /** Semaines tenues d'affilee, la semaine en cours comprise si deja tenue. */
  current: number;
  /** Vrai si la semaine en cours est deja tenue : la flamme est allumee. */
  thisWeekDone: boolean;
  /** Seances qu'il reste a faire cette semaine pour la tenir. */
  remaining: number;
  /** Plus longue serie jamais tenue, en cours comprise. */
  best: number;
  /** Seances a faire chaque semaine pour qu'elle compte. */
  target: number;
}

/**
 * La flamme de regularite : combien de semaines d'affilee l'objectif est
 * tenu, sur TOUT l'historique, sans la fenetre de huit semaines du graphique.
 *
 * Sans objectif fixe (0), une semaine compte des qu'on y a fait une seance :
 * la flamme ne doit pas rester eteinte pour qui n'a jamais touche au reglage.
 *
 * Meme regle que `goalStreak` : la semaine en cours ne casse rien tant
 * qu'elle n'est pas finie. Elle s'ajoute a la serie le jour ou elle est tenue.
 */
export function weekStreak(
  startedAtList: number[],
  goal: number,
  now: Date = new Date(),
): WeekStreak {
  const target = goal > 0 ? goal : 1;
  const past = startedAtList.filter((at) => at <= now.getTime());

  if (past.length === 0) {
    return { current: 0, thisWeekDone: false, remaining: target, best: 0, target };
  }

  // Nombre de semaines entre la premiere seance et aujourd'hui. Arrondi et non
  // tronque : un changement d'heure rend une semaine plus courte d'une heure.
  const first = startOfWeek(new Date(Math.min(...past))).getTime();
  const span = Math.round((startOfWeek(now).getTime() - first) / (7 * DAY_MS)) + 1;
  const weeks = bucketByWeek(past, span, now);

  const thisWeek = weeks[weeks.length - 1];
  const thisWeekCount = thisWeek?.count ?? 0;

  let best = 0;
  let run = 0;
  for (const week of weeks) {
    if (week.count >= target) {
      run++;
      best = Math.max(best, run);
    } else if (!week.isCurrent) {
      run = 0;
    }
  }

  return {
    current: goalStreak(weeks, target),
    thisWeekDone: thisWeekCount >= target,
    remaining: Math.max(0, target - thisWeekCount),
    best,
    target,
  };
}

/** Jours de la semaine en cours ou au moins une seance a eu lieu (0 = lundi). */
export function daysTrainedThisWeek(startedAtList: number[], now: Date = new Date()): boolean[] {
  const start = startOfWeek(now).getTime();
  const days = Array.from({ length: 7 }, () => false);

  for (const at of startedAtList) {
    const offset = Math.floor((at - start) / DAY_MS);
    if (offset >= 0 && offset < 7) days[offset] = true;
  }
  return days;
}
