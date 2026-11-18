import type { ChangelogEntry } from '@/lib/whatsNew';

/**
 * Nouveautes montrees dans « Quoi de neuf » (voir `lib/whatsNew.ts`).
 *
 * Une entree par nouveaute VISIBLE pour l'athlete, ecrite pour lui : un titre
 * court, une ou deux phrases. Pas les petites retouches ni les corrections
 * internes. Id : `AAAA-MM-JJ-sujet` (date de sortie). La plus recente en haut.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-11-18-quoi-de-neuf',
    title: 'Les nouveautés, à l’ouverture',
    body: 'Elles s’affichent ici une seule fois. Tu les retrouves dans Profil › Réglages.',
  },
  {
    id: '2026-11-12-android',
    title: 'Séance plus fluide sur Android',
    body: 'La séance en cours défile enfin au doigt.',
  },
  {
    id: '2026-11-06-analyse',
    title: 'Analyse de programme enrichie',
    body: 'Les muscles que ton programme oublie sont maintenant visibles.',
  },
  {
    id: '2026-11-06-effort',
    title: 'RIR ou RPE, au choix',
    body: 'Note ton effort comme tu préfères. Et une flamme de régularité, et des séries à insérer dans l’éditeur.',
  },
  {
    id: '2026-11-06-avis',
    title: 'Donne ton avis',
    body: 'Une idée, un bug ? « Donner mon avis » dans le Profil et les Réglages.',
  },
];
