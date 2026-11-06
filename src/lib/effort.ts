/**
 * Echelle d'effort : RPE ou RIR, au choix de l'athlete.
 *
 * Les deux disent la meme chose sous deux angles. Le RPE note l'effort sur 10,
 * le RIR compte les repetitions qu'on avait encore en reserve. Sur l'echelle
 * de Helms, RIR = 10 - RPE : un RPE 8 est un RIR 2, un RPE 10 un RIR 0.
 *
 * La base stocke TOUJOURS du RPE. Le choix de l'echelle n'est qu'une maniere
 * de lire et de saisir : basculer d'un reglage a l'autre ne reecrit rien, ne
 * perd rien, et l'historique d'avant se relit aussitot dans la nouvelle
 * echelle. La conversion etant lineaire, une moyenne convertie est aussi la
 * moyenne des valeurs converties : les agregats restent justes.
 */

export type EffortScale = 'rpe' | 'rir';

export const EFFORT_LABEL: Record<EffortScale, string> = { rpe: 'RPE', rir: 'RIR' };

/** Bornes du RPE stocke. */
const RPE_MIN = 1;
const RPE_MAX = 10;

/** Valeur stockee (RPE) vers la valeur affichee dans l'echelle choisie. */
export function toScale(rpe: number | null, scale: EffortScale): number | null {
  if (rpe === null) return null;
  return scale === 'rir' ? RPE_MAX - rpe : rpe;
}

/**
 * Valeur saisie dans l'echelle choisie vers le RPE stocke, bornee.
 *
 * Un RIR de 12 n'a pas de sens sur l'echelle : il retombe a 9 (RPE 1), comme
 * un RPE de 12 retombe a 10. Un RIR negatif retombe a 0.
 */
export function fromScale(value: number | null, scale: EffortScale): number | null {
  if (value === null) return null;
  const rpe = scale === 'rir' ? RPE_MAX - value : value;
  return Math.min(RPE_MAX, Math.max(RPE_MIN, rpe));
}

/** « RIR 2 », « RPE 8,5 ». Le nombre a la francaise, au demi-point. */
export function formatEffort(rpe: number, scale: EffortScale): string {
  return `${EFFORT_LABEL[scale]} ${formatEffortValue(rpe, scale)}`;
}

/** Le seul nombre, converti, a une decimale au plus : « 1,5 », « 8 ». */
export function formatEffortValue(rpe: number, scale: EffortScale): string {
  const value = toScale(rpe, scale) as number;
  const rounded = Math.round(value * 10) / 10;
  return String(rounded).replace('.', ',');
}
