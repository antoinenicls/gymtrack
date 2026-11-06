/**
 * Une ligne de serie.
 *
 * Grille calquee sur la capture Strong fournie par l'utilisateur :
 * Serie | Precedent | kg | Reps | (RPE) | coche.
 *
 * La colonne RPE est un ecart assume avec Strong, impose par le brief. Elle
 * est pilotee par un reglage pour pouvoir retomber sur la grille a cinq
 * colonnes quand l'ecran devient trop serre.
 */

import { ArrowDown, Check } from 'lucide-react';
import type { WorkoutSet } from '@/types/domain';
import { TYPE_LETTER, TYPE_STYLE, isToFailure } from '@/lib/setTypes';
import { cx, PrBadge } from '@/ui/primitives';
import { formatWeight } from '@/lib/metrics';
import { previousFill } from '@/lib/previousFill';
import { tapFeedback } from '@/services/feedback';
import { useDecimalInput } from '@/ui/useDecimalInput';
import { EFFORT_LABEL, effortMax, fromScale, toScale, type EffortScale } from '@/lib/effort';

interface SetRowProps {
  set: WorkoutSet;
  index: number;
  /** Numero affiche. `null` sur un palier de degressive, qui n'en porte pas. */
  number: number | null;
  /**
   * Masque la lettre du type au profit du numero. Vrai dans un encadre qui
   * annonce deja le type : afficher « D » y perdait le rang de la serie, et la
   * colonne se lisait « 1, D, 3 » comme s'il manquait la deuxieme.
   */
  hideTypeLetter?: boolean;
  /** Prestation de la derniere seance sur ce meme rang de serie. */
  previous: WorkoutSet | null;
  showRpe: boolean;
  /** Echelle de la colonne d'effort. La valeur stockee reste un RPE. */
  effortScale: EffortScale;
  onChange: (patch: Partial<WorkoutSet>) => void;
  /** Ouvre le menu de la serie : son type, et sa suppression. */
  onOpenMenu: () => void;
  onToggleDone: () => void;
}

export default function SetRow({
  set,
  index,
  number,
  hideTypeLetter = false,
  previous,
  showRpe,
  effortScale,
  onChange,
  onOpenMenu,
  onToggleDone,
}: SetRowProps) {
  const letter = TYPE_LETTER[set.type];
  const hasPr = (set.prKinds?.length ?? 0) > 0;
  // Record du mois : jamais en meme temps qu'un record absolu.
  const hasMonthPr = !hasPr && (set.monthPrKinds?.length ?? 0) > 0;
  /**
   * L'echec se lit sur la PASTILLE, en rouge.
   *
   * Il ne se voyait nulle part sur la ligne : seul l'entete du groupe le
   * mentionnait, et encore, pour la descente entiere. On ne pouvait donc pas
   * savoir QUEL palier etait mene a l'echec. Le rouge est deja la couleur du
   * type « à l'échec » dans le code de l'app, il ne s'apprend pas deux fois.
   */
  const failure = isToFailure(set);

  // Une serie validee se pose : la ligne entiere se teinte, comme dans la
  // capture, pour que l'oeil distingue le fait du reste au premier coup.
  const rowTint = set.done
    ? hasPr
      ? 'bg-pr-soft'
      : hasMonthPr
        ? 'bg-month-soft'
        : 'bg-done-soft'
    : 'bg-white';

  const previousLabel = previous
    ? `${formatWeight(previous.weightKg ?? 0)} kg × ${previous.reps ?? 0}`
    : '-';
  // Ce qu'un appui sur le « precedent » viendrait poser dans la ligne. Null
  // quand il n'y a rien a reprendre : la case redevient alors du texte, pour
  // qu'aucun bouton ne promette une action qui ne se passerait pas.
  const fill = previousFill(previous);

  return (
    <div
      style={{
        gridTemplateColumns: showRpe
          ? '34px minmax(0,1fr) 58px 50px 44px 44px'
          : '34px minmax(0,1fr) 66px 58px 44px',
      }}
      className={cx(
        'relative grid items-center gap-1.5 px-3 py-1.5 transition-colors duration-300 ease-ease',
        rowTint,
      )}
    >
      {/* Pastille de serie : porte le numero, ou la lettre du type, et ouvre
          le menu de la ligne. C'est la seule commande de la ligne qui la
          designe tout entiere, donc le bon endroit pour la supprimer.

          Un palier de degressive ne porte PAS de numero mais une fleche : il
          ne fait pas avancer le compte des series, et la fleche dit ce qui se
          passe reellement, on allege et on repart. */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={
          (number === null
            ? 'Palier de dégressive'
            : `Série ${number}, type ${set.type}`) +
          (failure ? ', menée à l’échec' : '') +
          '. Toucher pour changer son type ou la supprimer.'
        }
        className={cx(
          'pressable num flex h-9 w-9 items-center justify-center rounded-lg font-display',
          'text-[15px] font-extrabold',
          failure ? 'bg-red-50 text-red-600' : TYPE_STYLE[set.type],
        )}
      >
        {number === null ? (
          <ArrowDown size={16} strokeWidth={3} />
        ) : hideTypeLetter ? (
          number
        ) : (
          letter ?? number
        )}
      </button>

      {/* Precedent, en filigrane : c'est la cible a battre, pas une donnee
          a lire attentivement.

          Et c'est une COMMANDE : un appui fait glisser ces chiffres dans les
          deux champs d'a cote. RIEN ne le signale au repos, et c'est voulu :
          un souligne ou un cadre en permanence sur chaque ligne encombrait la
          grille, alors que la seance se lit d'un coup d'oeil entre deux
          series. Seul l'appui se voit, par le fond qui s'allume. */}
      <div className="min-w-0">
        {fill ? (
          <button
            type="button"
            onClick={() => {
              tapFeedback();
              onChange(fill);
            }}
            aria-label={`Reprendre ${previousLabel} de la séance précédente sur la série ${index + 1}`}
            className="pressable -my-1 block w-full rounded-lg py-1 active:bg-accent-soft"
          >
            <span className="num block truncate text-center text-[14px] font-medium text-ink-3">
              {previousLabel}
            </span>
          </button>
        ) : (
          <p className="num truncate text-center text-[14px] font-medium text-ink-3">
            {previousLabel}
          </p>
        )}
      </div>

      {/* Les deux champs restent VIDES tant que rien n'a ete saisi.
          Ils affichaient en gris la charge et les reps de la derniere fois, ce
          qui etait deja douteux (on ne distingue plus d'un coup d'oeil ce qui
          est ecrit de ce qui est suppose) et le devient franchement depuis
          qu'un appui sur « Precedent » les remplit pour de bon : le geste
          n'aurait produit aucun changement visible, donc rien qui dise qu'il a
          pris. La derniere fois se lit dans SA colonne, une seule fois. */}
      <NumberCell
        value={set.weightKg}
        placeholder="0"
        onChange={(v) => onChange({ weightKg: v })}
        done={set.done}
        label={`Poids série ${index + 1}`}
        step={0.5}
        // Deux decimales : 37,5 kg se saisit, 37,25 aussi pour les micro-charges.
        maxDecimals={2}
      />

      <NumberCell
        value={set.reps}
        placeholder="0"
        onChange={(v) => onChange({ reps: v })}
        done={set.done}
        label={`Répétitions série ${index + 1}`}
        step={1}
        // Une repetition ne se coupe pas en deux.
        maxDecimals={0}
      />

      {showRpe && (
        <NumberCell
          value={toScale(set.rpe, effortScale)}
          placeholder="-"
          // Saisi dans l'echelle choisie, stocke en RPE et borne : un RIR 2
          // s'enregistre RPE 8, et l'historique se relit dans les deux.
          onChange={(v) => onChange({ rpe: fromScale(v, effortScale) })}
          done={set.done}
          label={`${EFFORT_LABEL[effortScale]} série ${index + 1}`}
          step={0.5}
          // L'effort se note au demi-point : 7,5 oui, 7,25 non.
          maxDecimals={1}
          max={effortMax(effortScale)}
        />
      )}

      {/* Le badge PR est POSE sur le bouton, hors du flux.
          Aligne a cote de lui, il lui prenait la moitie d'une cellule de 44 px
          et reduisait la cible a un timbre-poste : le geste le plus repete de
          la seance devenait le plus difficile a viser. Il ne prend plus aucune
          largeur, et laisse la coche pleine. `pointer-events-none` pour qu'un
          appui sur le badge valide quand meme la serie. */}
      <div className="relative flex items-center justify-end">
        {(hasPr || hasMonthPr) && (
          <span className="pointer-events-none absolute -left-1.5 -top-2 z-10">
            <PrBadge compact month={hasMonthPr} />
          </span>
        )}
        <button
          type="button"
          onClick={onToggleDone}
          aria-label={set.done ? 'Annuler la validation' : 'Valider la série'}
          aria-pressed={set.done}
          className={cx(
            'pressable flex h-9 w-9 items-center justify-center rounded-lg',
            set.done ? 'bg-done text-white' : 'bg-alt text-ink-3 active:bg-line-2',
          )}
        >
          {/* La coche rebondit a la validation : c'est le geste le plus repete
              de la seance, il merite une confirmation visuelle nette. */}
          <Check
            size={19}
            strokeWidth={3}
            className={set.done ? 'animate-check-pop' : undefined}
          />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Cellule numerique.
 *
 * inputMode="decimal" fait sortir le pave numerique sans passer par
 * type="number", dont les fleches et la validation stricte gênent plus
 * qu'elles n'aident au pouce. La taille de police reste a 16 px, sinon iOS
 * zoome au focus et casse la mise en page.
 */
function NumberCell({
  value,
  placeholder,
  onChange,
  done,
  label,
  step,
  maxDecimals,
  max,
}: {
  value: number | null;
  placeholder: string;
  onChange: (value: number | null) => void;
  done: boolean;
  label: string;
  step: number;
  maxDecimals: number;
  /** Plafond de saisie : une frappe au-dela est refusee. */
  max?: number;
}) {
  const field = useDecimalInput({ value, onChange, maxDecimals, max });
  return (
    <input
      type="text"
      inputMode="decimal"
      enterKeyHint="next"
      aria-label={label}
      placeholder={placeholder}
      step={step}
      {...field}
      className={cx(
        'num h-9 w-full rounded-lg border-0 text-center font-display text-[16px] font-bold',
        'placeholder:font-medium placeholder:text-ink-3 focus:outline-none',
        done ? 'bg-transparent text-ink' : 'bg-alt text-ink focus:bg-accent-soft',
      )}
    />
  );
}
