/**
 * Import d'un programme recu.
 *
 * L'import se fait en deux temps : on analyse, on annonce exactement ce qui
 * va etre cree, et seulement ensuite on ecrit. Rien ne doit apparaitre dans
 * la bibliotheque sans qu'on l'ait vu venir.
 */

import { useRef, useState } from 'react';
import { Check, Upload } from 'lucide-react';
import {
  materializeRoutines,
  normalizeRef,
  parseProgram,
  planImport,
  type ImportPlan,
  type Program,
} from '@/lib/program';
import { exerciseRepo, newId, routineRepo } from '@/services/repositories';
import { Banner, Button, Sheet } from '@/ui/primitives';

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export default function ImportProgramSheet({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = (): void => {
    setProgram(null);
    setPlan(null);
    setError(null);
    setDone(false);
  };

  const handleFile = async (file: File): Promise<void> => {
    reset();
    const result = parseProgram(await file.text());

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const existing = (await exerciseRepo.all()).map((e) => ({ id: e.id, name: e.name }));
    setProgram(result.program);
    setPlan(planImport(result.program, existing));
  };

  const confirm = async (): Promise<void> => {
    if (!program || !plan) return;

    // On cree d'abord les exercices manquants, pour pouvoir resoudre toutes
    // les references avant de construire la moindre routine.
    const refToId = new Map(plan.matched.map((m) => [m.ref, m.exerciseId]));

    for (const missing of plan.missing) {
      const created = await exerciseRepo.create({
        name: missing.name,
        muscleGroup: missing.muscleGroup,
        equipment: missing.equipment,
        defaultRestSec: missing.defaultRestSec,
        defaultBarWeightKg: missing.defaultBarWeightKg,
        isCustom: true,
      });
      refToId.set(normalizeRef(missing.name), created.id);
    }

    for (const routine of materializeRoutines(program, refToId, newId)) {
      await routineRepo.save(routine);
    }

    setDone(true);
    onImported();
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Importer un programme"
    >
      <div className="space-y-4 pb-2">
        {!program && !error && (
          <>
            <p className="text-[15px] leading-relaxed text-ink-2">
              On t’a envoyé un fichier de séances GymTrack. Sélectionne-le ici, tu verras ce
              qu’il contient avant de valider.
            </p>
            <Button full variant="tinted" onClick={() => inputRef.current?.click()}>
              <Upload size={17} strokeWidth={2.2} />
              Choisir le fichier
            </Button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) void handleFile(file);
            e.currentTarget.value = '';
          }}
        />

        {error && (
          <>
            <Banner tone="pr">{error}</Banner>
            <Button full variant="secondary" onClick={() => inputRef.current?.click()}>
              Choisir un autre fichier
            </Button>
          </>
        )}

        {program && plan && !done && (
          <>
            <div>
              <p className="font-display text-[19px] font-extrabold tracking-[-0.03em]">
                {program.name}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-2">
                Créé le {DATE_FMT.format(new Date(program.createdAt))}
              </p>
            </div>

            {program.note && (
              <div className="rounded-xl border-l-[3px] border-pr bg-pr-soft px-3 py-2.5 text-[14px] leading-snug text-[#92400E]">
                {program.note}
              </div>
            )}

            <ul className="space-y-1.5 rounded-xl border border-line p-3 text-[14px]">
              <li className="flex justify-between gap-3">
                <span className="text-ink-2">Séances ajoutées</span>
                <span className="num font-bold">{plan.routineCount}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-ink-2">Exercices déjà chez toi</span>
                <span className="num font-bold">{plan.matched.length}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-ink-2">Exercices à créer</span>
                <span className="num font-bold">{plan.missing.length}</span>
              </li>
            </ul>

            {plan.missing.length > 0 && (
              <p className="text-[13px] leading-relaxed text-ink-3">
                À créer : {plan.missing.map((e) => e.name).join(', ')}.
              </p>
            )}

            <p className="text-[13px] leading-relaxed text-ink-3">
              Rien n’est remplacé : tes séances et ton historique actuels ne bougent pas.
            </p>

            <Button full onClick={() => void confirm()}>
              Ajouter à mes séances
            </Button>
          </>
        )}

        {done && (
          <>
            <Banner tone="done">
              Programme importé. Tu le retrouves dans tes séances, onglet Séance.
            </Banner>
            <Button
              full
              variant="success"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              <Check size={17} strokeWidth={2.6} />
              Terminé
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
