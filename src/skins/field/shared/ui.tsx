import { useEffect, useId, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useKeypad, usePress } from "@dashhaus/core/primitives";
import { useSettled } from "@dashhaus/core/hooks";
import type { Picture as PictureLifecycle } from "@dashhaus/core/hooks";
import { useDial, useRangeSlider, useSlider } from "@dashhaus/core/primitives";
import { CardDialog, cardShape, useCardFrame } from "@dashhaus/core/lovelace/card";
import type { Details } from "@dashhaus/core/lovelace/card";
import type { HourSample } from "@dashhaus/core/entities/history";
import { fmt1 } from "@dashhaus/core/entities/format";
import { PICTURE_WORDS } from "@dashhaus/core/entities/picture";
import { lineParts } from "@dashhaus/core/entities/clock";
import { useAlarmPhase, useReportAlert } from "./alerts";
import type { AlertEntry, Pressing } from "./alerts";
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
const IconCancel = () => <svg viewBox="0 0 24 24" aria-hidden="true" {...STEP_STROKE} strokeLinejoin="round"><path d="M7 7l10 10M17 7 7 17" /></svg>;
const IconDelete = () => <svg viewBox="0 0 24 24" aria-hidden="true" {...STEP_STROKE} strokeLinejoin="round"><path d="M9 6h10.5v12H9l-5-6ZM11.5 9.5l5 5M16.5 9.5l-5 5" /></svg>;
const IconEnter = () => <svg viewBox="0 0 24 24" aria-hidden="true" {...STEP_STROKE} strokeLinejoin="round"><path d="M6 12.5 10 16.5 18 8" /></svg>;
const IconWarn = () => <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 11 10.5H1Z" /><path d="M6 5v2.5M6 8.75v.25" /></svg>;

export interface ModuleProps {
  /** The skin's class prefix for this kind, e.g. "fd-lt" for a light. */
  kind: string;
  name: string;
  area?: string;
  footprint?: FieldFootprint;
  /** The entity's state, for styling hooks only. */
  state: string;
  /**
   * A known resting state (a door's SHUT, a sock's DOCK on its charger), or readings that stopped: the screen's figure,
   * here and in the panel, and the panel's second channel, in the dim ink (`data-rest`, one rule in `module.css`), never
   * blank segments. Off always rests. A card never dims its figure in its own CSS.
   */
  rest?: boolean;
  /** Makes the name the button that opens the detail panel. */
  onOpen?: () => void;
  /**
   * A warning about the device rather than its reading (a low battery), behind the warning marker, in place of
   * the area: printed on the plate, at the module's full width in either footprint. Words, or the words in parts
   * where a narrow row lets a detail go before its word (a sock's `Stopped` and since when).
   */
  warning?: ReactNode;
  /**
   * Something about the device in plain words rather than a warning (a base station switched off), in place of the
   * area; a warning takes its place.
   */
  note?: string;
  /**
   * What can't wait (`packages/core/src/entities/severity.ts`): urgent, or alarm. An alarm inverts the screen, flashes it for ten
   * seconds (not under the dashboard's `quiet`, nor reduced motion), and holds it inverted until it clears; it rules the
   * plate's edge and blinks the LED. Either level draws a warning on the plate's line, a row's, as an inverted block.
   */
  level?: Pressing;
  /** Said once by a screen reader when an alarm starts: "Alarm: Nova, critical oxygen, 79 percent". */
  say?: string;
  /** When the alarm started, in ms since the epoch: its flash keeps that phase, so a remount never replays it. */
  since?: number;
  children: ReactNode;
}

/**
 * The module every field card sits in: a plate with a name and area in its header. The footprint sets the
 * height; container queries simplify the inside at narrow widths. With `onOpen`, the name opens the details.
 */
export function Module({ kind, name, area, footprint = "standard", state, rest, onOpen, warning, note, level, say, since, children }: ModuleProps) {
  const frame = useCardFrame({ footprint });
  const delay = useAlarmPhase(level === "alarm", since);
  return (
    <article className={`fd-module ${kind}`} data-footprint={frame.footprint} data-state={state} data-rest={resting(state, rest)} data-level={level} {...frame.article} style={delay ? ({ "--fd-alarm-delay": delay } as Vars) : undefined}>
      <header className="fd-head">
        {/* Labelled by the name alone, so the heading stays "Ceiling" while the button inside reads "Ceiling details". */}
        <h3 className="fd-name" title={name} aria-labelledby={frame.nameId}>
          {onOpen ? (
            <button type="button" className="fd-open" aria-label={`${name} details`} aria-haspopup="dialog" onClick={onOpen}>
              <span className="fd-open-t" id={frame.nameId}>{name}</span><IconOpen />
            </button>
          ) : <span id={frame.nameId}>{name}</span>}
        </h3>
        {warning ? <p className="fd-area" title={typeof warning === "string" ? warning : undefined}><Warn block={level != null}>{warning}</Warn></p>
          : (note ?? area) && <p className="fd-area" title={note ?? area}>{timed(note ?? area)}</p>}
      </header>
      {children}
      {level === "alarm" && say && <p className="fd-sr" role="alert">{say}</p>}
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
      {caption ? (
        <span className="fd-key-in">
          <span className="fd-key-glyph" aria-hidden="true">{children}</span>
          <span className="fd-key-cap" aria-hidden="true">{caption}</span>
        </span>
      ) : <span className="fd-key-glyph" aria-hidden="true">{children}</span>}
    </button>
  );
}

export interface KeyGroupProps {
  /** The printed legend over the keys, which names the group; without it, `label` does. */
  legend?: string;
  /** Printed at the legend's end: the current choice. */
  value?: ReactNode;
  /** The group's spoken name where it has no legend. */
  label?: string;
  /** Keys to a row. Omit and every key shares one row. */
  columns?: number;
  /** Keys to a row on a narrow panel (300 px and under; with `narrowAt` 420, under 420 px). */
  narrow?: number;
  narrowAt?: 300 | 420;
  /** The card's own class, for what only it does with its keys. */
  className?: string;
  children: ReactNode;
  [data: `data-${string}`]: string | number | boolean | undefined;
}

/**
 * A standard module's row under its screen: the key, or a reading's glyph, in its 44 px column, then its fader or
 * today. `solo` when there is nothing beside the key (no level to set): the key spans the row. The card's own class
 * goes beside the row's, for what only it does there.
 */
export function ModuleRow({ solo, className, children, ...data }: { solo?: boolean; className?: string; children: ReactNode; [data: `data-${string}`]: string | number | boolean | undefined }) {
  return <div className={className ? `fd-row ${className}` : "fd-row"} data-solo={solo || undefined} {...data}>{children}</div>;
}

/** `data-rest` while the module rests (`Module`'s `rest`), as off always does. */
const resting = (state: string, rest?: boolean) => (rest || state === "off" ? "" : undefined);

/**
 * A detail panel's content under its header: the screen, then each block, a column 16 px apart. It is the container
 * its key groups and blocks read their width from. `state` is the entity's, for the card's styling hooks; `rest`, as
 * the module's, dims its figure.
 */
export function PanelBody({ className, state, rest, children }: { className?: string; state: string; rest?: boolean; children: ReactNode }) {
  return <div className={className ? `fd-panel-body ${className}` : "fd-panel-body"} data-state={state} data-rest={resting(state, rest)}>{children}</div>;
}

/**
 * What the panel prints under its screen in full: every warning sounding, behind its marker, then what it is in words
 * (the sky, a sock's sleep). Wrapped, never cut.
 */
export function Notices({ warnings = [], words, className }: { warnings?: string[]; words?: ReactNode; className?: string }) {
  return (
    <ul className={className ? `fd-notices ${className}` : "fd-notices"}>
      {warnings.map((w) => <li key={w}><Warn>{w}</Warn></li>)}
      {words != null && words !== "" && <li>{words}</li>}
    </ul>
  );
}

/**
 * A row of keys under a printed legend: a mode, a preset, quick levels, a door's Lock and Open. Each key fills its
 * cell, `columns` to a row (every key on one row without it), `narrow` to a row on a narrow panel. `choices` gives the
 * usual count for n choices.
 */
export function KeyGroup({ legend, value, label, columns, narrow, narrowAt, className, children, ...data }: KeyGroupProps) {
  const uid = useId();
  const style = { ...(columns ? { "--fd-keys-n": columns } : {}), ...(narrow ? { "--fd-keys-narrow": narrow } : {}) } as Vars;
  const keys = (
    <div
      className={className ? `fd-keys ${className}` : "fd-keys"}
      role="group"
      aria-label={legend ? undefined : label}
      aria-labelledby={legend ? `${uid}-l` : undefined}
      data-columns={columns}
      data-narrow={narrow}
      data-narrow-at={narrow && narrowAt === 420 ? 420 : undefined}
      style={columns || narrow ? style : undefined}
      {...data}
    >
      {children}
    </div>
  );
  return legend ? <div className="fd-block"><Legend id={`${uid}-l`} value={value}>{legend}</Legend>{keys}</div> : keys;
}

/**
 * Keys to a row for n choices: three, or four rather than three and an orphan, and four from seven, so the last row
 * never holds one key alone.
 */
export const choices = (n: number) => (n === 4 || n >= 7 ? 4 : 3);

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
  /** The value, printed: "21.5°". A value the device doesn't report isn't printed (a TV that only steps its volume). */
  value?: string;
  /** The keys' spoken labels, saying where each goes: "Lower target to 21°". */
  downLabel: string;
  upLabel: string;
  /** At a bound, its key lies flat but keeps focus. */
  atMin: boolean;
  atMax: boolean;
  /** Nothing to step now (nothing loaded): both keys lie flat but keep focus. */
  unavailable?: boolean;
  onDown: () => void;
  onUp: () => void;
}

/** Exact steps: what the value is and the value printed, then a minus and a plus key that act once. */
export function Steps({ group, label, value, downLabel, upLabel, atMin, atMax, unavailable, onDown, onUp }: StepsProps) {
  return (
    <div className="fd-steps" role="group" aria-label={group}>
      <span className="fd-steps-label"><span>{label}</span>{value && <b>{value}</b>}</span>
      <Key label={downLabel} unavailable={unavailable || atMin} onPress={() => { if (!unavailable) onDown(); }}><IconMinus /></Key>
      <Key label={upLabel} unavailable={unavailable || atMax} onPress={() => { if (!unavailable) onUp(); }}><IconPlus /></Key>
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
 * raise, so the marker and the words carry it, first in their line. `block` is an urgent warning: the same words in an
 * inverted block, against the screen or the plate.
 */
export function Warn({ block, children }: { block?: boolean; children: ReactNode }) {
  return <span className="fd-warn" data-block={block || undefined}><IconWarn /><span className="fd-warn-t"><span className="fd-sr">Warning: </span>{timed(children)}</span></span>;
}

/**
 * A line of words with each time in it drawn as one piece (core's `lineParts`), so where the line clips its ellipsis
 * drops a time whole, with its period, and never cuts it (`Last seen …`, never `Last seen 11:4…`; spec/cards.md →
 * Clock words follow the dashboard's hour cycle). Anything but a string is drawn as it is.
 */
export function timed(line: ReactNode): ReactNode {
  if (typeof line !== "string") return line;
  const parts = lineParts(line);
  if (!parts.some((part) => part.time)) return line;
  return parts.map((part, index) => (part.time ? <span key={index} className="fd-time">{part.text}</span> : part.text));
}

/**
 * A warning's word and what follows it on its line (what set it off, a count of the rest), for `Warn`'s words and a
 * module's `warning`: the word stays whole while what follows gives way, down to nothing, so a clip never cuts a word
 * that fits its line alone (spec/cards.md → A warning's words fit a row). A word too long for it still ends in an
 * ellipsis.
 */
export function WarnWords({ word, detail }: { word: ReactNode; detail?: ReactNode }) {
  if (detail == null || detail === "") return <>{word}</>;
  return <><span className="fd-warn-w">{word}</span><span className="fd-warn-d">{timed(detail)}</span></>;
}

/** The dark display: a pictogram and a figure, then up to two meta lines, or another channel (`aside`). Never pressable. */
export function Screen({ pict, children, meta, aside }: { pict?: ReactNode; children: ReactNode; meta?: [ReactNode, ReactNode?]; aside?: ReactNode }) {
  return (
    <div className="fd-screen">
      <p className="fd-read">{pict}<span className="fd-read-fig">{children}</span></p>
      {aside}
      {!aside && meta && (
        <p className="fd-meta">
          <span>{timed(meta[0])}</span>
          {meta[1] && <span className="fd-meta-2">{timed(meta[1])}</span>}
        </p>
      )}
    </div>
  );
}

/** A framed landscape, as a screen's pictogram: a picture's glyph where its card has none of its own. */
export const PictPicture = () => <svg viewBox="0 0 20 26" aria-hidden="true"><path d="M1 6h18v14H1zm2 2v8.6l4.5-4.5 3.5 3.5 2.5-2.5L17 16.6V8zm11 1.2a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z" fillRule="evenodd" /></svg>;

export interface PictureProps {
  /** Its lifecycle, from `usePicture` (`@dashhaus/core/hooks`): the frame to draw, and the ref that says it is seen. */
  picture: Pick<PictureLifecycle, "ref" | "src" | "status">;
  /** What the picture is, said for it ("Front door camera"). */
  label: string;
  /** Its window's aspect ratio ("16 / 9", "1 / 1"); a card may give it a height instead. */
  ratio?: string;
  /** `cover` crops the frame to the window (a module); `contain` shows the whole frame (a panel). */
  fit?: "cover" | "contain";
  unavailable?: boolean;
  /** What a press opens: the live stream, or the module's panel. Without it, or while unavailable (a camera that is
   * gone has no stream to open), the picture isn't a button. */
  onOpen?: () => void;
  /** What the press does, said after the label: "Open live view". Default core's `PICTURE_WORDS.open`. */
  openLabel?: string;
  /** The card's pictogram, unlit while there is no frame. */
  children?: ReactNode;
}

/**
 * Field's media surface: a window in the screen. The screen's own dark well with the frame clipped into it, no bezel
 * and no words on it (the screen's meta lines say how old a still is). Before a frame, on a failed one and while
 * unavailable it is the screen with the card's pictogram unlit, as a blank screen is. It never inverts with an alarm:
 * an inverted photograph means nothing, so severity stays in the screen's words. With `onOpen` it is pressed as a key
 * is, though it has no LED and latches nothing; unavailable, it ignores `onOpen` and takes no press or focus.
 */
export function Picture({ picture, label, ratio, fit = "cover", unavailable = false, onOpen, openLabel = PICTURE_WORDS.open, children = <PictPicture /> }: PictureProps) {
  const src = unavailable ? undefined : picture.src;
  const inner = (
    <span className="fd-pic-i">
      {src
        ? <img className="fd-pic-img" src={src} alt="" draggable={false} decoding="async" />
        : <span className="fd-pic-glyph" aria-hidden="true">{children}</span>}
    </span>
  );
  const box = { className: "fd-pic", style: ratio ? { aspectRatio: ratio } : undefined, "data-fit": fit, "data-status": unavailable ? "unavailable" : picture.status };
  return onOpen && !unavailable
    ? <button type="button" ref={picture.ref} {...box} aria-label={`${label}. ${openLabel}`} onClick={onOpen}>{inner}</button>
    : <div ref={picture.ref} {...box} role="img" aria-label={label}>{inner}</div>;
}

/**
 * The panel screen's second channel, its `aside`: a pictogram, then a value over what it is ("44%" over "Humidity").
 * The value is a figure (`children`), or a word in the screen's lettering (`name`: a lamp's colour, a mode).
 */
export function Channel({ pict, name, sub, children }: { pict?: ReactNode; name?: ReactNode; sub: ReactNode; children?: ReactNode }) {
  return (
    <p className="fd-chan">
      {pict}
      <span>
        {name != null ? <span className="fd-chan-name">{name}</span> : children}
        <span className="fd-chan-sub">{sub}</span>
      </span>
    </p>
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
 * A temperature on the screen, in four places and its unit: the leading place is an unlit segment ("06.2°"), heard as
 * the real value. Sensors, the weather and a thermostat's reading draw it the same.
 */
export function Temperature({ value, unit }: { value: number; unit: string }) {
  return <><Digits text={fmt1(value)} places={4} /><small>{unit}</small></>;
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
  /**
   * What it sets reports no level now (a light or a fan while off): no thumb is drawn, since any place would claim a
   * level Home Assistant never reported, but a tap, a slide or an arrow key still sets one there, turning it on.
   * `value` is then only where the keyboard starts.
   */
  empty?: boolean;
  disabled?: boolean;
  /** The thumb's colour: the parameter it sets. Default the module's first. */
  param?: Param;
  valueText: string;
  /** A pointer value onto the fader's grid, for magnetic ends (a cover's). Default: the nearest step. */
  snap?: (raw: number) => number;
  /**
   * The value moves on by itself, one unit a second toward `max` (a track's position): the thumb runs on a CSS
   * animation from where it is drawn while `running`, held while not, and starts again when `key` changes. Nothing
   * re-renders as it runs.
   */
  runs?: { running: boolean; key: string };
  /**
   * A finger or a key is on it, for a value set once, on release: its animation is off, so the thumb shows the value
   * as it moves.
   */
  held?: boolean;
  onChange: (value: number) => void;
  /** Called once when a gesture ends, with its last value (`useSlider`'s `onCommit`): for a value set on release. */
  onCommit?: (value: number) => void;
  /** Where a value that moves on by itself is now, so keys step from there (`useSlider`'s `current`). */
  current?: () => number;
}

/** Half the thumb's width, in px. Matches .fd-thumb in module.css. */
const THUMB_HALF = 9;

/**
 * The dotted scale's steps: one dot per stop when a fader has ten or fewer (a three-speed fan shows three), else
 * eleven dots in tens, for a fader whose stops are too many to print.
 */
const scaleSteps = (min: number, max: number, step: number) => {
  const stops = Math.round((max - min) / step);
  return stops >= 1 && stops <= 10 ? stops : 10;
};

/**
 * A linear fader: a printed legend, a thin slot with a dotted scale, and a round thumb in its parameter's colour.
 * A tap jumps the thumb (animated); a drag follows the finger, on a hit layer that leaves vertical swipes to the
 * page; a hidden range input carries the keyboard and screen readers.
 */
export function Fader({ id, label, legend, value, min, max, step = 1, lit, empty = false, disabled, param = "a", valueText, snap, runs, held, onChange, onCommit, current }: FaderProps) {
  const known = value != null && Number.isFinite(value);
  const inactive = disabled || !known;
  // Live but empty: it still takes a tap, a slide and the keyboard, and only the thumb is left out.
  const thumb = known && !empty;
  const slider = useSlider<HTMLDivElement>({ value: known ? value : min, min, max, step, inset: THUMB_HALF, disabled: inactive, reportUnchanged: !lit, valueText: () => valueText, snap, onChange, onCommit, current });
  const style = { "--fd-steps": scaleSteps(min, max, step), ...(thumb ? { "--v": slider.fraction(slider.value).toFixed(4) } : {}) } as Vars;
  // A thumb that runs on: one linear animation across the slot as long as the range, started where the value is.
  const run = runs && thumb ? { "--fd-run-len": `${Math.max(1, max - min)}s`, "--fd-run-at": `${-(slider.value - min)}s`, animationPlayState: runs.running ? "running" : "paused" } as Vars : undefined;
  return (
    <div className="fd-fader" {...slider.rootProps} data-lit={lit} data-param={param} data-disabled={inactive || undefined} data-empty={!thumb || undefined} data-runs={run ? "" : undefined} data-held={held || undefined} style={style}>
      <p className="fd-legend" aria-hidden="true"><span className="fd-legend-n">{legend}</span></p>
      <div className="fd-slot" aria-hidden="true" />
      <div className="fd-scale" aria-hidden="true" />
      {thumb && <div key={runs?.key} className="fd-rail" aria-hidden="true" style={run}><div className="fd-thumb" /></div>}
      {known && <div className="fd-hit" {...slider.hitProps} />}
      {known && <input id={id} className="fd-in" aria-label={label} {...slider.inputProps} />}
    </div>
  );
}

/** The dial's drawing, in its own units round its centre: its printed scale, and the knob's cap inside it. */
const DIAL = { outer: 86, inner: 76, long: 70, cap: 50 } as const;
const onDial = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: +(r * Math.sin(rad)).toFixed(2), y: +(-r * Math.cos(rad)).toFixed(2) };
};

export interface DialProps {
  /** The hidden range input's id. */
  id: string;
  /** The input's spoken name ("Living room fan aims"). */
  label: string;
  /** Its printed legend ("Points"), and what the shown value means at the rule's end ("58° right"). */
  legend: string;
  says: (value: number) => string;
  /** What a screen reader hears for a value. Default: `says`. */
  valueText?: (value: number) => string;
  value: number;
  min: number;
  max: number;
  /** The value at the top of the dial; values grow clockwise from it. */
  top: number;
  /** A printed tick every `step`, and the keyboard's step. Default 5. */
  step?: number;
  /** The word printed over the top ("Ahead"). */
  topLabel?: string;
  /** Where the scale lights in its parameter's colour, from the shown value: a sweep's ends, or a beam either side. */
  lit?: (value: number) => [low: number, high: number];
  /** Which parameter it sets, as a fader's: its colour. Default "a". */
  param?: Param;
  disabled?: boolean;
  /** Sent once a drag is let go, or at each key step. */
  onChange: (value: number) => void;
  /** The card's own print round the scale (a fan's cable at its back), in the dial's units, given how far it is turned. */
  children?: (turned: number) => ReactNode;
}

/**
 * Field's fourth control: a knob you turn, as a rotary encoder on TE's devices. A printed legend with its rule and what
 * the value means at its end, then a printed scale round a flat-topped cap, a tick every `step` over its range and a
 * longer one every 45° from the top, with a gap where it can't go; the scale lights in its parameter's colour where
 * the card says (a sweep), and the cap carries an ink line and a dot in that colour turned to the value. Press or drag
 * anywhere on it to turn it there (`useDial`), sent once when let go; the arrow keys step it. Disabled, it lies flat.
 */
export function Dial({ id, label, legend, says, valueText = says, value, min, max, top, step = 5, topLabel, lit, param = "a", disabled, onChange, children }: DialProps) {
  const dial = useDial<SVGSVGElement>({ value, min, max, top, step, disabled, valueText, onChange });
  const shown = dial.shown;
  const turned = shown - top;
  const [low, high] = lit?.(shown) ?? [Infinity, -Infinity];
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) ticks.push(v);
  return (
    <div className="fd-dial" data-param={param} data-disabled={disabled || undefined}>
      <Legend id={`${id}-legend`} value={says(shown)}>{legend}</Legend>
      <div className="fd-dial-face">
        <input id={id} className="fd-in" aria-label={label} {...dial.inputProps} />
        <svg viewBox="-104 -104 208 208" aria-hidden="true" {...dial.rootProps}>
          {ticks.map((v) => {
            const long = (v - top) % 45 === 0;
            const a = onDial(v - top, long ? DIAL.long : DIAL.inner);
            const b = onDial(v - top, DIAL.outer);
            const on = v >= low && v <= high;
            return <path key={v} className={on ? "fd-dial-tick fd-dial-lit" : "fd-dial-tick"} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} />;
          })}
          {topLabel && <text className="fd-dial-top" x="0" y={-DIAL.outer - 6} textAnchor="middle">{topLabel}</text>}
          {children?.(turned)}
          <g className="fd-dial-cap" style={{ transform: `rotate(${turned}deg)` }}>
            <circle r={DIAL.cap} />
            <path className="fd-dial-line" d={`M0 ${-DIAL.cap + 26}V${-DIAL.cap + 8}`} />
            <circle className="fd-dial-dot" cy={-DIAL.cap + 15} r="4.5" />
          </g>
        </svg>
      </div>
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
      style={{ "--fd-lo": range.fraction(lo).toFixed(4), "--fd-hi": range.fraction(hi).toFixed(4), "--fd-steps": scaleSteps(min, max, step) } as Vars}
    >
      <p className="fd-legend" aria-hidden="true"><span className="fd-legend-n">{legend}</span></p>
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

/**
 * A printed section label with its rule, as over a fader, for a group of keys or a meter; `as="h2"` for an area of a
 * page, so the page's headings run title, area, module.
 */
export function Legend({ id, children, value, as: Tag = "p" }: { id?: string; children: ReactNode; value?: ReactNode; as?: "p" | "h2" }) {
  return (
    <Tag className="fd-legend fd-legend--block">
      <span id={id} className="fd-legend-n">{children}</span>
      {value != null && <span className="fd-legend-v">{value}</span>}
    </Tag>
  );
}

/**
 * The small print at the foot of a detail panel: a fact at its start and, where there is one, at its end (when it last
 * changed, what it can do). Their words come from `@dashhaus/core/entities/facts`, the same on every module.
 */
export function Facts({ start, end }: { start?: ReactNode; end?: ReactNode }) {
  return (
    <p className="fd-info">
      <span>{start}</span>
      {end !== undefined && <span>{end}</span>}
    </p>
  );
}

/**
 * Today on a strip of screen, one segment column per hour. Parameter tones identify adjustable history; neutral
 * is for activity such as climate runtime. Hours not yet come are dark; unavailable hours show a dash. A model that
 * knows the hours ahead (a calendar's plan) passes `aheadFrom`: those hours draw their level in the dim ink, the column
 * dimmed as a dark hour's, so a plan never reads as a past (orb's `TodayStrip` `forecastFrom`).
 */
export function Meter({ label, samples, currentHour, tone = "a", aheadFrom }: { label: string; samples: HourSample[]; currentHour: number; tone?: Tone; aheadFrom?: number }) {
  return (
    <div className="fd-meter" role="img" aria-label={label} data-tone={tone}>
      {Array.from({ length: 24 }, (_, i) => {
        const x = samples[i];
        const state = x === "unavailable" ? "unav" : x == null ? "none" : "lvl";
        const level = typeof x === "number" ? Math.min(1, Math.max(0, x)) : 0;
        return (
          <span key={i} className="fd-meter-h" data-state={state} data-now={i === currentHour || undefined} data-ahead={(aheadFrom != null && i >= aheadFrom && state === "lvl") || undefined} style={{ "--fd-level": level.toFixed(3) } as Vars}>
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
  /** Hours from this one on are known ahead (a calendar's plan), drawn at their level in the dim ink. */
  aheadFrom?: number;
}

/** No history: every hour dark. */
const NO_HOURS: HourSample[] = Array(24).fill(null);

/**
 * Today: a printed legend, with its summary at the end, over the hour meter. In a panel, a block; in a module it
 * takes a fader's place and height, its legend over a shorter strip, on one line at every width (module.css): a narrow
 * module drops the printed word, a summary still too long ends in an ellipsis, and the meter's label says it whole.
 */
export function Today({ legend = "Today", summary, label, samples = NO_HOURS, currentHour = -1, tone, aheadFrom }: TodayProps) {
  return (
    <div className="fd-block fd-today">
      <Legend value={summary}>{legend}</Legend>
      <Meter label={summary ? `${label} ${summary}.` : label} samples={samples} currentHour={currentHour} tone={tone} aheadFrom={aheadFrom} />
    </div>
  );
}

/* ---------- Guarded actions, in the panel: the question and the keypad ----------
   An action that asks first (a lock's unlock, an alarm's disarm) is answered in the panel, on useGuardedAction: by a
   question when no code is asked for, by the keypad when one is. The card says what the action is; these draw it. */

export interface ConfirmProps {
  /** The question, as the block's legend: "Unlock Front door?" */
  question: string;
  /** What it means, under the question: "Anyone at the door can open it." */
  detail: string;
  /** The action key's printed word: "Unlock". */
  action: string;
  /** The action key's spoken label: "Unlock, Front door". Default the word. */
  actionLabel?: string;
  /** The action key's glyph. */
  icon: ReactNode;
  /** The answer is on its way: the action takes no press, and the line says so. */
  busy?: boolean;
  /** What the line says while busy. Default "Waiting". */
  waiting?: string;
  /** The last try didn't go through: said behind the warning marker, in the line's place. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The panel's question, for a guarded action that takes no code: the question as its legend, what it means, then
 * Cancel and the action as two keys. Focus lands on Cancel, so Enter never acts, and the action takes no press for a
 * moment after it appears, so the second tap of the press that asked can't land on it.
 */
export function Confirm({ question, detail, action, actionLabel = action, icon, busy, waiting = "Waiting", error, onConfirm, onCancel }: ConfirmProps) {
  const uid = useId();
  const settled = useSettled();
  // Cancel takes focus: marked for a panel that opens on the question, focused for one already open.
  const keys = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cancel = keys.current?.querySelector("button");
    cancel?.setAttribute("data-autofocus", "");
    if (cancel?.closest("dialog")?.open) cancel.focus();
  }, []);
  return (
    <div className="fd-cf" role="group" aria-labelledby={`${uid}-q`} aria-describedby={`${uid}-d`}>
      <Legend id={`${uid}-q`}>{question}</Legend>
      <p className="fd-hint" id={`${uid}-d`} role="status">{busy ? waiting : error ? <Warn>{error}</Warn> : detail}</p>
      <div className="fd-cf-keys" ref={keys}>
        <Key label="Cancel" wide caption="Cancel" onPress={onCancel}><IconCancel /></Key>
        <Key label={actionLabel} wide caption={action} disabled={busy} onPress={() => { if (settled() && !busy) onConfirm(); }}>{icon}</Key>
      </div>
    </div>
  );
}

export interface KeypadProps {
  /** What the code is for, as the block's legend: "Code to disarm". */
  prompt: string;
  /** Letters as well as digits (Home Assistant's `code_format: text`). */
  text?: boolean;
  /** `useKeypad`'s: true accepted, false a wrong code, a throw a call that didn't go through. */
  onSubmit: (code: string) => boolean | Promise<boolean>;
  onCancel: () => void;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * The code keypad, in the panel, on `useKeypad`: what the code is for, the code on a strip of screen (a dot per place,
 * unlit to four), digits, delete and enter, then Cancel. A physical keyboard types too. A text code (letters as well)
 * is typed on the strip itself, a real field that takes the focus so a phone brings up its keyboard; the digit keys
 * still type into it. While the answer is on its way it says Checking; a wrong code clears for another try, and one
 * that didn't go through stays for Enter to try again.
 */
export function Keypad({ prompt, text, onSubmit, onCancel }: KeypadProps) {
  const uid = useId();
  const { code, error, busy, press, back, submit, rootProps, inputProps } = useKeypad({ text, onSubmit });
  const places = Math.max(4, code.length);
  const status = busy ? "Checking"
    : error === "wrong" ? <Warn>Wrong code. Try again</Warn>
    : error === "failed" ? <Warn>Didn’t go through. Try again</Warn>
    : code.length ? `${code.length} entered` : inputProps ? "Letters or digits" : "Enter the code";
  return (
    <div className="fd-pad" {...rootProps} role="group" aria-labelledby={`${uid}-p`}>
      <Legend id={`${uid}-p`}>{prompt}</Legend>
      {inputProps ? (
        // The field sits outside the status, so typing isn't read back key by key; the status below it still is.
        <div className="fd-pad-code">
          <Screen meta={[<span key="s" role="status">{status}</span>]}>
            <input className="fd-pad-in" {...inputProps} aria-labelledby={`${uid}-p`} />
          </Screen>
        </div>
      ) : (
        <div className="fd-pad-code" role="status">
          <Screen meta={[status]}>
            <span className="fd-pad-dots" aria-hidden="true">{Array.from({ length: places }, (_, i) => <i key={i} data-on={i < code.length || undefined} />)}</span>
          </Screen>
        </div>
      )}
      <div className="fd-pad-keys">
        {DIGITS.map((d) => <Key key={d} label={d} wide disabled={busy} onPress={() => press(d)}><span className="fd-key-fig">{d}</span></Key>)}
        <Key label="Delete" wide disabled={busy} unavailable={!code} onPress={back}><IconDelete /></Key>
        <Key label="0" wide disabled={busy} onPress={() => press("0")}><span className="fd-key-fig">0</span></Key>
        <Key label="Enter code" wide disabled={busy} unavailable={!code} onPress={() => void submit()}><IconEnter /></Key>
      </div>
      <Key label="Cancel" wide caption="Cancel" onPress={onCancel}>{null}</Key>
    </div>
  );
}

/**
 * The detail panel: a module's plate grown into a modal dialog, a bottom sheet on phones (drag its header down
 * to close) and a centred panel on wider screens. Its header repeats the name and area, with a close key, which takes
 * focus as it opens unless `focusContent`: then the content's own `[data-autofocus]` does (an alarm's keypad).
 */
export function Panel({ open, onClose, name, area, focusContent, children }: { open: boolean; onClose: () => void; name: string; area?: string; focusContent?: boolean; children: ReactNode }) {
  return (
    <CardDialog open={open} onClose={onClose} label={`${name} details`} className="fd-panel" handle=".fd-panel-head" snapBack="translate 300ms var(--fd-ease-drawer)">
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
    </CardDialog>
  );
}

export type { Details };
export { useDetails } from "@dashhaus/core/lovelace/card";

export interface ModuleFrameProps extends Omit<ModuleProps, "onOpen" | "children"> {
  /** From `useDetails`: the name opens the panel. */
  details: Details;
  /** The screen's pictogram and figure, in both footprints and the panel. */
  pict: ReactNode;
  read: ReactNode;
  /** The screen's meta lines, in a standard module and the panel. */
  meta?: [ReactNode, ReactNode?];
  /**
   * A compact row's line in place of the area, for what its screen can't hold (an alarm's mode); the panel keeps the
   * area. A row has no meta lines.
   */
  line?: string;
  /** First in a compact row: the key, or a reading's glyph. */
  lead: ReactNode;
  /**
   * The module's controls, drawn the same under the screen in a standard module and again under the panel's screen;
   * `where` keeps their ids apart. A card with controls brings them here, once.
   */
  controls?: (where: "m" | "p") => ReactNode;
  /** Under the screen in a standard module, where it isn't `controls`: a reading's glyph and today. */
  row?: ReactNode;
  /**
   * A standard module's whole body under its header, in place of its screen and row, for a card whose module has no
   * row (a camera's still, a window in the screen beside the screen's words). The card draws its own screen in it.
   */
  body?: ReactNode;
  /** A `Picture` over the panel's screen, at the panel's width (a camera's still), the screen's words under it. */
  panelPicture?: ReactNode;
  /** The panel screen's second channel (`Channel`), in place of its meta lines. */
  aside?: ReactNode;
  /** The panel's screen, where it says something else than the module's (an owlet's reading under its alarm). */
  panelScreen?: { pict: ReactNode; read: ReactNode; meta?: [ReactNode, ReactNode?] };
  /** The panel's small print, last. */
  facts?: { start?: ReactNode; end?: ReactNode };
  /** The panel's own blocks, between its controls and its facts. */
  children?: ReactNode;
  /** The panel opens with focus in its content (its `[data-autofocus]`), not on its close key. */
  panelFocus?: "content";
  /**
   * What can't wait: the module draws its level (`Module`'s `level`), and reports it to the dashboard's alert line, its
   * name opening this module's details. `what` is the line's words ("Critical oxygen 79%"), `say` the alarm's, and
   * `startedAt` when it started, if known, which keeps an alarm's flash in phase.
   */
  alert?: Omit<AlertEntry, "name"> & { say?: string };
}

/**
 * Every field card's frame: the module in its footprint, a compact row's lead and screen or a standard module's screen
 * and controls, and the detail panel its name opens: the screen again with its second channel, the controls again,
 * the card's own blocks, and its facts. A card brings what goes in it.
 */
export function ModuleFrame({ details, pict, read, meta, line, lead, controls, row = controls?.("m"), body, panelPicture, aside, panelScreen, facts, panelFocus, alert, children, ...module }: ModuleFrameProps) {
  const { compact } = cardShape({ footprint: module.footprint });
  useReportAlert(alert && { level: alert.level, name: module.name, what: alert.what, startedAt: alert.startedAt }, details.openDetails);
  const screen = panelScreen ?? { pict, read, meta };
  return (
    <>
      <Module {...module} area={compact ? line ?? module.area : module.area} onOpen={details.openDetails} level={alert?.level} say={alert?.say} since={alert?.startedAt}>
        {compact ? (
          <>
            {lead}
            <Screen pict={pict}>{read}</Screen>
          </>
        ) : body ?? (
          <>
            <Screen pict={pict} meta={meta}>{read}</Screen>
            {row}
          </>
        )}
      </Module>
      <Panel open={details.open} onClose={details.closeDetails} name={module.name} area={module.area} focusContent={panelFocus === "content"}>
        <PanelBody className={`${module.kind}-panel`} state={module.state} rest={module.rest}>
          {panelPicture}
          <Screen pict={screen.pict} meta={screen.meta} aside={aside}>{screen.read}</Screen>
          {controls?.("p")}
          {children}
          {facts && <Facts {...facts} />}
        </PanelBody>
      </Panel>
    </>
  );
}
