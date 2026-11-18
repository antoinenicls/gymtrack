/**
 * « Quoi de neuf » : a l'ouverture, une seule fois, les nouveautes sorties
 * depuis la derniere visite.
 *
 * Reprise de MacroTrack. Au plus WHATS_NEW_MAX entrees, le reste derriere
 * « Voir les N autres » : un athlete revenu apres un mois ne doit pas tomber
 * sur un mur de texte entre lui et sa seance. Jamais en meme temps que
 * l'invitation a installer l'app : elle passe en premier, les nouveautes
 * attendent l'ouverture suivante. Une installation neuve ne voit rien (le seed
 * marque tout comme vu). Se rouvre depuis les Reglages (`WhatsNewLink`).
 */

import { useEffect, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { settingsRepo } from '@/services/repositories';
import { Button, SectionLabel, Sheet } from '@/ui/primitives';
import { CHANGELOG } from '@/data/changelog';
import {
  WHATS_NEW_MAX,
  entryDate,
  latestId,
  sortedEntries,
  unseenEntries,
  type ChangelogEntry,
} from '@/lib/whatsNew';
import { installPromptDue } from './IOSInstallPrompt';

/** Laisse passer le premier affichage avant de recouvrir l'ecran. */
const DELAY_MS = 1200;

/** Demande d'ouverture, emise depuis n'importe quel ecran. */
const OPEN_EVENT = 'gymtrack:whats-new';

export function openWhatsNew(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function shortDate(entry: ChangelogEntry): string {
  return new Date(`${entryDate(entry)}T12:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

export default function WhatsNew() {
  /** `unseen` : ouverture automatique ; `all` : rouverte depuis les Reglages. */
  const [mode, setMode] = useState<'unseen' | 'all' | null>(null);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const show = (): void => {
      setEntries(sortedEntries(CHANGELOG));
      setExpanded(true);
      setMode('all');
    };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    void settingsRepo.get().then((settings) => {
      const unseen = unseenEntries(CHANGELOG, settings.whatsNewSeenId);
      if (cancelled || unseen.length === 0 || installPromptDue(settings)) return;
      timer = window.setTimeout(() => {
        setEntries(unseen);
        setExpanded(false);
        setMode('unseen');
      }, DELAY_MS);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const close = (): void => {
    setMode(null);
    const latest = latestId(CHANGELOG);
    if (latest) {
      void settingsRepo.get().then((s) => {
        if (!s.whatsNewSeenId || s.whatsNewSeenId < latest) {
          return settingsRepo.patch({ whatsNewSeenId: latest });
        }
      });
    }
  };

  const visible = expanded ? entries : entries.slice(0, WHATS_NEW_MAX);
  const hidden = entries.length - visible.length;

  return (
    <Sheet open={mode !== null} onClose={close} title={mode === 'all' ? 'Nouveautés' : 'Quoi de neuf'}>
      <div className="space-y-4 pb-2">
        <ul className="divide-y divide-line">
          {visible.map((e) => (
            <li key={e.id} className="py-3 first:pt-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[15px] font-semibold leading-snug">{e.title}</p>
                <span className="shrink-0 text-[12px] text-ink-3">{shortDate(e)}</span>
              </div>
              <p className="mt-1 text-[14px] leading-snug text-ink-2">{e.body}</p>
            </li>
          ))}
        </ul>
        {hidden > 0 && (
          // Bouton nu et non `Button` : son padding de pilule decalait le texte
          // de l'alignement des entrees, et ne se surcharge pas de facon fiable.
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="pressable min-h-[44px] font-display text-[15px] font-bold text-accent"
          >
            Voir {hidden === 1 ? 'l’autre' : `les ${hidden} autres`}
          </button>
        )}
        <Button full onClick={close}>
          OK
        </Button>
      </div>
    </Sheet>
  );
}

/** Ligne des Reglages : toutes les nouveautes, a tout moment. */
export function WhatsNewLink() {
  const latest = sortedEntries(CHANGELOG)[0];
  if (!latest) return null;

  return (
    <section>
      <SectionLabel>Nouveautés</SectionLabel>
      <button
        type="button"
        onClick={openWhatsNew}
        className="card pressable pressable-wide mt-2 flex w-full items-center gap-3 p-3.5 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Sparkles size={19} strokeWidth={2.3} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Ce qui a changé</span>
          <span className="block text-[12px] leading-snug text-ink-2">Dernière : {latest.title}</span>
        </span>
        <ChevronRight size={17} className="shrink-0 text-ink-3" />
      </button>
    </section>
  );
}
