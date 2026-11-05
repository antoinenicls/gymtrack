/**
 * Calculateur de disques : quoi charger de chaque cote de la barre.
 *
 * Le probleme n'est pas trivial parce que les disques vont par PAIRES. Charger
 * 100 kg sur une barre de 20 kg, c'est 40 kg par cote, pas 80. Et tous les
 * poids ne sont pas atteignables : avec des disques standard, 101 kg n'existe
 * pas. On renvoie donc aussi l'ecart, plutot que de mentir.
 */

export interface PlateSolution {
  /** Disques d'un seul cote, du plus lourd au plus leger. */
  perSide: number[];
  /** Poids total reellement atteint, barre comprise. */
  achievedKg: number;
  /** Ecart avec la cible. 0 = pile poil. */
  deltaKg: number;
  exact: boolean;
  /** True si la cible est sous le poids de la barre a vide. */
  belowBar: boolean;
}

/** Disques standard d'une salle francaise, par paire. */
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const DEFAULT_BAR_KG = 20;

export function computePlates(
  targetKg: number,
  barKg: number = DEFAULT_BAR_KG,
  availablePlatesKg: number[] = DEFAULT_PLATES_KG,
): PlateSolution {
  const empty: PlateSolution = {
    perSide: [],
    achievedKg: barKg,
    deltaKg: round(barKg - targetKg),
    exact: targetKg === barKg,
    belowBar: targetKg < barKg,
  };

  if (!Number.isFinite(targetKg) || targetKg <= 0) return { ...empty, belowBar: true };
  if (targetKg <= barKg) return empty;

  const perSideTarget = (targetKg - barKg) / 2;
  const plates = [...availablePlatesKg].sort((a, b) => b - a);

  // Glouton du plus lourd au plus leger. Avec des disques standard, dont chaque
  // valeur divise a peu pres la suivante, le glouton est optimal ; on ne
  // deroule pas une programmation dynamique pour rien.
  const perSide: number[] = [];
  let remaining = perSideTarget;

  for (const plate of plates) {
    // Tolerance flottante : 2.5 + 1.25 accumule des miettes binaires.
    while (remaining >= plate - 1e-9) {
      perSide.push(plate);
      remaining = round(remaining - plate, 4);
    }
  }

  const loadedPerSide = perSide.reduce((sum, p) => sum + p, 0);
  const achievedKg = round(barKg + loadedPerSide * 2);

  return {
    perSide,
    achievedKg,
    deltaKg: round(achievedKg - targetKg),
    exact: Math.abs(achievedKg - targetKg) < 1e-9,
    belowBar: false,
  };
}

/**
 * Regroupe les disques identiques pour l'affichage : [25, 25, 10] devient
 * "2 x 25, 1 x 10", nettement plus lisible qu'une liste brute au bord du banc.
 */
export function groupPlates(perSide: number[]): Array<{ plateKg: number; count: number }> {
  const counts = new Map<number, number>();
  for (const plate of perSide) counts.set(plate, (counts.get(plate) ?? 0) + 1);
  return [...counts.entries()]
    .map(([plateKg, count]) => ({ plateKg, count }))
    .sort((a, b) => b.plateKg - a.plateKg);
}

/** Plus petit increment atteignable : deux fois le plus petit disque. */
export function smallestIncrementKg(availablePlatesKg: number[] = DEFAULT_PLATES_KG): number {
  if (availablePlatesKg.length === 0) return 0;
  return round(Math.min(...availablePlatesKg) * 2);
}

function round(n: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
