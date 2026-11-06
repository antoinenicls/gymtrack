/**
 * Champ numerique a virgule, pour les charges et les notes d'effort.
 *
 * Le probleme qu'il resout : les deux cellules de saisie de l'app etaient
 * controlees sur la valeur RELUE depuis le nombre. Taper « 37, » donnait
 * `Number("37.")`, soit 37, que le champ reaffichait aussitot « 37 » : la
 * virgule disparaissait sous les doigts et 37,5 kg etait tout simplement
 * impossible a saisir.
 *
 * On garde donc le TEXTE tape tant que le champ a le focus, et on ne repasse a
 * l'affichage canonique qu'en sortant. Le nombre, lui, est publie a chaque
 * frappe : rien n'attend le blur pour etre enregistre.
 */

import { useState } from 'react';
import { formatWeight } from '@/lib/metrics';

/**
 * Ramene une frappe a un nombre decimal francais valide.
 *
 * Le point est accepte et converti : selon la langue du clavier, le pave
 * numerique iOS envoie l'un ou l'autre, et refuser le point ferait un champ
 * qui marche sur un telephone et pas sur l'autre.
 */
export function normaliseDecimal(raw: string, maxDecimals: number): string {
  const kept = raw.replace(/\./g, ',').replace(/[^\d,]/g, '');
  const [whole = '', ...rest] = kept.split(',');
  if (rest.length === 0) return whole;
  if (maxDecimals === 0) return whole;
  // Les virgules en trop sont absorbees plutot que refusees : une frappe
  // maladroite ne doit pas bloquer la saisie.
  return `${whole},${rest.join('').slice(0, maxDecimals)}`;
}

/**
 * Vrai si la frappe depasse le plafond du champ.
 *
 * Une frappe qui depasse est REFUSEE, le champ garde ce qu'il affichait : on
 * ne laisse pas ecrire « 999 » dans une note d'effort sur 10 pour la corriger
 * en douce au moment de quitter le champ. Le plancher, lui, ne bloque rien :
 * les etats intermediaires d'une saisie (« 0 » avant « 0,5 ») passent par en
 * dessous, et c'est l'enregistrement qui borne.
 */
export function exceedsMax(text: string, max: number | undefined): boolean {
  if (max === undefined || text === '') return false;
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > max;
}

export function useDecimalInput({
  value,
  onChange,
  maxDecimals = 2,
  max,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  /** 2 pour une charge, 1 pour un RPE au demi, 0 pour des repetitions. */
  maxDecimals?: number;
  /** Plafond de saisie. Absent = aucun (une charge, des repetitions). */
  max?: number;
}): {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur: () => void;
} {
  // `null` signifie « pas de saisie en cours » : l'affichage suit alors la
  // valeur enregistree, et se remet donc a jour quand elle change ailleurs.
  const [draft, setDraft] = useState<string | null>(null);

  return {
    value: draft ?? (value === null ? '' : formatWeight(value)),
    onChange: (event) => {
      const next = normaliseDecimal(event.currentTarget.value, maxDecimals);
      if (exceedsMax(next, max)) return;
      setDraft(next);
      if (next === '') return onChange(null);
      const parsed = Number(next.replace(',', '.'));
      if (Number.isFinite(parsed) && parsed >= 0) onChange(parsed);
    },
    onFocus: (event) => event.currentTarget.select(),
    onBlur: () => setDraft(null),
  };
}
