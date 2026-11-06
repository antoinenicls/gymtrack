/**
 * Shell de l'application.
 *
 * Routage par HASH et non par chemin. Raison heritee de MacroTrack : en PWA
 * installee sur iOS, changer de CHEMIN fait croire au systeme qu'on quitte
 * l'app, qui ouvre alors un mini-navigateur Safari par-dessus. Le hash garde
 * le chemin constant. Ne pas repasser en BrowserRouter sans avoir verifie ce
 * comportement en standalone.
 */

import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useScrollRestoration } from './ui/useScrollRestoration';
import { BarChart3, Dumbbell, History, Play, User } from 'lucide-react';
import { exerciseRepo, recordRepo } from './services/repositories';
import { useWorkoutStore } from './features/workout/workoutStore';
import { cx } from './ui/primitives';
import ProfilePage from './features/profile/ProfilePage';
import HistoryPage from './features/history/HistoryPage';
import SessionPage from './features/workout/SessionPage';
import ExercisesPage from './features/exercises/ExercisesPage';
import AnalysisPage from './features/analysis/AnalysisPage';
import ExerciseDetailPage from './features/exercises/ExerciseDetailPage';
import WorkoutDetailPage from './features/history/WorkoutDetailPage';
import RoutineEditorPage from './features/routines/RoutineEditorPage';
import RoutineDetailPage from './features/routines/RoutineDetailPage';
import SettingsPage from './features/profile/SettingsPage';
import RestTimerBar from './features/workout/RestTimerBar';
import MiniSessionBar from './features/workout/MiniSessionBar';
import IOSInstallPrompt from './features/onboarding/IOSInstallPrompt';

const TABS = [
  { to: '/profil', label: 'Profil', Icon: User },
  { to: '/historique', label: 'Historique', Icon: History },
  { to: '/seance', label: 'Séance', Icon: Play },
  { to: '/exercices', label: 'Exercices', Icon: Dumbbell },
  { to: '/analyse', label: 'Analyse', Icon: BarChart3 },
];

export default function App() {
  const hydrate = useWorkoutStore((s) => s.hydrate);
  const hasActiveWorkout = useWorkoutStore((s) => s.workout !== null);
  const [ready, setReady] = useState(false);

  const location = useLocation();

  // C'est le <main> qui defile, pas la fenetre : la restauration de position
  // doit donc s'appliquer a lui explicitement. On passe par un etat plutot que
  // par un ref pour que le hook se declenche au moment ou l'element apparait,
  // apres l'ecran de chargement ci-dessous.
  const [mainEl, setMainEl] = useState<HTMLElement | null>(null);
  useScrollRestoration(mainEl);

  useEffect(() => {
    // Seed puis reprise de la seance interrompue, dans cet ordre : la seance
    // reference des exercices qui doivent exister avant d'etre affiches.
    void (async () => {
      await exerciseRepo.seedIfNeeded();
      // Les records sont une vue DERIVEE de l'historique, pas une seconde
      // source de verite. On les reconstruit au demarrage plutot que de leur
      // faire confiance : c'est ce qui repare les bases ou d'anciennes
      // suppressions ont laisse des records sans seance derriere eux, et ce
      // qui garantit qu'aucun chemin futur ne pourra les faire diverger.
      // Un parcours lineaire de l'historique, avant meme le premier rendu.
      await recordRepo.recompute();
      await hydrate();
      setReady(true);
    })();
  }, [hydrate]);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-display text-[15px] font-bold text-ink-3">GymTrack</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" style={{ height: 'var(--vh)' }}>
      <main
        ref={setMainEl}
        className="scroll-area flex-1"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* La cle sur le chemin fait rejouer l'animation a chaque changement
            d'ecran : le contenu monte legerement en apparaissant, ce qui donne
            une direction au changement au lieu d'un remplacement sec. */}
        <div key={location.pathname} className="min-h-full animate-page-in">
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/seance" replace />} />
          <Route path="/profil" element={<ProfilePage />} />
          <Route path="/profil/reglages" element={<SettingsPage />} />
          <Route path="/historique" element={<HistoryPage />} />
          <Route path="/historique/:workoutId" element={<WorkoutDetailPage />} />
          <Route path="/seance" element={<SessionPage />} />
          {/* « nouvelle » va directement a l'editeur : il n'y a rien a
              consulter sur une routine qui n'existe pas encore. */}
          <Route path="/routines/nouvelle" element={<RoutineEditorPage />} />
          <Route path="/routines/:routineId" element={<RoutineDetailPage />} />
          <Route path="/routines/:routineId/modifier" element={<RoutineEditorPage />} />
          <Route path="/exercices" element={<ExercisesPage />} />
          <Route path="/exercices/:exerciseId" element={<ExerciseDetailPage />} />
          <Route path="/analyse" element={<AnalysisPage />} />
          <Route path="*" element={<Navigate to="/seance" replace />} />
        </Routes>
        </div>
      </main>

      {/* Seance repliee. AU-DESSUS du chrono de repos, qui garde ainsi sa
          place exacte contre les onglets : c'est lui qu'on vise sans regarder,
          entre deux series, et sa position ne doit pas dependre de ce qui
          s'affiche par ailleurs. */}
      <MiniSessionBar />

      {/* Chrono de recuperation, epingle au-dessus des onglets.
          Il vit ICI et non dans l'ecran Seance : la hauteur de cet ecran ne se
          resout pas de facon fiable a l'interieur du conteneur d'animation de
          page, et la barre pouvait alors sortir du champ. Ici elle est un
          element du shell, donc collee par construction. Elle reste visible
          d'un onglet a l'autre, ce qui est voulu : le repos continue de
          tourner si l'athlete va consulter un exercice entre deux series. */}
      <RestTimerBar />

      {/* Invitation a installer l'app, Safari iOS seulement. */}
      <IOSInstallPrompt />

      <nav
        className="relative z-30 shrink-0 border-t border-line bg-white/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="flex">
          {TABS.map(({ to, label, Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cx(
                    'pressable flex min-h-[52px] flex-col items-center justify-center gap-1 pb-1 pt-2',
                    isActive ? 'text-accent' : 'text-ink-3',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                <span
                  className={cx(
                    'relative transition-transform duration-300 ease-ease',
                    // L'icone active grossit legerement : reperage peripherique
                    // sans avoir a lire le libelle.
                    isActive ? 'scale-110' : 'scale-100',
                  )}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                  {/* Pastille de seance en cours : l'athlete doit voir d'un
                      coup d'oeil qu'il a un entrainement ouvert. */}
                  {to === '/seance' && hasActiveWorkout && (
                    <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-done ring-2 ring-white" />
                  )}
                </span>
                <span className="text-[10px] font-semibold tracking-tight">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
