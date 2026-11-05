# GymTrack

Journal d'entraînement de musculation, pensé pour être utilisé au bord du banc. Application web (PWA) installable, qui marche hors ligne.

- **Sans compte, sans serveur.** Tes séances restent sur ton téléphone (IndexedDB). Rien n'est envoyé nulle part.
- **Hors ligne.** Une salle en sous-sol n'empêche ni de démarrer ni de finir une séance.
- **Installable** sur iPhone et Android depuis le navigateur.

Version en ligne : **[gymtrack.antwnlifts.fr](https://gymtrack.antwnlifts.fr)**

## Ce que fait l'app

- **Séances enregistrées** : tu construis tes séances une fois (séries, charges, reps et RPE visés, supersets, dégressives), rangées en dossiers, et tu les relances en un tap.
- **Séance en cours** : reprise de la dernière fois, chrono de repos avec notification, calculateur de disques, échauffement, records détectés en direct.
- **Partage** : envoie tes séances à un ami dans un fichier ; il l'importe dans son GymTrack, les exercices qui lui manquent sont créés.
- **Analyse** : volume par muscle confronté aux repères de programmation, progression par exercice, 1RM estimé (Brzycki), objectif hebdomadaire et régularité sur l'année.
- **Fiches d'exercices** : exécution, erreurs fréquentes, variantes.
- **Exports** : historique en CSV (lisible dans Excel) et sauvegarde JSON complète.

## Lancer le projet

Node 20 ou plus récent.

```bash
npm install
npm run dev        # http://localhost:5177
npm test           # tests unitaires (Vitest)
npm run build      # build + service worker
npm run icons      # régénère les icônes PNG de la PWA
```

Aucune variable d'environnement n'est nécessaire.

Le port 5177 est fixe et voulu : un service worker s'enregistre pour une origine, pas pour un projet. Sur le port 5173 par défaut, plusieurs apps Vite installées en PWA se marchent dessus.

## Architecture

- **Aucun backend.** Tout vit dans IndexedDB, sur l'appareil.
- **Repositories** (`src/services/repositories/`) : seule porte d'entrée vers la base. Aucun composant ne touche `idb` directement.
- **Calcul métier pur** (`src/lib/`) : Brzycki, disques, échauffement, surcharge progressive, agrégats hebdomadaires, format d'échange des programmes. Sans I/O, donc entièrement testé.
- **Features** (`src/features/`) : un dossier par domaine, autonome.
- **HashRouter**, pas BrowserRouter : en PWA installée sur iOS, changer de chemin fait croire au système qu'on quitte l'app et ouvre un mini-navigateur Safari.

## Migrations

Tout changement de schéma impose d'incrémenter `DB_VERSION` dans `src/services/db.ts` et d'ajouter une branche dans `upgrade()`. Les migrations ne sont jamais destructives.

Le format des programmes partagés a sa propre version (`PROGRAM_FORMAT_VERSION`, dans `src/lib/program.ts`). L'import relit encore les anciens fichiers : quelqu'un peut avoir gardé un vieux fichier dans ses messages.

## Vérification visuelle

Les scripts de `scripts/` pilotent l'app avec Playwright, sur **WebKit** en plus de Chromium :

```bash
npx vite --port 5178 &
node scripts/check-parcours.mjs   # parcours complet, erreurs console
```

Un test sur Chromium de bureau seul ne prouve rien : Safari iOS distingue le viewport de mise en page du viewport visible, et c'est là que se logent les bugs de boutons inaccessibles.

## Contribuer

Les issues et les pull requests sont les bienvenues : bug, exercice manquant, fiche à corriger, amélioration d'interface.

1. Forke le dépôt et crée une branche.
2. Garde `npm test` et `npx tsc -b` au vert.
3. Décris le pourquoi du changement dans la PR.

## Avertissement

GymTrack est un carnet d'entraînement. Les repères affichés (volume, 1RM estimé, normes) sont des ordres de grandeur, pas un avis médical ni un encadrement sportif. En cas de douleur ou de blessure, consulte un professionnel de santé.

## Licence

[GNU AGPL-3.0](./LICENSE). Tu peux utiliser, modifier et redistribuer ce code librement. Si tu publies ou héberges une version modifiée, tu dois en partager le code source sous la même licence.

© 2026 Antoine · [@antwnlifts](https://instagram.com/antwnlifts)
