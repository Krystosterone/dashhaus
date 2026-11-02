import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePress, useSlider } from "@dashhaus/core/primitives";
import type { HourSample } from "@dashhaus/core/entities/history";
import { CardDialog, detailsSheet, detailsTile, useCardFrame } from "@dashhaus/dashboard/card";
import type { CardProps, CardSheetProps, TileProps } from "@dashhaus/dashboard/card";
import "./ui.css";

export type FuturaFootprint = "compact" | "standard";

/**
 * The two signals. `cyan` is live (on, cooling, a reading, the page's chrome); `amber` is energy (a lamp lit, heat
 * going in). A part takes its tone and draws it from tokens; nothing else picks a colour.
 */
export type FuturaTone = "cyan" | "amber";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const flag = (on: boolean | undefined) => (on ? "" : undefined);

/* ---------- Dial ---------- */

export interface FuturaDialProps {
  /** How much of the 270° arc is lit, 0-1; null or 0 draws the groove alone. */
  level?: number | null;
  tone?: FuturaTone;
  /** Giving off its signal now: the arc and glyph glow. Never the only cue: the state words and arc say it too. */
  lit?: boolean;
  unavailable?: boolean;
  /** The domain glyph in the dial's core. */
  children?: ReactNode;
}

/**
 * The ring gauge every card leads with: 24 hour ticks round the rim, a 270° groove, the lit arc on it, and the
 * domain glyph in a raised core. Drawn, not pressed; `FuturaDialKey` is the same dial as a control.
 */
export function FuturaDial({ level, tone = "cyan", lit, unavailable, children }: FuturaDialProps) {
  const arc = unavailable || level == null ? 0 : clamp01(level);
  return (
    <span className="futura-dial" data-tone={tone} data-lit={flag(lit && !unavailable)} data-unavailable={flag(unavailable)} aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        <circle className="futura-dial-ticks" cx="50" cy="50" r="46" pathLength="120" />
        <circle className="futura-dial-groove" cx="50" cy="50" r="37" pathLength="100" transform="rotate(135 50 50)" />
        {arc > 0 && <circle className="futura-dial-arc" cx="50" cy="50" r="37" pathLength="100" transform="rotate(135 50 50)" strokeDasharray={`${(75 * arc).toFixed(2)} 100`} />}
        <circle className="futura-dial-core" cx="50" cy="50" r="27" />
      </svg>
      <span className="futura-dial-glyph">{children}</span>
    </span>
  );
}

export interface FuturaDialKeyProps extends FuturaDialProps {
  /** The key's accessible name, e.g. "Power, Ceiling". Its pressed state says on or off. */
  label: string;
  pressed: boolean;
  onPress: () => void;
}

/** The dial as the card's primary control: tap to switch, latched while on, inert but focusable when unavailable. */
export function FuturaDialKey({ label, pressed, onPress, unavailable, lit = pressed, ...dial }: FuturaDialKeyProps) {
  const press = usePress({ onPress, pressed, unavailable });
  return <button {...press} className="futura-dial-key" aria-label={label}><FuturaDial {...dial} lit={lit} unavailable={unavailable} /></button>;
}

/* ---------- Readout ---------- */

/** A figure and its unit in the console's mono face; the figure takes the tone while its card is lit. */
export function FuturaReadout({ value, unit }: { value: ReactNode; unit?: ReactNode }) {
  return <span className="futura-readout"><span className="futura-readout-value">{value}</span>{unit != null && unit !== "" && <span className="futura-readout-unit">{unit}</span>}</span>;
}

/* ---------- Meter ---------- */

export interface FuturaMeterProps {
  /** Today, one sample per hour (0 nothing, 0-1 intensity, "unavailable", null still ahead). */
  samples: readonly HourSample[];
  currentHour: number;
  label?: string;
  /** The day in words, beside the label: "On 3 h 12 min", "18.2–21.4°". */
  caption?: ReactNode;
  tone?: FuturaTone;
}

/** Today as 24 segment bars, the reference's level meter: lit hours in the tone, the current hour marked. */
export function FuturaMeter({ samples, currentHour, label = "Today", caption, tone = "cyan" }: FuturaMeterProps) {
  return (
    <div className="futura-meter" data-tone={tone}>
      <p className="futura-meter-head"><span>{label}</span>{caption != null && <span className="futura-meter-caption">{caption}</span>}</p>
      <div className="futura-meter-bars" aria-hidden="true">
        {Array.from({ length: 24 }, (_, hour) => {
          const x = samples[hour];
          const now = hour === currentHour;
          const kind = x === "unavailable" ? "gap" : x == null ? "ahead" : x > 0 ? "on" : "off";
          const level = typeof x === "number" && x > 0 ? Math.max(0.18, clamp01(x)) : 1;
          return <span key={hour} className="futura-meter-bar" data-kind={kind} data-now={flag(now)} style={{ "--futura-level": level } as Vars} />;
        })}
      </div>
    </div>
  );
}

/* ---------- Keys ---------- */

export interface FuturaActionProps {
  label: string;
  onPress: () => void;
  pressed?: boolean;
  unavailable?: boolean;
  /** A glyph drawn instead of the label; the label stays the accessible name. */
  icon?: ReactNode;
  tone?: FuturaTone;
}

/** A key: a bezelled button, latched in its tone when pressed, on the shared press primitive. */
export function FuturaAction({ label, onPress, pressed, unavailable, icon, tone = "cyan" }: FuturaActionProps) {
  const press = usePress({ onPress, pressed, unavailable });
  return <button {...press} className="futura-action" data-tone={tone} data-icon={flag(!!icon)} aria-label={icon ? label : undefined}>{icon ?? label}</button>;
}

export interface FuturaStepperProps {
  /** What is being set, e.g. "Target temperature". */
  label: string;
  value: ReactNode;
  onDown: () => void;
  onUp: () => void;
  canDown?: boolean;
  canUp?: boolean;
  unavailable?: boolean;
  tone?: FuturaTone;
}

const Minus = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /></svg>;
const Plus = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12" /></svg>;

/** Two keys either side of the value they set. */
export function FuturaStepper({ label, value, onDown, onUp, canDown = true, canUp = true, unavailable, tone = "cyan" }: FuturaStepperProps) {
  return (
    <div className="futura-stepper" role="group" aria-label={label} data-tone={tone}>
      <FuturaAction label={`Lower ${label.toLowerCase()}`} icon={<Minus />} tone={tone} unavailable={unavailable || !canDown} onPress={onDown} />
      <output className="futura-stepper-value" aria-live="polite">{value}</output>
      <FuturaAction label={`Raise ${label.toLowerCase()}`} icon={<Plus />} tone={tone} unavailable={unavailable || !canUp} onPress={onUp} />
    </div>
  );
}

/* ---------- Level ---------- */

export interface FuturaLevelProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  tone?: FuturaTone;
  /** The fill is drawn lit; off, the groove keeps the last level unlit. */
  lit?: boolean;
  unavailable?: boolean;
  valueText: (value: number) => string;
  onChange: (value: number) => void;
}

/** A recessed groove with a lit fill and a needle: slid or tapped, on the shared slider primitive. */
export function FuturaLevel({ label, value, min, max, step = 1, tone = "cyan", lit = true, unavailable, valueText, onChange }: FuturaLevelProps) {
  const id = useId();
  const slider = useSlider<HTMLDivElement>({ value, min, max, step, inset: 0, disabled: unavailable, reportUnchanged: !lit, valueText, onChange });
  return (
    <div className="futura-level" data-tone={tone} data-lit={flag(lit && !unavailable)} data-unavailable={flag(unavailable)} {...slider.rootProps} style={{ "--futura-fraction": slider.fraction(slider.value) } as Vars}>
      <span className="futura-level-fill" aria-hidden="true" />
      <span className="futura-level-needle" aria-hidden="true" />
      <div className="futura-level-hit" {...slider.hitProps} />
      <input id={id} className="futura-level-input" aria-label={label} {...slider.inputProps} />
    </div>
  );
}

/* ---------- Stats ---------- */

export interface FuturaStat {
  label: string;
  value: ReactNode;
  /** A warning in words (low battery): drawn in the alert ink, never a glow. */
  alert?: boolean;
}

/** Small telemetry cells: a mono caps label over its value. `facts` lays them out as the details grid. */
export function FuturaStats({ items, facts }: { items: readonly FuturaStat[]; facts?: boolean }) {
  return (
    <dl className={facts ? "futura-stats futura-stats--facts" : "futura-stats"}>
      {items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd data-alert={flag(item.alert)}>{item.value}</dd></div>)}
    </dl>
  );
}

/* ---------- Card frame ---------- */

/** One Card's props: its entity's facts, how it lights, and the frame's card props. */
export interface FuturaCardProps extends Omit<CardProps, "footprint"> {
  name: string;
  area?: string;
  state: string;
  /** The card's main figure, usually a `FuturaReadout`. */
  summary: ReactNode;
  /** The domain glyph in the dial when the card draws no `lead` of its own. */
  icon?: ReactNode;
  footprint?: FuturaFootprint;
  /** The dial's arc, 0-1, when the card draws no `lead`. */
  level?: number | null;
  tone?: FuturaTone;
  /** Giving off its signal now: the bezel and dial glow. */
  lit?: boolean;
  /** The dial, usually a `FuturaDialKey`; default a `FuturaDial` of `icon`, `level`, `tone` and `lit`. */
  lead?: ReactNode;
  /** The state line under the name; default the state in words. */
  status?: ReactNode;
  /** Today's meter, standard and details only. */
  meter?: FuturaMeterProps;
  /** The footer's telemetry when the card has no actions. */
  stats?: readonly FuturaStat[];
  actions?: ReactNode;
  /** The details' own content: its controls and facts. */
  children?: ReactNode;
}

/** What a Card takes: the Card plus its details, opened from its name. */
export type FuturaCardFrameProps = TileProps<FuturaCardProps>;

export const stateWords = (state: string) => state.replace(/[_-]+/g, " ");

/** The Card as it sits on the dashboard, or as the dialog's body while it is in its sheet. */
function FuturaCard({ name, area, state, summary, icon, footprint, level, tone = "cyan", lit, lead, status, meter, stats, actions, children, variant, onOpenDetails, onClose }: FuturaCardProps) {
  const frame = useCardFrame({ variant, footprint });
  const unavailable = state === "unavailable";
  const glow = lit && !unavailable;
  const dial = lead ?? <FuturaDial level={level} tone={tone} lit={glow} unavailable={unavailable}>{icon ?? name.slice(0, 1).toUpperCase()}</FuturaDial>;
  const line = unavailable ? "Unavailable" : status ?? stateWords(state);
  const figure = unavailable ? <FuturaReadout value="—" /> : summary;
  if (frame.sheet) {
    return (
      <div className="futura-sheet" data-tone={tone} data-lit={flag(glow)} data-state={state}>
        <div className="futura-dialog-head">
          <div><span className="futura-kicker">{area ?? "No area"}</span><strong>{name}</strong></div>
          <button type="button" data-autofocus onClick={onClose} aria-label={`Close ${name} details`}>Close</button>
        </div>
        <div className="futura-dialog-body">
          <div className="futura-hero">
            <div className="futura-hero-dial">{dial}</div>
            <div className="futura-hero-copy"><span className="futura-summary">{figure}</span><p className="futura-state">{line}</p></div>
          </div>
          {meter && <FuturaMeter {...meter} tone={meter.tone ?? tone} />}
          {children}
        </div>
      </div>
    );
  }
  return (
    <article className="futura-card" data-footprint={frame.footprint} data-state={state} data-tone={tone} data-lit={flag(glow)}>
      <div className="futura-face">
        <div className="futura-lead">{dial}</div>
        <div className="futura-copy">
          <p className="futura-area">{area ?? "No area"}</p>
          <button type="button" className="futura-title" onClick={onOpenDetails}>{name}</button>
          <p className="futura-state">{line}</p>
        </div>
        <p className="futura-summary">{figure}</p>
        {meter && <div className="futura-strip"><FuturaMeter {...meter} tone={meter.tone ?? tone} /></div>}
        {actions ? <div className="futura-actions">{actions}</div> : stats && stats.length > 0 && <div className="futura-foot"><FuturaStats items={stats} /></div>}
      </div>
    </article>
  );
}

/** The details wrapper: the frame's native dialog, Futura's console panel, with the Card's sheet view inside. */
function FuturaSheet({ open, onClose, label, children }: CardSheetProps) {
  return (
    <CardDialog open={open} onClose={onClose} label={label} className="futura-dialog" handle=".futura-dialog-head" closeMs={240} snapBack="translate 220ms var(--futura-ease-out)">
      {children}
    </CardDialog>
  );
}

const FuturaDetails = detailsSheet(FuturaCard, FuturaSheet, (props) => `${props.name} details`);

/**
 * Futura's card: a bezelled console panel with a dial, the name and state, a mono readout, today's meter, and
 * keys or telemetry. Fixed footprints; details open from the name in a console dialog.
 */
export const FuturaCardFrame = detailsTile(FuturaCard, FuturaDetails);
