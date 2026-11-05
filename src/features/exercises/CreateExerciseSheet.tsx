/**
 * Creation d'un exercice.
 *
 * Vit dans son propre fichier parce que trois ecrans en ont besoin : la
 * bibliotheque, le selecteur d'exercices d'une routine, et le meme selecteur
 * pendant une seance. Le mouvement manquant se decouvre presque toujours au
 * pire moment (la machine est devant soi, la seance est lancee), et repartir
 * dans l'onglet Exercices pour le creer fait perdre le fil.
 *
 * La meme feuille sert a CORRIGER un exercice cree : un mouvement tape vite en
 * salle finit souvent avec une faute dans le nom ou rangé dans le mauvais
 * groupe, et le supprimer pour le recreer ferait perdre son historique. Les
 * seances et les routines pointent vers l'identifiant, pas vers le nom : tout
 * suit la correction sans rien reecrire.
 */

import { useEffect, useState } from 'react';
import type { Equipment, Exercise, MuscleGroup } from '@/types/domain';
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from '@/data/seedExercises';
import { exerciseRepo } from '@/services/repositories';
import { Button, Sheet, cx } from '@/ui/primitives';

const EQUIPMENTS: Equipment[] = [
  'barre',
  'halteres',
  'machine',
  'poulie',
  'poids du corps',
  'kettlebell',
  'autre',
];

export default function CreateExerciseSheet({
  open,
  onClose,
  onSaved,
  initialName = '',
  exercise,
}: {
  open: boolean;
  onClose: () => void;
  /** Recoit l'exercice cree ou corrige : l'appelant peut ainsi l'enchainer. */
  onSaved: (exercise: Exercise) => void;
  /** Pre-remplit le nom, pour reprendre une recherche restee sans resultat. */
  initialName?: string;
  /** Fourni, la feuille corrige cet exercice au lieu d'en creer un. */
  exercise?: Exercise;
}) {
  const [name, setName] = useState(initialName);
  const [group, setGroup] = useState<MuscleGroup>('pectoraux');
  const [equipment, setEquipment] = useState<Equipment>('barre');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (exercise) {
      setName(exercise.name);
      setGroup(exercise.muscleGroup);
      setEquipment(exercise.equipment);
    } else {
      setName(initialName);
      setNotes('');
    }
  }, [open, initialName, exercise]);

  const submit = async (): Promise<void> => {
    const trimmed = name.trim();
    if (trimmed === '') return;
    if (exercise) {
      // Relu en base plutot que pris dans la prop : la note a pu etre
      // enregistree a l'instant (sortie du champ), et l'ecraser avec la copie
      // d'avant serait une perte silencieuse.
      const current = (await exerciseRepo.get(exercise.id)) ?? exercise;
      const updated: Exercise = { ...current, name: trimmed, muscleGroup: group, equipment };
      await exerciseRepo.save(updated);
      onSaved(updated);
      return;
    }
    const trimmedNotes = notes.trim();
    const created = await exerciseRepo.create({
      name: trimmed,
      muscleGroup: group,
      equipment,
      defaultRestSec: 120,
      isCustom: true,
      // Champ optionnel : on ne stocke pas une chaine vide, sans quoi on ne
      // distingue plus « note effacee » de « jamais renseignee ».
      ...(trimmedNotes === '' ? {} : { notes: trimmedNotes }),
    });
    onSaved(created);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={exercise ? 'Modifier l’exercice' : 'Nouvel exercice'}
      footer={
        <Button full disabled={name.trim() === ''} onClick={() => void submit()}>
          {exercise ? 'Enregistrer' : 'Créer l’exercice'}
        </Button>
      }
    >
      <div className="space-y-5 pb-2">
        <div>
          <label htmlFor="ex-name" className="mb-1.5 block text-[13px] font-semibold text-ink-2">
            Nom
          </label>
          <input
            id="ex-name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Rowing Yates"
            className="w-full rounded-xl bg-alt px-4 py-3 text-[16px] focus:bg-accent-soft focus:outline-none"
          />
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Groupe musculaire</p>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUP_ORDER.map((g) => (
              <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
                {MUSCLE_GROUP_LABELS[g]}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Matériel</p>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENTS.map((e) => (
              <Chip key={e} active={equipment === e} onClick={() => setEquipment(e)}>
                {e}
              </Chip>
            ))}
          </div>
        </div>

        {/* En correction, la note reste sur la fiche, qui l'edite deja : deux
            champs pour le meme texte finiraient par se contredire. */}
        {!exercise && (
          <div>
            <label htmlFor="ex-note" className="mb-1.5 block text-[13px] font-semibold text-ink-2">
              Note <span className="font-normal text-ink-3">(facultatif)</span>
            </label>
            <textarea
              id="ex-note"
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              rows={3}
              placeholder="Siège au cran 4, prise serrée"
              className="w-full resize-none rounded-xl bg-alt px-4 py-3 text-[16px] leading-relaxed focus:bg-accent-soft focus:outline-none"
            />
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
              Elle reste attachée au mouvement et te suit d’une séance à l’autre : réglages de la
              machine, repère de prise, ce que tu ne veux pas rechercher à chaque fois.
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'min-h-[38px] rounded-pill px-3.5 text-[13px] font-semibold transition-colors duration-200',
        active ? 'bg-accent text-white' : 'bg-alt text-ink-2',
      )}
    >
      {children}
    </button>
  );
}
