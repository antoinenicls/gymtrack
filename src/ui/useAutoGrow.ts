/**
 * Champ de texte qui prend la hauteur de son contenu.
 *
 * Trois champs de l'app tentaient de le faire avec `rows`, en comptant les
 * retours a la ligne du texte. Ca ne pouvait pas marcher : `rows` ignore les
 * lignes produites par le RETOUR AUTOMATIQUE. Une note d'une seule phrase un
 * peu longue restait donc haute d'une ligne, avec un defilement interne qui
 * n'affichait que sa fin, et il fallait faire glisser dans un cadre de 20 px
 * pour lire le debut.
 *
 * Le champ qui l'utilise doit porter `overflow-hidden` : il fait exactement la
 * taille de son texte, il n'a donc rien a faire defiler, et une barre de
 * defilement laisserait croire qu'il reste du texte cache.
 */

import { useLayoutEffect, type RefObject } from 'react';

export function useAutoGrow(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
): void {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    /**
     * La remise a `auto` avant la mesure n'est pas superflue : `scrollHeight`
     * ne redescend jamais sous la hauteur deja posee en style, donc sans elle
     * le champ grandirait sans jamais retrecir quand on efface.
     */
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [ref, value]);
}
