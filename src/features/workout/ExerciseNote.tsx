/**
 * Note attachee a un exercice, en seance comme en modification.
 *
 * Partagee pour que le geste soit LE MEME des deux cotes : dans l'editeur de
 * routine, la note se cachait derriere « … » puis « Consigne pour cet
 * exercice », soit trois appuis pour une ligne de texte, alors qu'en seance
 * elle s'ecrit sous le nom du mouvement.
 *
 * Le champ prend le focus des qu'il apparait. Sans ca, appuyer sur « Ajouter
 * une note » ouvrait un encadre vide dans lequel il fallait appuyer une
 * seconde fois pour ecrire : le premier appui ne servait a rien.
 */

import { useEffect, useRef, useState } from 'react';
import { cx } from '@/ui/primitives';
import { useAutoGrow } from '@/ui/useAutoGrow';

export default function ExerciseNote({
  value,
  onChange,
  placeholder,
  addLabel = 'Ajouter une note',
  fieldLabel = 'Note sur l’exercice',
}: {
  value: string;
  /** Appelee a la sortie du champ, avec la note ebarbee. */
  onChange: (notes: string) => void;
  placeholder: string;
  addLabel?: string;
  /** Libelle accessible du champ, aligne sur `addLabel`. */
  fieldLabel?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // La note peut changer ailleurs (reprise de seance, routine importee) : on
  // resynchronise tant que l'athlete n'est pas en train de la modifier.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  /**
   * Focus place APRES le rendu du champ, avec le curseur en fin de texte : sur
   * une note existante, on vient presque toujours completer, pas reecrire.
   */
  useEffect(() => {
    if (!editing) return;
    const node = ref.current;
    if (!node) return;
    node.focus();
    node.setSelectionRange(node.value.length, node.value.length);
  }, [editing]);

  // La note s'affiche toujours en entier, jamais dans un cadre qui defile.
  useAutoGrow(ref, draft);

  if (!value && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="px-3 pb-1 text-left text-[14px] text-ink-3"
      >
        {addLabel}
      </button>
    );
  }

  return (
    <div className="mx-3 mb-1.5 rounded-lg border-l-[3px] border-pr bg-pr-soft px-3 py-2">
      <textarea
        ref={ref}
        value={draft}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false);
          onChange(draft.trim());
        }}
        onChange={(e) => setDraft(e.currentTarget.value)}
        rows={1}
        placeholder={placeholder}
        aria-label={fieldLabel}
        className={cx(
          // `overflow-hidden` va avec la mesure ci-dessus : le champ fait
          // exactement la taille de son texte, il n'a donc rien a faire
          // defiler, et la barre de defilement qui apparaissait au survol
          // laissait croire qu'il restait du texte cache.
          'w-full resize-none overflow-hidden bg-transparent text-[14px] leading-snug',
          'text-[#92400E] placeholder:text-[#B45309]/60 focus:outline-none',
        )}
      />
    </div>
  );
}
