import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePress, useSlider } from "@dashhaus/core/primitives";
import type { HourSample } from "@dashhaus/core/entities/history";
import { CardDialog, detailsSheet, detailsTile, useCardFrame } from "@dashhaus/core/lovelace/card";
import type { CardProps, CardSheetProps, TileProps } from "@dashhaus/core/lovelace/card";
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
  /** A second value on the same scale, drawn as a needle across the groove (a thermostat's room against its setpoint). */
  needle?: number | null;
  tone?: FuturaTone;
  /** Giving off its signal now: the arc, its ticks and glyph glow. Never the only cue: the state words say it too. */
  lit?: boolean;
  unavailable?: boolean;
  /** The domain glyph in the dial's core. */
  children?: ReactNode;
}

/** 25 ticks over the 270° sweep, from 135° (bottom left) clockwise to 45° (bottom right); every sixth is major. */
const TICKS = Array.from({ length: 25 }, (_, i) => {
  const a = ((135 + i * 11.25) * Math.PI) / 180;
  const major = i % 6 === 0;
  const at = (r: number) => [Number((50 + r * Math.cos(a)).toFixed(2)), Number((50 + r * Math.sin(a)).toFixed(2))];
  const [x1, y1] = at(major ? 41.5 : 44);
  const [x2, y2] = at(48.5);
  return { i, major, x1, y1, x2, y2 };
});
const NEEDLE = (f: number) => {
  const a = ((135 + 270 * clamp01(f)) * Math.PI) / 180;
  return { x1: 50 + 30 * Math.cos(a), y1: 50 + 30 * Math.sin(a), x2: 50 + 44 * Math.cos(a), y2: 50 + 44 * Math.sin(a) };
};

/**
 * The ring gauge every card leads with: a scale of 25 ticks over a 270° sweep (major every sixth), the groove, the
 * lit arc on it with the ticks under it lit too, an optional needle, and the domain glyph in a raised core. Drawn,
 * not pressed; `FuturaDialKey` is the same dial as a control.
 */
export function FuturaDial({ level, needle, tone = "cyan", lit, unavailable, children }: FuturaDialProps) {
  const arc = unavailable || level == null ? 0 : clamp01(level);
  const pointer = unavailable || needle == null ? null : NEEDLE(needle);
  return (
    <span className="futura-dial" data-tone={tone} data-lit={flag(lit && !unavailable)} data-unavailable={flag(unavailable)} aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        <g className="futura-dial-scale">
          {TICKS.map((t) => <line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} data-major={flag(t.major)} data-on={flag(arc > 0 && t.i / 24 <= arc + 0.001)} />)}
        </g>
        <circle className="futura-dial-groove" cx="50" cy="50" r="36" pathLength="100" transform="rotate(135 50 50)" />
        {arc > 0 && <circle className="futura-dial-arc" cx="50" cy="50" r="36" pathLength="100" transform="rotate(135 50 50)" strokeDasharray={`${(75 * arc).toFixed(2)} 100`} />}
        {pointer && <line className="futura-dial-needle" x1={pointer.x1.toFixed(2)} y1={pointer.y1.toFixed(2)} x2={pointer.x2.toFixed(2)} y2={pointer.y2.toFixed(2)} />}
        <circle className="futura-dial-core" cx="50" cy="50" r="26" />
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
  /** Press and hold: the card passes its details here, so a hold on the dial opens them. */
  onHold?: () => void;
}

/** The dial as the card's primary control: tap to switch, hold for details, latched while on, inert but focusable when unavailable. */
export function FuturaDialKey({ label, pressed, onPress, onHold, unavailable, lit = pressed, ...dial }: FuturaDialKeyProps) {
  const press = usePress({ onPress, onHold, pressed, unavailable });
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
  /** The day in words, beside the label: "On 3h 12m", "Low 18.2° · high 21.4°". */
  caption?: ReactNode;
  tone?: FuturaTone;
  /**
   * `segments` (default): a ladder of lit cells per hour, for how long something ran. `trace`: a stepped waveform,
   * for a value over the day (a reading scaled between its low and high), so the two never read alike.
   */
  draw?: "segments" | "trace";
}

const W = 240, H = 20;
/** A stepped trace of the known hours, broken at gaps; y = 0 at the day's high. */
function tracePath(samples: readonly HourSample[]) {
  let d = "";
  let open = false;
  samples.slice(0, 24).forEach((x, hour) => {
    if (typeof x !== "number") { open = false; return; }
    const y = (H - 1.5 - clamp01(x) * (H - 3)).toFixed(2);
    const x0 = hour * (W / 24), x1 = (hour + 1) * (W / 24);
    d += open ? ` L${x0} ${y} H${x1}` : ` M${x0} ${y} H${x1}`;
    open = true;
  });
  return d.trim();
}

/** Today in 24 hours: a segment ladder for time running, or a stepped trace for a value; the current hour marked. */
export function FuturaMeter({ samples, currentHour, label = "Today", caption, tone = "cyan", draw = "segments" }: FuturaMeterProps) {
  const head = <p className="futura-meter-head"><span>{label}</span>{caption != null && <span className="futura-meter-caption">{caption}</span>}</p>;
  if (draw === "trace") {
    const now = (currentHour + 0.5) * (W / 24);
    const gaps = samples.slice(0, 24).map((x, hour) => (x === "unavailable" ? hour : -1)).filter((hour) => hour >= 0);
    return (
      <div className="futura-meter" data-tone={tone} data-draw="trace">
        {head}
        <svg className="futura-meter-trace" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <line className="futura-trace-base" x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} />
          {gaps.map((hour) => <line key={hour} className="futura-trace-gap" x1={hour * (W / 24)} y1={H - 0.5} x2={(hour + 1) * (W / 24)} y2={H - 0.5} />)}
          <path className="futura-trace-line" d={tracePath(samples)} />
          <line className="futura-trace-now" x1={now} y1="0" x2={now} y2={H} />
        </svg>
      </div>
    );
  }
  return (
    <div className="futura-meter" data-tone={tone}>
      {head}
      <div className="futura-meter-bars" aria-hidden="true">
        {Array.from({ length: 24 }, (_, hour) => {
          const x = samples[hour];
          const now = hour === currentHour;
          const kind = x === "unavailable" ? "gap" : x == null ? "ahead" : x > 0 ? "on" : "off";
          const level = typeof x === "number" && x > 0 ? Math.max(0.2, clamp01(x)) : 0;
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
  /** At the end of its range (a stepper at its limit): inert like unavailable, but drawn solid and dimmed, not dashed. */
  atLimit?: boolean;
}

/** A key: a bezelled button, latched in its tone when pressed, on the shared press primitive. */
export function FuturaAction({ label, onPress, pressed, unavailable, icon, tone = "cyan", atLimit }: FuturaActionProps) {
  const press = usePress({ onPress, pressed, unavailable: unavailable || atLimit });
  return <button {...press} className="futura-action" data-tone={tone} data-icon={flag(!!icon)} data-limit={flag(atLimit && !unavailable)} aria-label={icon ? label : undefined}>{icon ?? label}</button>;
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
      <FuturaAction label={`Lower ${label.toLowerCase()}`} icon={<Minus />} tone={tone} unavailable={unavailable} atLimit={!canDown} onPress={onDown} />
      <output className="futura-stepper-value" aria-live="polite">{unavailable ? "—" : value}</output>
      <FuturaAction label={`Raise ${label.toLowerCase()}`} icon={<Plus />} tone={tone} unavailable={unavailable} atLimit={!canUp} onPress={onUp} />
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
  /** How strongly a lit card glows, 0-1 (a lamp's brightness); default full. A 3 % night light barely halos. */
  glow?: number;
  tone?: FuturaTone;
  /** Giving off its signal now: the bezel and dial glow. */
  lit?: boolean;
  /**
   * The dial, usually a `FuturaDialKey`; default a `FuturaDial` of `icon`, `level`, `tone` and `lit`. A function gets
   * the card's details opener, for the dial key's hold (none in the details themselves).
   */
  lead?: ReactNode | ((openDetails?: () => void) => ReactNode);
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
function FuturaCard({ name, area, state, summary, icon, footprint, level, glow: strength = 1, tone = "cyan", lit, lead, status, meter, stats, actions, children, variant, onOpenDetails, onClose }: FuturaCardProps) {
  const frame = useCardFrame({ variant, footprint });
  const unavailable = state === "unavailable";
  const glow = lit && !unavailable;
  const dial = typeof lead === "function"
    ? lead(frame.sheet ? undefined : onOpenDetails)
    : lead ?? <FuturaDial level={level} tone={tone} lit={glow} unavailable={unavailable}>{icon ?? name.slice(0, 1).toUpperCase()}</FuturaDial>;
  const line = unavailable ? "Unavailable" : status ?? stateWords(state);
  const figure = unavailable ? <FuturaReadout value="—" /> : summary;
  if (frame.sheet) {
    return (
      <div className="futura-sheet" data-tone={tone} data-lit={flag(glow)} data-state={state}>
        <div className="futura-dialog-head">
          <div><strong>{name}</strong><span className="futura-kicker">{area ?? "No area"}</span></div>
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
    <article {...frame.article} className="futura-card" data-footprint={frame.footprint} data-state={state} data-tone={tone} data-lit={flag(glow)} style={glow ? { "--futura-glow": clamp01(strength) } as Vars : undefined}>
      <div className="futura-face">
        <div className="futura-lead">{dial}</div>
        <div className="futura-copy">
          {/* The name's hit area stretches over the whole copy cell (ui.css), so details are a 44-56 px target. */}
          <button type="button" id={frame.nameId} className="futura-title" aria-haspopup="dialog" onClick={onOpenDetails}>{name}</button>
          <p className="futura-area">{area ?? "No area"}</p>
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
