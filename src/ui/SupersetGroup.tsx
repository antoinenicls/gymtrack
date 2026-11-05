/**
 * Enveloppe d'un groupe de supersets, commune a TOUS les ecrans.
 *
 * Elle existe parce que le meme superset s'affichait de trois facons
 * differentes : en seance, dans l'editeur de routine, sur la fiche d'une
 * routine. Deux de ces vues portaient encore le meme defaut : un
 * `border-l` pose sur chaque element a l'interieur d'un conteneur `divide-y`,
 * dont la classe de couleur generee par Tailwind
 * (`.divide-* > :not([hidden]) ~ :not([hidden])`) ecrase la couleur de TOUTES
 * les bordures de tous les enfants sauf le premier. Le filet bleu ne
 * s'affichait donc que sur le premier exercice du groupe.
 *
 * Le corollaire : aucun conteneur parent ne doit porter `divide-y` autour de
 * ces groupes. Chaque unite trace elle-meme sa separation.
 */

import type { ReactNode } from 'react';

export function SupersetGroup({
  letter,
  count,
  children,
}: {
  /** Lettre du groupe (A, B…). Null pour un exercice isole. */
  letter: string | null;
  count: number;
  children: ReactNode;
}) {
  // Exercice seul : rien a entourer, il se separe simplement du suivant.
  if (letter === null) {
    return <div className="border-b border-line">{children}</div>;
  }

  return (
    <div className="border-b border-line pt-3">
      <div className="overflow-hidden rounded-r-xl border-l-[3px] border-accent bg-accent-soft/40">
        <p className="px-3 pt-2.5 text-[11px] font-bold uppercase tracking-[1.5px] text-accent">
          Superset {letter} · {count} exercices
        </p>
        {children}
      </div>
    </div>
  );
}

/**
 * Pastille de rang dans un superset (« A1 »), telle qu'on l'ecrit dans un
 * programme. C'est elle qui dit a quel groupe appartient un exercice quand
 * deux supersets se suivent.
 */
export function SupersetTag({ tag }: { tag: string | null }) {
  if (!tag) return null;
  return (
    <span className="num shrink-0 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white">
      {tag}
    </span>
  );
}
