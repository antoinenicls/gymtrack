/**
 * Primitives d'interface, calees sur les tokens de la marque (bleu #0A84FF).
 *
 * Regle tactile transverse : toute cible interactive fait au moins 44 px de
 * cote. En dessous, on rate le bouton avec les mains moites et les avant-bras
 * congestionnes, ce qui est exactement le contexte d'usage de cette app.
 */

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* -------------------------------------------------------------------------- */

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'accent'
  | 'tinted'
  | 'danger'
  | 'success';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  full?: boolean;
  children: ReactNode;
}

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white active:bg-accent-dark',
  secondary: 'border-[1.5px] border-black/15 bg-white text-ink active:bg-alt',
  ghost: 'bg-transparent text-ink-2 active:bg-alt',
  // Action secondaire mais bien vivante. Une VARIANTE et non un `text-accent`
  // ajoute a `ghost` : entre deux utilitaires de couleur, c'est l'ordre dans
  // la feuille de style generee qui tranche, pas l'ordre des classes, et la
  // couleur d'un variant ne se surcharge donc pas de facon fiable.
  accent: 'bg-transparent text-accent active:bg-line-2',
  // Boutons pleine largeur teintes de la capture Strong : fond doux, texte
  // colore, aucune bordure.
  tinted: 'bg-accent-soft text-accent active:bg-accent-border',
  danger: 'bg-red-50 text-red-600 active:bg-red-100',
  success: 'bg-done text-white active:brightness-95',
};

export function Button({
  variant = 'primary',
  full = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        'pressable inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill px-5',
        'font-display text-[15px] font-bold',
        'disabled:opacity-40 disabled:active:scale-100',
        full && 'pressable-wide w-full',
        BUTTON_STYLES[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Bouton carre pour une icone seule, dimensionne pour le pouce. */
export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(
        'pressable inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
        'bg-alt text-ink-2 active:bg-line-2',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <section className={cx('card', className)}>{children}</section>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="section-label">{children}</p>;
}

/**
 * Puce de filtre, dans une rangee qui defile horizontalement.
 *
 * Partagee entre les deux selecteurs d'exercice : dupliquee, elle finirait par
 * diverger sur un rayon ou une teinte, et deux listes qui se ressemblent sans
 * etre identiques se lisent moins bien que deux listes franchement differentes.
 */
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'shrink-0 rounded-pill px-3.5 py-2 text-[13px] font-semibold transition-colors duration-200',
        active ? 'bg-accent text-white' : 'bg-alt text-ink-2',
      )}
    >
      {children}
    </button>
  );
}

/** Titre de section, dans la typographie de la landing. */
export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="px-4 pb-2 pt-1">
      <h1 className="font-display text-[32px] font-black leading-[1.04] tracking-[-1.5px]">
        {children}
      </h1>
      {sub && <p className="mt-1 text-[15px] text-ink-2">{sub}</p>}
    </header>
  );
}

/**
 * Chiffre mis en avant. Le brief demande des chiffres bruts et percutants :
 * gros, gras, tabulaires, avec l'unite reduite a cote.
 */
export function Stat({
  value,
  unit,
  label,
  accent,
}: {
  value: string;
  unit?: string;
  label: string;
  accent?: 'accent' | 'done' | 'pr';
}) {
  const color =
    accent === 'accent' ? 'text-accent' : accent === 'done' ? 'text-done' : accent === 'pr' ? 'text-pr' : 'text-ink';
  return (
    <div>
      <p className={cx('num font-display text-[26px] font-black leading-none', color)}>
        {value}
        {unit && <span className="ml-0.5 text-[15px] font-bold text-ink-3">{unit}</span>}
      </p>
      <p className="mt-1.5 text-[12px] leading-tight text-ink-2">{label}</p>
    </div>
  );
}

/** Badge de record personnel, en ambre, anime a l'apparition. */
/**
 * Badge de record. Dore pour le record absolu, violet pour le record du mois :
 * deux couleurs pour qu'un progres du mois ne se confonde jamais avec le vrai
 * record, sans pour autant passer inapercu.
 */
export function PrBadge({
  compact = false,
  month = false,
}: {
  compact?: boolean;
  month?: boolean;
}) {
  return (
    <span
      title={month ? 'Record du mois' : 'Record personnel'}
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-pill border',
        'font-display font-extrabold uppercase tracking-wider animate-pr-pop',
        month ? 'border-month-border bg-month-soft text-month' : 'border-pr-border bg-pr-soft text-pr',
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
      )}
    >
      {month ? (compact ? 'Mois' : 'PR du mois') : 'PR'}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      {icon && <div className="mb-4 text-ink-3">{icon}</div>}
      <p className="font-display text-[19px] font-extrabold tracking-[-0.03em]">{title}</p>
      {children && <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-ink-2">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Feuille modale montant du bas, geste standard sur mobile. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  tall = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Hauteur FIXE au lieu d'une hauteur qui suit le contenu.
   *
   * Pour les feuilles qui portent une recherche. La feuille est collee au bas
   * de l'ecran : sa hauteur etant celle de son contenu, filtrer la liste la
   * faisait retrecir, et le champ de recherche DESCENDAIT avec elle. Quand
   * plus rien ne correspondait, la feuille se reduisait a presque rien et
   * passait entierement sous le clavier : on ne voyait plus ni ce qu'on tapait,
   * ni la proposition de creer le mouvement manquant.
   *
   * A hauteur fixe, le champ reste ou il est, et ce qui s'affiche dessous
   * aussi, quel que soit le nombre de resultats.
   */
  tall?: boolean;
}) {
  /**
   * On garde la feuille montee le temps de son animation de sortie. Sans ca,
   * elle disparaissait d'un coup a la fermeture : l'ouverture etait animee,
   * la fermeture non, ce qui donnait cette impression de « saut ».
   */
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (!rendered) return;

    setClosing(true);
    const timer = window.setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, rendered]);

  // Le fond de l'app ne doit pas defiler derriere une feuille ouverte.
  useEffect(() => {
    if (!rendered) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [rendered]);

  if (!rendered) return null;

  // Rendu dans un PORTAIL sur le body, hors de l'arborescence de l'app.
  //
  // Le z-index seul ne suffisait pas : sur Safari iOS, la barre d'onglets
  // continuait d'etre peinte par-dessus la feuille et masquait son bouton de
  // validation, quel que soit l'empilement declare. En sortant la feuille de
  // l'app, elle devient soeur du conteneur principal et rien ne peut plus
  // passer devant.
  //
  // La hauteur suit var(--vh) et non `inset-0` : un element fixe se cale sur
  // le viewport de MISE EN PAGE de Safari, qui inclut la zone de la barre
  // d'URL, alors que l'app occupe le viewport VISIBLE, plus court.
  return createPortal(
    <div
      className="fixed left-0 right-0 top-0 z-[100] flex flex-col justify-end"
      style={{ height: 'var(--vh)' }}
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className={cx(
          'absolute inset-0 bg-black/25',
          closing ? 'animate-fade-out' : 'animate-fade-in',
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative flex flex-col overflow-hidden rounded-t-[24px] bg-white',
          tall ? 'h-[88%]' : 'max-h-[88%]',
          closing ? 'animate-slide-down' : 'animate-slide-up',
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{title}</h2>
          <Button variant="ghost" onClick={onClose} className="px-3">
            Fermer
          </Button>
        </div>
        {/* min-h-0 est indispensable : un element flex refuse de retrecir sous
            la hauteur de son contenu tant qu'on ne l'a pas pose. Sans lui, une
            longue liste fait deborder le panneau de son max-h et pousse le
            pied de page HORS de l'ecran, sous la barre d'onglets. */}
        <div className="scroll-area min-h-0 flex-1 px-4 py-3">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Bandeau d'information non bloquant, teinte selon la nature du message. */
export function Banner({
  tone = 'accent',
  children,
}: {
  tone?: 'accent' | 'pr' | 'done';
  children: ReactNode;
}) {
  const tones = {
    accent: 'border-accent-border bg-accent-soft text-accent-deep',
    pr: 'border-pr-border bg-pr-soft text-[#92400E]',
    done: 'border-done-border bg-done-soft text-[#065F46]',
  };
  return (
    <div className={cx('rounded-xl border px-3 py-2.5 text-[13px] leading-snug', tones[tone])}>
      {children}
    </div>
  );
}
