/**
 * Grille annuelle d'assiduite : une colonne par semaine, une ligne par jour.
 *
 * Les colonnes commencent le LUNDI, comme le reste de l'app (voir weekly.ts).
 * Les jours se comptent en dates LOCALES (annee, mois, jour) et non en
 * tranches de 24 h : un changement d'heure ferait sinon glisser une seance de
 * 23h30 sur le lendemain.
 */

import { startOfWeek } from './weekly';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface YearDay {
  /** Minuit local du jour. */
  date: number;
  /** Nombre de seances commencees ce jour-la. */
  count: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface YearGrid {
  year: number;
  /** Colonnes de 7 cases, lundi en tete ; null hors de l'annee. */
  weeks: (YearDay | null)[][];
  /** Colonne ou commence chaque mois, pour poser les libelles. */
  months: { month: number; column: number }[];
  /** Jours distincts avec au moins une seance. */
  activeDays: number;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function buildYearGrid(
  startedAtList: number[],
  year: number,
  now: Date = new Date(),
): YearGrid {
  const counts = new Map<string, number>();
  for (const at of startedAtList) {
    const key = dayKey(new Date(at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const todayKey = dayKey(now);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const first = startOfWeek(new Date(year, 0, 1));
  const last = startOfWeek(new Date(year, 11, 31));
  // Arrondi : une semaine qui traverse un changement d'heure dure 167 ou 169 h.
  const columns = Math.round((last.getTime() - first.getTime()) / WEEK_MS) + 1;

  const weeks: (YearDay | null)[][] = [];
  const months: { month: number; column: number }[] = [];
  let activeDays = 0;

  for (let column = 0; column < columns; column++) {
    const week: (YearDay | null)[] = [];
    for (let row = 0; row < 7; row++) {
      const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + column * 7 + row);
      if (date.getFullYear() !== year) {
        week.push(null);
        continue;
      }
      if (date.getDate() === 1) months.push({ month: date.getMonth(), column });

      const count = counts.get(dayKey(date)) ?? 0;
      if (count > 0) activeDays++;
      week.push({
        date: date.getTime(),
        count,
        isToday: dayKey(date) === todayKey,
        isFuture: date.getTime() > todayStart,
      });
    }
    weeks.push(week);
  }

  return { year, weeks, months, activeDays };
}
