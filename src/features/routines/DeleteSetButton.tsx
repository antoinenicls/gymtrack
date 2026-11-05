/**
 * Croix de suppression d'une serie, avec confirmation en deux temps.
 *
 * La croix est a portee immediate du pouce, sur la meme ligne que les champs
 * de saisie, et une serie supprimee ne se recupere pas. Une feuille de
 * confirmation serait disproportionnee pour un geste qu'on repete en
 * construisant une seance ; un ARMEMENT suffit : premier appui, la croix passe
 * au rouge et annonce ce qu'elle va faire ; second appui, elle le fait.
 *
 * Elle se desarme des qu'on regarde ailleurs, au sens propre : toucher
 * n'importe quoi d'autre, ou faire defiler la page. Une croix laissee rouge en
 * haut de l'ecran pendant qu'on travaille plus bas serait un piege.
 */

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cx } from '@/ui/primitives';

export default function DeleteSetButton({
  label,
  disabled = false,
  onDelete,
}: {
  /** Designe la serie dans le libelle accessible : « la série 2 ». */
  label: string;
  disabled?: boolean;
  onDelete: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!armed) return;

    const disarm = (event: Event): void => {
      // Le second appui sur la croix elle-meme ne doit pas la desarmer avant
      // que son `click` ne parte : l'ecoute est en phase de CAPTURE, donc elle
      // s'execute avant lui.
      if (event.type === 'pointerdown' && ref.current?.contains(event.target as Node)) return;
      setArmed(false);
    };

    document.addEventListener('pointerdown', disarm, true);
    // `scroll` ne remonte pas jusqu'au document : sans la capture, un
    // defilement du conteneur de la page ne serait jamais vu.
    document.addEventListener('scroll', disarm, true);
    return () => {
      document.removeEventListener('pointerdown', disarm, true);
      document.removeEventListener('scroll', disarm, true);
    };
  }, [armed]);

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-label={armed ? `Confirmer la suppression de ${label}` : `Supprimer ${label}`}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onDelete();
      }}
      className={cx(
        'pressable flex h-9 w-9 items-center justify-center rounded-lg',
        'transition-colors duration-200 disabled:opacity-25',
        armed ? 'bg-red-50 text-red-600' : 'text-ink-3',
      )}
    >
      <X size={17} strokeWidth={armed ? 3 : 2.4} />
    </button>
  );
}
