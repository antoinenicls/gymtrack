/**
 * Lien vers le formulaire d'avis (Tally), commun aux apps et au site.
 *
 * Pour proposer une idee ou signaler un bug sans passer par GitHub. Le champ
 * cache `app` dit d'ou vient le message. Nouvel onglet : on ne quitte pas
 * l'app, PWA installee comprise.
 */

import { ChevronRight, MessageCircle } from 'lucide-react';

export const FEEDBACK_URL = 'https://tally.so/r/5X4kDb?app=GymTrack';

export default function FeedbackLink() {
  return (
    <a
      href={FEEDBACK_URL}
      target="_blank"
      rel="noopener"
      className="card pressable pressable-wide flex w-full items-center gap-3 p-3.5 text-left"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <MessageCircle size={19} strokeWidth={2.3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">Donner mon avis</span>
        <span className="block text-[12px] leading-snug text-ink-2">
          Une idée, un bug, une remarque : je lis tout.
        </span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-ink-3" />
    </a>
  );
}
