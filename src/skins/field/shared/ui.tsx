import { useId, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePress } from "../../../primitives/press";
import { useRangeSlider, useSlider } from "../../../primitives/slider";
import { useSheet } from "../../../primitives/sheet";
import type { HourSample } from "../../../domains/history";
import "./module.css";
import "./panel.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** A module's fixed height: a 64 px row, or a 160 px module. State and entity type never change it. */
export type FieldFootprint = "compact" | "standard";

/** Which parameter colour a control and its pictogram wear: a module's first (a light's brightness), or second. */
export type Param = "a" | "b";

/** A parameter's colour, or neutral screen ink for what no control sets: a reading, an activity. */
export type Tone = Param | "neutral";

const IconOpen = () => <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h7M6 3l3 3-3 3" /></svg>;
const IconClose = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>;
const STEP_STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" } as const;
const IconMinus = () => <svg viewBox="0 0 24 24" aria-hidden="true" {...STEP_STROKE}><path d="M6 12h12" /></svg>;
const IconPlus = () => <svg viewBox="0 0 24 24" aria-hidden="true" {...STEP_STROKE}><path d="M6 12h12M12 6v12" /></svg>;
const IconWarn = () => <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 11 10.5H1Z" /><path d="M6 5v2.5M6 8.75v.25" /></svg>;

export interface ModuleProps {
  /** The skin's class prefix for this kind, e.g. "fd-lt" for a light. */
  kind: string;
  name: string;
  area?: string;
  footprint?: FieldFootprint;
  /** The entity's state, for styling hooks only. */
  state: string;
  /** Makes the name the button that opens the detail panel. */
  onOpen?: () => void;
  /**
   * A warning about the device rather than its reading (a low battery), behind the warning marker, in place of
   * the area: printed on the plate, at the module's full width in either footprint.
   */
  warning?: string;
  /**
   * Something about the device in plain words rather than a warning (a base station switched off), in place of the
   * area; a warning takes its place.
   */
  note?: string;
  children: ReactNode;
}

/**
 * The module every field card sits in: a plate with a name and area in its header. The footprint sets the
 * height; container queries simplify the inside at narrow widths. With `onOpen`, the name opens the details.
 */
export function Module({ kind, name, area, footprint = "standard", state, onOpen, warning, note, children }: ModuleProps) {
  const nameId = useId();
  return (
    <article className={`fd-module ${kind}`} data-footprint={footprint} data-state={state} aria-labelledby={nameId}>
      <header className="fd-head">
        {/* Labelled by the name alone, so the heading stays "Ceiling" while the button inside reads "Ceiling details". */}
        <h3 className="fd-name" title={name} aria-labelledby={nameId}>
          {onOpen ? (
            <button type="button" className="fd-open" aria-label={`${name} details`} aria-haspopup="dialog" onClick={onOpen}>
              <span className="fd-open-t" id={nameId}>{name}</span><IconOpen />
            </button>
          ) : <span id={nameId}>{name}</span>}
        </h3>
        {warning ? <p className="fd-area" title={warning}><Warn>{warning}</Warn></p>
          : (note ?? area) && <p className="fd-area" title={note ?? area}>{note ?? area}</p>}
      </header>
      {children}
    </article>
  );
}

export interface KeyProps {
  label: string;
  /** A latching key: it sits lower and its LED is lit while pressed. Leave it out for a key that acts once. */
  pressed?: boolean;
  /**
   * A key that prints the verb its press performs ("Close", "Turn off") still shows what is on with its LED, but isn't
   * announced as pressed: its label already says what it does. Use instead of `pressed`.
   */
  led?: boolean;
  /**
   * A choice key, one of a group (a mode, a preset): announced as pressed while chosen, with no LED, since its
   * choice isn't "on". The chosen one lies flat and pressing it does nothing, but it stays focusable.
   */
  chosen?: boolean;
  /** Out of reach: native `disabled`, so no tap, hold or focus. */
  disabled?: boolean;
  /**
   * The entity can't act, or a step is at its bound: the key lies flat and a tap does nothing, but it stays focusable
   * and says so (`aria-disabled`), and a hold still opens the details.
   */
  unavailable?: boolean;
  onPress: () => void;
  /** Press and hold. The click that ends the hold doesn't also press the key. */
  onHold?: () => void;
  /** Fills its cell instead of being square. */
  wide?: boolean;
  /** A word beside the glyph; the key fills its cell. */
  caption?: string;
  children: ReactNode;
}

/** A key: flat-topped and just raised, so you press it. A latching key's LED is lit while it's pressed. */
export function Key({ label, pressed, led, chosen, disabled, unavailable, onPress, onHold, wide, caption, children }: KeyProps) {
  const press = usePress({ onPress: chosen ? () => {} : onPress, onHold, pressed: pressed ?? chosen, disabled, unavailable });
  const lit = pressed ?? led;
  return (
    <button className="fd-key" aria-label={label} data-wide={wide || caption ? "" : undefined} data-chosen={chosen || undefined} {...press}>
      {lit !== undefined && <span className="fd-led" data-lit={lit && !disabled && !unavailable} aria-hidden="true" />}
      <span className="fd-key-glyph" aria-hidden="true">{children}</span>
      {caption && <span className="fd-key-cap" aria-hidden="true">{caption}</span>}
    </button>
  );
}

/**
 * A key with its name printed under it, as on a quick level, a colour or a mode: the key carries the figure or glyph,
 * the plate the word. `name` is printed only; the key's label says it.
 */
export function Option({ name, children }: { name?: string; children: ReactNode }) {
  return (
    <div className="fd-option">
      {children}
      <span className="fd-option-name" aria-hidden="true">{name}</span>
    </div>
  );
}

export interface StepsProps {
  /** The group's spoken name, e.g. "Thermostat, heat to". */
  group: string;
  /** What the value is, printed before it: "Heat to", "Cool above". */
  label: string;
  /** The value, printed: "21.5°". */
  value: string;
  /** The keys' spoken labels, saying where each goes: "Lower target to 21°". */
  downLabel: string;
  upLabel: string;
  /** At a bound, its key lies flat but keeps focus. */
  atMin: boolean;
  atMax: boolean;
  onDown: () => void;
  onUp: () => void;
}

/** Exact steps: what the value is and the value printed, then a minus and a plus key that act once. */
export function Steps({ group, label, value, downLabel, upLabel, atMin, atMax, onDown, onUp }: StepsProps) {
  return (
    <div className="fd-steps" role="group" aria-label={group}>
      <span className="fd-steps-label"><span>{label}</span><b>{value}</b></span>
      <Key label={downLabel} unavailable={atMin} onPress={onDown}><IconMinus /></Key>
      <Key label={upLabel} unavailable={atMax} onPress={onUp}><IconPlus /></Key>
    </div>
  );
}

/**
 * A reading's identity where a key would sit: the domain's glyph on a plate that lies flat, as a key that can't
 * be pressed does. Not a control, so it isn't a button and has no LED; the name opens the details.
 */
export function Glyph({ unavailable, children }: { unavailable?: boolean; children: ReactNode }) {
  return <span className="fd-glyph" data-unavailable={unavailable || undefined} aria-hidden="true">{children}</span>;
}

/**
 * A warning: an outlined marker before its words, said as "Warning: …". Field has no warning colour and no glow to
 * raise, so the marker and the words carry it, first in their line.
 */
export function Warn({ children }: { children: ReactNode }) {
  return <span className="fd-warn"><IconWarn /><span className="fd-warn-t"><span className="fd-sr">Warning: </span>{children}</span></span>;
}

/** The dark display: a pictogram and a figure, then up to two meta lines, or another channel (`aside`). Never pressable. */
export function Screen({ pict, children, meta, aside }: { pict?: ReactNode; children: ReactNode; meta?: [ReactNode, ReactNode?]; aside?: ReactNode }) {
  return (
    <div className="fd-screen">
      <p className="fd-read">{pict}<span className="fd-read-fig">{children}</span></p>
      {aside}
      {!aside && meta && (
        <p className="fd-meta">
          <span>{meta[0]}</span>
          {meta[1] && <span className="fd-meta-2">{meta[1]}</span>}
        </p>
      )}
    </div>
  );
}

/**
 * A number in a fixed count of digits. The leading digits are unlit segments, drawn by CSS so a screen reader
 * hears "80" rather than "080", and so the unlit glyphs are no text to be read. `text` is a number already
 * formatted ("6.2", "-13.7"); its characters count as places.
 */
export function Digits({ value, text: formatted, places = 3 }: { value?: number; text?: string; places?: number }) {
  const text = formatted ?? String(Math.round(value ?? 0));
  const pad = "0".repeat(Math.max(0, places - text.length));
  return <span className="fd-digits" data-pad={pad || undefined}>{text}</span>;
}

/**
 * A screen pictogram, after a segment display's: the shape is always there unlit, and lights in its parameter's
 * colour up to `level` (0-1) from the bottom while `lit`, or in a colour lamp's own colour (`lamp`, its name). A
 * reading's pictogram is neutral, in the figure's ink. Decorative: the figure beside it says the same.
 */
export function Pictogram({ level = 1, lit, param = "a", lamp, children }: { level?: number; lit: boolean; param?: Tone; lamp?: string; children: ReactNode }) {
  const style = { "--fd-level": Math.min(1, Math.max(0, level)).toFixed(3), ...(lamp ? { "--fd-lamp": lampToken(lamp) } : {}) } as Vars;
  return (
    <span className="fd-pict" data-lit={lit} data-param={param} data-lamp={lamp ? "" : undefined} style={style} aria-hidden="true">
      <svg className="fd-pict-unlit" viewBox="0 0 20 26">{children}</svg>
      <svg className="fd-pict-lit" viewBox="0 0 20 26">{children}</svg>
    </span>
  );
}

/** A colour lamp's colour by name ("Amber"), as its field token. */
const lampToken = (name: string) => `var(--fd-lamp-${name.toLowerCase()})`;

/** A square of a colour lamp's colour, for a key's face. */
export function Swatch({ lamp }: { lamp: string }) {
  return <span className="fd-swatch" style={{ "--fd-lamp": lampToken(lamp) } as Vars} aria-hidden="true" />;
}

/** Unlit segments for a reading the screen doesn't have, with its meaning for screen readers. */
export function Blank({ places = 3, label }: { places?: number; label: string }) {
  return <span className="fd-digits" data-pad={"-".repeat(places)}><span className="fd-sr">{label}</span></span>;
}

export interface FaderProps {
  id: string;
  label: string;
  /** The word printed over the slot, with a rule out to its end, e.g. "Brightness". */
  legend: string;
  /** Omit when no trustworthy value exists; the disabled fader keeps its scale but draws no thumb. */
  value?: number;
  min: number;
  max: number;
  step?: number;
  /** Whether what it sets is on. While off, setting the current level still reports it, so the fader turns it on. */
  lit: boolean;
  disabled?: boolean;
  /** The thumb's colour: the parameter it sets. Default the module's first. */
  param?: Param;
  valueText: string;
  /** A pointer value onto the fader's grid, for magnetic ends (a cover's). Default: the nearest step. */
  snap?: (raw: number) => number;
  onChange: (value: number) => void;
}

/** Half the thumb's width, in px. Matches .fd-thumb in module.css. */
const THUMB_HALF = 9;

/**
 * A linear fader: a printed legend, a thin slot with a dotted scale, and a round thumb in its parameter's colour.
 * A tap jumps the thumb (animated); a drag follows the finger, on a hit layer that leaves vertical swipes to the
 * page; a hidden range input carries the keyboard and screen readers.
 */
export function Fader({ id, label, legend, value, min, max, step = 1, lit, disabled, param = "a", valueText, snap, onChange }: FaderProps) {
  const known = value != null && Number.isFinite(value);
  const inactive = disabled || !known;
  const slider = useSlider<HTMLDivElement>({ value: known ? value : min, min, max, step, inset: THUMB_HALF, disabled: inactive, reportUnchanged: !lit, valueText: () => valueText, snap, onChange });
  const style = (known ? { "--v": slider.fraction(slider.value).toFixed(4) } : {}) as Vars;
  return (
    <div className="fd-fader" {...slider.rootProps} data-lit={lit} data-param={param} data-disabled={inactive || undefined} data-empty={!known || undefined} style={style}>
      <p className="fd-legend" aria-hidden="true">{legend}</p>
      <div className="fd-slot" aria-hidden="true" />
      <div className="fd-scale" aria-hidden="true" />
      {known && <div className="fd-rail" aria-hidden="true"><div className="fd-thumb" /></div>}
      {known && <div className="fd-hit" {...slider.hitProps} />}
      {known && <input id={id} className="fd-in" aria-label={label} {...slider.inputProps} />}
    </div>
  );
}

export interface RangeFaderProps {
  id: string;
  name: string;
  legend: string;
  low: number;
  high: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  lowValueText: string;
  highValueText: string;
  onChange: (low: number, high: number) => void;
}

/**
 * Two ordered values on Field's fader grammar. The lower thumb is parameter A and the upper is parameter B;
 * text and two native sliders keep their meanings explicit. Tap/drag moves the nearest thumb, and overlapping
 * thumbs choose from the tap side or the first drag direction.
 */
export function RangeFader({ id, name, legend, low, high, min, max, step = 1, disabled, lowValueText, highValueText, onChange }: RangeFaderProps) {
  const range = useRangeSlider<HTMLDivElement>({
    low, high, min, max, step, inset: THUMB_HALF, disabled, onChange,
    valueText: (_v, thumb) => (thumb === "low" ? lowValueText : highValueText),
  });
  const { low: lo, high: hi } = range;

  return (
    <div
      className="fd-fader fd-range"
      {...range.rootProps}
      data-disabled={disabled || undefined}
      style={{ "--fd-lo": range.fraction(lo).toFixed(4), "--fd-hi": range.fraction(hi).toFixed(4) } as Vars}
    >
      <p className="fd-legend" aria-hidden="true">{legend}</p>
      <div className="fd-slot" aria-hidden="true" />
      <div className="fd-scale" aria-hidden="true" />
      <div className="fd-rail fd-range-rail fd-range-rail--low" data-param="a" aria-hidden="true"><div className="fd-thumb" /></div>
      <div className="fd-rail fd-range-rail fd-range-rail--high" data-param="b" aria-hidden="true"><div className="fd-thumb" /></div>
      <div className="fd-hit" {...range.hitProps} />
      <input id={`${id}-low`} className="fd-in fd-range-in fd-range-in--low" aria-label={`${name}, heat below`} {...range.lowInputProps} />
      <input id={`${id}-high`} className="fd-in fd-range-in fd-range-in--high" aria-label={`${name}, cool above`} {...range.highInputProps} />
    </div>
  );
}

/** A printed section label with its rule, as over a fader, for a group of keys or a meter. */
export function Legend({ id, children, value }: { id?: string; children: ReactNode; value?: ReactNode }) {
  return (
    <p className="fd-legend fd-legend--block">
      <span id={id}>{children}</span>
      {value != null && <span className="fd-legend-v">{value}</span>}
    </p>
  );
}

/**
 * Today on a strip of screen, one segment column per hour. Parameter tones identify adjustable history; neutral
 * is for activity such as climate runtime. Hours not yet come are dark; unavailable hours show a dash.
 */
export function Meter({ label, samples, currentHour, tone = "a" }: { label: string; samples: HourSample[]; currentHour: number; tone?: Tone }) {
  return (
    <div className="fd-meter" role="img" aria-label={label} data-tone={tone}>
      {Array.from({ length: 24 }, (_, i) => {
        const x = samples[i];
        const state = x === "unavailable" ? "unav" : x == null ? "none" : "lvl";
        const level = typeof x === "number" ? Math.min(1, Math.max(0, x)) : 0;
        return (
          <span key={i} className="fd-meter-h" data-state={state} data-now={i === currentHour || undefined} style={{ "--fd-level": level.toFixed(3) } as Vars}>
            <span className="fd-meter-lit" />
          </span>
        );
      })}
    </div>
  );
}

export interface TodayProps {
  /** The printed legend; "Today" unless a panel has more than one. */
  legend?: string;
  /** Printed at the legend's end: a total, a low and high. */
  summary?: string;
  /** The meter's spoken description. */
  label: string;
  /** One per hour; omit and every hour is dark. */
  samples?: HourSample[];
  /** The hour now, marked under its column; omit or -1 for none. */
  currentHour?: number;
  tone?: Tone;
}

/** No history: every hour dark. */
const NO_HOURS: HourSample[] = Array(24).fill(null);

/**
 * Today: a printed legend, with its summary at the end, over the hour meter. In a panel, a block; in a module it
 * takes a fader's place and height, its legend over a shorter strip.
 */
export function Today({ legend = "Today", summary, label, samples = NO_HOURS, currentHour = -1, tone }: TodayProps) {
  return (
    <div className="fd-block fd-today">
      <Legend value={summary}>{legend}</Legend>
      <Meter label={summary ? `${label} ${summary}.` : label} samples={samples} currentHour={currentHour} tone={tone} />
    </div>
  );
}

/** Longest exit transition in panel.css, plus a frame. */
const CLOSE_MS = 250;
const PHONE = "(max-width: 600px)";

/**
 * The detail panel: a module's plate grown into a modal dialog, a bottom sheet on phones (drag its header down
 * to close) and a centred panel on wider screens. Its header repeats the name and area, with a close key, which takes
 * focus as it opens unless `focusContent`: then the content's own `[data-autofocus]` does (an alarm's keypad).
 */
export function Panel({ open, onClose, name, area, focusContent, children }: { open: boolean; onClose: () => void; name: string; area?: string; focusContent?: boolean; children: ReactNode }) {
  const { mounted, dialogProps } = useSheet({ open, label: `${name} details`, onClose, closeMs: CLOSE_MS, phone: PHONE, handle: ".fd-panel-head", snapBack: "translate 300ms var(--fd-ease-drawer)" });
  return (
    // The click only closes on backdrop; Escape is the keyboard path (onCancel).
    <dialog className="fd-panel" {...dialogProps}>
      {mounted && (
        <div className="fd-panel-in">
          <header className="fd-panel-head">
            <div className="fd-head">
              <h2 className="fd-name" title={name}>{name}</h2>
              {area && <p className="fd-area" title={area}>{area}</p>}
            </div>
            <button type="button" className="fd-key fd-key--close" aria-label={`Close ${name} details`} data-autofocus={!focusContent || undefined} onClick={onClose}>
              <span className="fd-key-glyph" aria-hidden="true"><IconClose /></span>
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Whether a module's detail panel is open, with what opens it (its name, a key's hold) and closes it. */
export interface Details {
  open: boolean;
  openDetails: () => void;
  closeDetails: () => void;
}

/** A module's detail panel state, open on first render with `defaultOpen` (stories). */
export function useDetails(defaultOpen = false): Details {
  const [open, setOpen] = useState(defaultOpen);
  return { open, openDetails: () => setOpen(true), closeDetails: () => setOpen(false) };
}

export interface ModuleFrameProps extends Omit<ModuleProps, "onOpen" | "children"> {
  /** From `useDetails`: the name opens the panel. */
  details: Details;
  /** The screen's pictogram and figure, in both footprints. */
  pict: ReactNode;
  read: ReactNode;
  /** The screen's meta lines, in a standard module only. */
  meta?: [ReactNode, ReactNode?];
  /**
   * A compact row's line in place of the area, for what its screen can't hold (an alarm's mode); the panel keeps the
   * area. A row has no meta lines.
   */
  line?: string;
  /** First in a compact row: the key, or a reading's glyph. */
  lead: ReactNode;
  /** Under the screen in a standard module: the key and its fader, or a reading's glyph and today. */
  row: ReactNode;
  /** The detail panel's content. */
  children: ReactNode;
  /** The panel opens with focus in its content (its `[data-autofocus]`), not on its close key. */
  panelFocus?: "content";
}

/**
 * Every field card's frame: the module in its footprint, a compact row's lead and screen or a standard module's screen
 * and row, and the detail panel its name opens. A card brings what goes in it.
 */
export function ModuleFrame({ details, pict, read, meta, line, lead, row, panelFocus, children, ...module }: ModuleFrameProps) {
  return (
    <>
      <Module {...module} area={module.footprint === "compact" ? line ?? module.area : module.area} onOpen={details.openDetails}>
        {module.footprint === "compact" ? (
          <>
            {lead}
            <Screen pict={pict}>{read}</Screen>
          </>
        ) : (
          <>
            <Screen pict={pict} meta={meta}>{read}</Screen>
            {row}
          </>
        )}
      </Module>
      <Panel open={details.open} onClose={details.closeDetails} name={module.name} area={module.area} focusContent={panelFocus === "content"}>{children}</Panel>
    </>
  );
}
