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
