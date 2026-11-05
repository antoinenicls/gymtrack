/**
 * Enveloppe des paliers d'une serie degressive.
 *
 * Meme role que `SupersetGroup` pour les exercices, et meme raison d'etre
 * partagee : la degressive s'affiche en seance, dans l'editeur et dans
 * l'historique, et un encadre qui differe d'un ecran a l'autre oblige a
 * reapprendre le code a chaque fois.
 *
 * Ce que l'encadre doit dire, et que trois lignes empilees ne disaient pas :
 * c'est UNE serie. On y lisait « dégressive » sur une ligne sans savoir ni
 * combien de paliers suivaient, ni a quelle charge. L'entete annonce le
 * nombre, et chaque palier garde ses propres champs de charge et de
 * repetitions.
 */

import type { ReactNode } from 'react';

export function DropGroup({
  count,
  toFailure = false,
  bodyClassName,
  children,
}: {
  count: number;
  /** Vrai des qu'un palier est mene jusqu'a l'echec. */
  toFailure?: boolean;
  /**
   * Classes posees sur le conteneur des paliers.
   *
   * Existe parce que les deux ecrans qui s'en servent n'ont pas le meme
   * besoin : en seance les lignes portent un fond blanc qu'il faut effacer
   * pour voir la teinte du groupe, tandis que dans l'historique elles n'en ont
   * pas et gardent le leur, qui signale un record. Forcer la transparence pour
   * tout le monde effacait ce signal.
   */
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-3 my-1 overflow-hidden rounded-lg border-l-[3px] border-accent bg-accent-soft/40">
      <p className="px-3 pt-1.5 text-[11px] font-bold uppercase tracking-[1.5px] text-accent">
        Dégressive · {count} paliers
        {/* L'echec se lit sur l'encadre et pas seulement sur la ligne : c'est
            une propriete de la descente entiere, pas d'un palier isole. */}
        {toFailure && <span className="text-red-600"> · à l’échec</span>}
      </p>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
