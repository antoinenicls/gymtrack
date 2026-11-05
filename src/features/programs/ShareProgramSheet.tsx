/**
 * Partage de seances enregistrees, pour qu'un ami les importe dans son GymTrack.
 *
 * Le fichier est un programme au format d'echange (cf. lib/program) : il
 * embarque la description complete de chaque exercice, donc il fonctionne meme
 * si le destinataire n'a pas les memes mouvements enregistres.
 *
 * Envoi par la feuille de partage du telephone quand le navigateur sait
 * partager un fichier (Messages, WhatsApp, AirDrop…), sinon telechargement.
 */

import { useEffect, useState } from 'react';
import { Check, Share } from 'lucide-react';
import type { Exercise, Routine } from '@/types/domain';
import { exerciseRepo } from '@/services/repositories';
import { buildProgram, normalizeRef, type ProgramExercise } from '@/lib/program';
import { downloadTextFile } from '@/lib/download';
import { Button, Sheet } from '@/ui/primitives';

export default function ShareProgramSheet({
  routines,
  onClose,
  onShared,
}: {
  /** Seances a partager. Vide : la feuille est fermee. */
  routines: Routine[];
  onClose: () => void;
  onShared: () => void;
}) {
  const open = routines.length > 0;
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [shared, setShared] = useState(false);

  // Repart de zero a chaque nouvelle selection. Cle par identifiants et non
  // par tableau : l'appelant peut en recreer un a chaque rendu.
  const selectionKey = routines.map((r) => r.id).join(',');
  const singleName = routines.length === 1 ? (routines[0]?.name ?? '') : '';
  useEffect(() => {
    if (!selectionKey) return;
    setName(singleName);
    setNote('');
    setShared(false);
    void (async () => {
      setExercises(new Map((await exerciseRepo.all()).map((e) => [e.id, e])));
    })();
  }, [selectionKey, singleName]);

  const share = async (): Promise<void> => {
    const program = buildProgram({
      name: name.trim() || 'Séances',
      note: note.trim(),
      routines,
      resolveExercise: (exerciseId): ProgramExercise | undefined => {
        const exercise = exercises.get(exerciseId);
        if (!exercise) return undefined;
        return {
          ref: normalizeRef(exercise.name),
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          equipment: exercise.equipment,
          defaultRestSec: exercise.defaultRestSec,
          defaultBarWeightKg: exercise.defaultBarWeightKg,
        };
      },
    });

    const content = JSON.stringify(program, null, 2);
    const filename = `${normalizeRef(program.name) || 'seances'}.gymtrack.json`;
    const file = new File([content], filename, { type: 'application/json' });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: program.name });
      } catch (error) {
        // Feuille de partage refermee sans envoyer : rien a faire.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        downloadTextFile(content, filename, 'application/json');
      }
    } else {
      downloadTextFile(content, filename, 'application/json');
    }

    setShared(true);
    onShared();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Partager">
      <div className="space-y-4 pb-2">
        <p className="text-[15px] leading-relaxed text-ink-2">
          {routines.length} séance{routines.length > 1 ? 's' : ''} dans un fichier à envoyer.
          La personne l’ouvre avec « Importer un programme reçu », dans son onglet Séance.
        </p>

        <div>
          <input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Nom : Push Pull Legs, Bloc force…"
            aria-label="Nom du programme"
            className="w-full rounded-xl bg-alt px-4 py-3 text-[16px] focus:bg-accent-soft focus:outline-none"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            rows={3}
            placeholder="Un mot pour accompagner les séances (facultatif). Il s’affiche au moment de l’import."
            aria-label="Note jointe"
            className="mt-2 w-full resize-none rounded-xl bg-alt px-4 py-3 text-[16px] focus:bg-accent-soft focus:outline-none"
          />
        </div>

        <p className="text-[13px] leading-relaxed text-ink-3">
          Le fichier contient tes séances et leurs exercices, rien de ton historique. Les
          exercices qui manquent chez la personne seront créés à l’import.
        </p>

        {shared ? (
          <Button full variant="success" onClick={onClose}>
            <Check size={17} strokeWidth={2.6} />
            Terminé
          </Button>
        ) : (
          <Button full onClick={() => void share()} className="min-h-[52px]">
            <Share size={17} strokeWidth={2.2} />
            Envoyer
          </Button>
        )}
      </div>
    </Sheet>
  );
}
