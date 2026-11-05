/**
 * 1RM estime par la formule de Brzycki : poids / (1.0278 - 0.0278 x reps).
 *
 * Attention au domaine de validite : le denominateur s'annule a 36.97 reps et
 * devient negatif au-dela, ce qui renverrait un 1RM negatif. Brzycki n'a de
 * toute facon aucun sens passe une douzaine de repetitions (la formule diverge
 * violemment). On plafonne donc a 12 reps et on signale que l'estimation
 * n'est plus fiable, plutot que d'afficher un chiffre inventé.
 */

/** Au-dela, Brzycki n'est plus une estimation mais une extrapolation. */
export const BRZYCKI_MAX_RELIABLE_REPS = 12;

export interface E1rmResult {
  value: number;
  /** False si l'estimation sort du domaine ou Brzycki tient debout. */
  reliable: boolean;
}

export function estimateE1rm(weightKg: number, reps: number): E1rmResult | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return null;
  if (weightKg <= 0 || reps < 1) return null;

  // Une serie a 1 rep EST le 1RM, pas besoin de l'estimer.
  if (reps === 1) return { value: round(weightKg), reliable: true };

  const denominator = 1.0278 - 0.0278 * reps;
  if (denominator <= 0) return null;

  return {
    value: round(weightKg / denominator),
    reliable: reps <= BRZYCKI_MAX_RELIABLE_REPS,
  };
}

/** Valeur seule, 0 si incalculable. Pratique pour trier et comparer. */
export function e1rmValue(weightKg: number, reps: number): number {
  return estimateE1rm(weightKg, reps)?.value ?? 0;
}

/**
 * Charge a viser pour atteindre un E1RM donne sur un nombre de reps.
 * Sert au moteur de surcharge progressive.
 */
export function weightForReps(e1rm: number, reps: number): number | null {
  if (!Number.isFinite(e1rm) || e1rm <= 0 || reps < 1) return null;
  const denominator = 1.0278 - 0.0278 * reps;
  if (denominator <= 0) return null;
  return round(e1rm * denominator);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
