/**
 * Choix du temps de repos.
 *
 * Trois facons d'arriver a la meme valeur, parce qu'elles ne servent pas au
 * meme moment : les raccourcis pour aller vite, les boutons -15/+15 pour
 * ajuster au pouce sans clavier au milieu d'une seance, et la saisie directe
 * en minutes et secondes quand on veut une valeur precise.
 */

import { Minus, Plus } from 'lucide-react';
import { cx } from '@/ui/primitives';

const PRESETS = [60, 90, 120, 180, 240, 300];

/** Plafond a 30 min : au-dela c'est une faute de frappe, pas une intention. */
const MAX_REST_SEC = 1800;

export default function RestPicker({
  valueSec,
  onChange,
}: {
  valueSec: number;
  onChange: (seconds: number) => void;
}) {
  const clamped = clamp(valueSec);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;

  const setParts = (m: number, s: number): void => onChange(clamp(m * 60 + s));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(clamped - 15))}
          aria-label="Retirer 15 secondes"
          disabled={clamped <= 0}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-alt text-ink-2 disabled:opacity-30 active:bg-line-2"
        >
          <Minus size={18} strokeWidth={2.5} />
        </button>

        {/* Saisie directe. Deux champs plutot qu'un total en secondes :
            personne ne pense « 150 secondes », tout le monde pense 2 min 30. */}
        <div className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-alt py-2">
          <PartInput
            value={minutes}
            max={30}
            label="Minutes de repos"
            onChange={(m) => setParts(m, seconds)}
          />
          <span className="num font-display text-[22px] font-black text-ink-3">:</span>
          <PartInput
            value={seconds}
            max={59}
            pad
            label="Secondes de repos"
            onChange={(s) => setParts(minutes, s)}
          />
        </div>

        <button
          type="button"
          onClick={() => onChange(clamp(clamped + 15))}
          aria-label="Ajouter 15 secondes"
          disabled={clamped >= MAX_REST_SEC}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-alt text-ink-2 disabled:opacity-30 active:bg-line-2"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={cx(
              'num min-h-[40px] rounded-pill px-3.5 font-display text-[14px] font-bold transition-colors duration-200',
              clamped === preset ? 'bg-accent text-white' : 'bg-alt text-ink-2',
            )}
          >
            {label(preset)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(0)}
          className={cx(
            'min-h-[40px] rounded-pill px-3.5 font-display text-[14px] font-bold transition-colors duration-200',
            clamped === 0 ? 'bg-accent text-white' : 'bg-alt text-ink-2',
          )}
        >
          Aucun
        </button>
      </div>

      {clamped === 0 && (
        <p className="text-[13px] leading-snug text-ink-3">
          Aucun chronomètre ne se lancera après tes séries sur cet exercice.
        </p>
      )}
    </div>
  );
}

function PartInput({
  value,
  max,
  pad = false,
  label,
  onChange,
}: {
  value: number;
  max: number;
  pad?: boolean;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={pad ? String(value).padStart(2, '0') : String(value)}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const raw = e.currentTarget.value.replace(/\D/g, '');
        if (raw === '') return onChange(0);
        onChange(Math.min(max, Number(raw)));
      }}
      className="num w-[3ch] border-0 bg-transparent text-center font-display text-[26px] font-black text-ink focus:outline-none"
    />
  );
}

function label(seconds: number): string {
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function clamp(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.min(MAX_REST_SEC, Math.round(seconds)));
}
