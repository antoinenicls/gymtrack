/**
 * Echelle d'effort choisie dans les reglages, pour les ecrans de LECTURE.
 *
 * Les ecrans de saisie chargent deja tous les reglages et la lisent au
 * passage ; ceux qui ne font qu'afficher une moyenne n'ont pas a les porter
 * pour un seul champ. Le RPE sert en attendant la lecture : c'est le defaut,
 * et ce que l'app affichait avant que le choix n'existe.
 */

import { useEffect, useState } from 'react';
import type { EffortScale } from '@/lib/effort';
import { settingsRepo } from '@/services/repositories';

export function useEffortScale(): EffortScale {
  const [scale, setScale] = useState<EffortScale>('rpe');
  useEffect(() => {
    let alive = true;
    void settingsRepo.get().then((settings) => {
      if (alive) setScale(settings.effortScale ?? 'rpe');
    });
    return () => {
      alive = false;
    };
  }, []);
  return scale;
}
