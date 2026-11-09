import { Children, createContext, useContext, useEffect, useId, useLayoutEffect, useRef } from "react";
import type { ComponentType, CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { useDial, useKeypad, usePress, useSlider } from "@dashhaus/core/primitives";
import type { SliderOptions } from "@dashhaus/core/primitives";
import { useHourCycle, useSettled } from "@dashhaus/core/hooks";
import type { Picture as PictureLifecycle } from "@dashhaus/core/hooks";
import { CardDialog, detailsSheet as detailsSheetOf, detailsTile as detailsTileOf, useCardFrame } from "@dashhaus/core/lovelace/card";
import type { CardFootprint, CardProps, SheetProps, TileProps } from "@dashhaus/core/lovelace/card";
import type { HourSample, Reading } from "@dashhaus/core/entities/history";
import { fmt1, fmtDuration } from "@dashhaus/core/entities/format";
import { lastSeenFact, unavailableSince } from "@dashhaus/core/entities/facts";
import { ACTION_FAILED, CHECKING_CODE, WAITING, WRONG_CODE } from "@dashhaus/core/entities/guard";
import { PICTURE_WORDS } from "@dashhaus/core/entities/picture";
import { hourLabel, lineParts } from "@dashhaus/core/entities/clock";
import type { Severity } from "@dashhaus/core/entities/severity";
import "./card.css";

/** CSS custom properties in a style prop. */
export type Vars = CSSProperties & Record<`--${string}`, string | number>;

/* ---------- Colour ----------
   One accent hue (tokens.css --brand-c/--brand-h, set for a whole dashboard by its `accent`) means on: solid for
   energy, soft for on-but-not-energy. Neutrals for the rest. A card has no colour of its own. */

/** `CardProps` are the props every card takes, whatever its entity: the frame's. */
export type { CardFootprint, CardProps, SheetProps, TileProps };

export type Role = "energy" | "state" | "reading";

/** Card titles are H2 outside a titled section and H3 inside one. Detail sheets reset to H2. */
export const CardHeadingLevelContext = createContext<2 | 3>(2);

/**
 * A card with a guarded action (a lock's unlock, an alarm's disarm): its details open on the action they ask for, and
 * its sheet starts on it. `detailsTile` wires both, so the card needs no tile of its own.
 */
export interface ActionCardProps<A> extends CardProps {
  /** Card only: the name opens the sheet; with an action, on that action's question or keypad. */
  onOpenDetails?: (action?: A) => void;
  /** Sheet only: start on this action's question or keypad. */
  action?: A;
}

/** A titled bundle's lid: what the members make up, and its room. Members don't repeat what it says. */
export const BundleLid = createContext<{ title: string; area?: string } | null>(null);

/**
 * The area a column's heading names (a wall's column, spec/orb.md → Dashboards): a card in that area doesn't repeat
 * it, as a titled bundle's members don't repeat their lid's room. Its sheet, seen without the heading, still says it.
 */
export const AreaHeading = createContext<string | null>(null);

const sameArea = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * What a card derives from its variant and footprint. `code` is the card's class prefix ("lw").
 * Spread `article` onto the `<article>`, give `nameId` to the `CardTitle`, and build other ids from `uid`.
 * Show `area`, not the entity's own: under a titled bundle's lid a member in the lid's room has none on its
 * card (the lid says it once, for all of them), and its sheet, seen without the lid, says whose part it is. Under a
 * column's area heading (`AreaHeading`) a card in that area has none either, and its sheet keeps it.
 */
export function useCard(code: string, { variant = "card", footprint = "standard", showControl = true, area: own }: Pick<CardProps, "variant" | "footprint" | "showControl"> & { area?: string }) {
  const { uid, nameId, sheet, compact, featured, bare } = useCardFrame({ variant, footprint, showControl });
  const lid = useContext(BundleLid);
  const heading = useContext(AreaHeading);
  const inLidRoom = lid != null && (own == null || (lid.area != null && sameArea(own, lid.area)));
  const area = !lid ? (!sheet && own != null && heading != null && sameArea(own, heading) ? undefined : own)
    : sheet ? [lid.title, inLidRoom ? lid.area : own].filter(Boolean).join(" · ")
    : inLidRoom ? undefined : own;
  return {
    uid,
    nameId,
    area,
    sheet,
    compact,
    featured,
    bare,
    article: {
      className: `hd ${code}${sheet ? " hd--sheet" : ""}${compact ? " hd--compact" : ""}${featured ? " hd--featured" : ""}`,
      "data-control": bare ? "off" : undefined,
      "aria-labelledby": nameId,
    },
  };
}

/** The colour attributes for a card's article: its role and its glow. */
export function paint(role: Role, glow: number) {
  return {
    "data-role": role,
    "data-glow": glow > 0 ? "" : undefined,
    style: { "--hd-glow": +glow.toFixed(3) } as Vars,
  };
}

export type { HourSample, Reading };

/** Scale readings for a Today strip; shared with every skin through packages/core/src/entities/history.ts. */
export { normalizeReadings } from "@dashhaus/core/entities/history";

export const IconClose = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" /></svg>;

/* ---------- Orb: the round main toggle. Tap toggles, press and hold opens details. ---------- */
export interface OrbProps {
  label: string;
  pressed: boolean;
  unavailable?: boolean;
  /** 0-1, scales the bloom around the orb. */
  intensity?: number;
  small?: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
  children: ReactNode;
}
export function Orb({ label, pressed, unavailable, intensity = 1, small, onToggle, onLongPress, children }: OrbProps) {
  const press = usePress({ onPress: onToggle, onHold: onLongPress, pressed, unavailable });
  return (
    <button className={`hd-orb${small ? " hd-orb--sm" : ""}`} aria-label={label} style={{ "--b": intensity } as Vars} {...press}>
      <span className="hd-orb-i">{children}</span>
    </button>
  );
}

/* ---------- Card title. With onOpen, the name is the details button: tap the name for the sheet. ----------
   The button's hit area is stretched by CSS (.hd-open::after) over the header, or the whole compact row.
   `id` labels the card and the heading, so it sits on the name alone; the hint ("details") only joins the button's name. */
export function CardTitle({ id, name, onOpen, openHint = "details", children }: { id: string; name: string; onOpen?: () => void; openHint?: string; children?: ReactNode }) {
  const Heading = useContext(CardHeadingLevelContext) === 3 ? "h3" : "h2";
  return (
    <div className="hd-title">
      {/* Labelled by the name alone, so the heading stays "Kitchen" while the button inside reads "Kitchen details". */}
      <Heading className="hd-name" aria-labelledby={onOpen ? id : undefined}>
        {onOpen
          ? (
            <button type="button" className="hd-open" title={name} aria-label={`${name} ${openHint}`} aria-haspopup="dialog" onClick={onOpen}>
              <span id={id}>{name}</span>
              <svg className="hd-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5l4.5 4.5L6 12.5" /></svg>
            </button>
          )
          : <span id={id} title={name}>{name}</span>}
      </Heading>
      {children}
    </div>
  );
}

/** Round icon button. On cards it only closes the sheet; details open from the title or a press and hold. */
export function CircleButton({ label, onClick, autoFocus, children }: { label: string; onClick?: () => void; autoFocus?: boolean; children: ReactNode }) {
  return (
    <button type="button" className="hd-circ" aria-label={label} onClick={onClick} data-autofocus={autoFocus || undefined}>
      <span className="hd-circ-i">{children}</span>
    </button>
  );
}

/** The sheet's close button. Focus lands on it when the sheet opens, unless something in the sheet needs it more. */
export function SheetClose({ label, onClick, focusOnOpen = true }: { label: string; onClick?: () => void; focusOnOpen?: boolean }) {
  return (
    <CircleButton
      label={label}
      onClick={onClick}
      // Dialog focus management, not page-load focus theft.
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={focusOnOpen}
    ><IconClose /></CircleButton>
  );
}

function AlertCue({ label }: { label: string }) {
  return (
    <span className="hd-alert-cue" role="img" aria-label={label}>
      <svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" /><path d="M7 3.8v4.1M7 10.3h.01" /></svg>
    </span>
  );
}

export function AlertStatus({ label, children }: { label: string; children: ReactNode }) {
  return <><AlertCue label={label} /><span className="hd-warn">{timed(children)}</span></>;
}

/**
 * A line of words with each time in it drawn as one piece (core's `lineParts`), so where the line clips its ellipsis
 * drops a time whole, with its period, and never cuts it (`Sets in 5h 14m…`, never `· 5:0…`; spec/cards.md → Clock
 * words follow the dashboard's hour cycle). Anything but a string is drawn as it is.
 */
export function timed(line: ReactNode): ReactNode {
  if (typeof line !== "string") return line;
  const parts = lineParts(line);
  if (!parts.some((part) => part.time)) return line;
  return parts.map((part, index) => (part.time ? <span key={index} className="hd-time">{part.text}</span> : part.text));
}

/**
 * An alarm that has gone off, in the slot: the one place warn fills (spec/orb.md → One UI language). Its alert on the
 * left in bold, any others after it while there is room (`more`), and its figure or since when on the right
 * (`value`), then the one thing to do about it where there is one (`action`, a security alarm's Disarm; a compact row
 * keeps the alert and the action). Pass it to `CardFrame`'s `urgent`, which shows it over the card's control or value
 * in every footprint. Announced once, as an alert.
 */
export function AlarmPill({ alert, more, value, action }: { alert: ReactNode; more?: ReactNode; value?: ReactNode; action?: ReactNode }) {
  return (
    <div className="hd-alarm" role="alert" data-action={action ? "" : undefined}>
      <span className="hd-alarm-l"><b>{alert}</b>{more && <span className="hd-alarm-c"> · {more}</span>}</span>
      {value && <span className="hd-alarm-v">{value}</span>}
      {action}
    </div>
  );
}

/** Full-width toggle button: raised when off, the accent when on. */
/** `turnOn`: the off-state control of a unit whose status line already says Off (climate, humidifier). */
/** Without `on` it acts once (Refresh, New code): raised, and not announced as a toggle. */
/** `disabled`: nothing to do now (a step at its bound): it lies flat, as a disabled button does. */
/**
 * `action`, in place of `extra`: what a press does, after the state word (`Playing · Pause`). A pill's word is what
 * pressing it does, so it is whole: the state gives way before it, and under 260 px the pill says the action alone, the
 * card's status line saying the state it dropped (`Said`; spec/orb.md → A pill says what a press does).
 */
export function TogglePill({ label, on, onToggle, children, extra, action, turnOn, disabled }: { label: string; on?: boolean; onToggle: () => void; children: ReactNode; extra?: ReactNode; action?: ReactNode; turnOn?: boolean; disabled?: boolean }) {
  const press = usePress({ onPress: onToggle, pressed: on, disabled });
  const second = action ?? extra;
  return (
    <button className={turnOn ? "hd-pill hd-pill--turn-on" : "hd-pill"} aria-label={label} {...press}>
      <span className="hd-pill-w">{children}</span>
      {second && <span className="hd-pill-x" data-action={action ? "" : undefined}>{second}</span>}
    </button>
  );
}

/**
 * The state a pill with an `action` drops under 260 px, at the head of the status line there, so a narrow card still
 * says it: `rest` when the line says more after it, `behind` after a warning, which leads. Hidden where the pill says
 * the state itself.
 */
export function Said({ word, rest, behind }: { word: ReactNode; rest?: boolean; behind?: boolean }) {
  return <span className="hd-said">{behind ? " · " : ""}{word}{rest ? " · " : ""}</span>;
}

/**
 * The small print at the foot of a card's sheet: two facts, at its start and its end (when it last changed, what it
 * can do). Their words come from `@dashhaus/core/entities/facts`, the same on every card; `warn` marks the start's.
 */
export function Facts({ start, end, warn }: { start?: ReactNode; end?: ReactNode; warn?: boolean }) {
  return (
    <p className="hd-info">
      <span className={warn ? "hd-warn" : undefined}>{start}</span>
      <span>{end}</span>
    </p>
  );
}

/**
 * The slot of an entity Home Assistant reports unavailable: a dashed outline, its word and when it was last seen.
 * `word` says why where the card knows ("Charging"); default "Unavailable".
 */
export function UnavailableSlot({ lastSeen, word = "Unavailable" }: { lastSeen?: string; word?: string }) {
  return (
    <div className="hd-unav">
      <span>{word}</span>
      {lastSeen && <span className="hd-unav-t">{lastSeenFact(lastSeen)}</span>}
    </div>
  );
}

/**
 * A reading's figures as a readout, with no container. `label` says them; what shows is their stylized
 * rendering. With `onOpen` it is the button that opens details, otherwise an image of its label.
 */
export function Readout({ label, onOpen, children }: { label: string; onOpen?: () => void; children: ReactNode }) {
  const inner = <span className="hd-read-i" aria-hidden="true">{children}</span>;
  return onOpen
    ? <button type="button" className="hd-read" aria-label={`${label}. Open details`} onClick={onOpen}>{inner}</button>
    : <div className="hd-read" role="img" aria-label={label}>{inner}</div>;
}

/** A framed landscape: a picture's glyph where its card has none of its own. */
export const IconPicture = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 16l5-5 4 4 3-3 6 6" /><circle cx="16" cy="9" r="1.5" /></svg>;

export interface PictureProps {
  /** Its lifecycle, from `usePicture` (`@dashhaus/core/hooks`): the frame to draw, and the ref that says it is seen. */
  picture: Pick<PictureLifecycle, "ref" | "src" | "status">;
  /** What the picture is, said for it ("Front door camera"). */
  label: string;
  /** Its box's aspect ratio ("16 / 9", "1 / 1"); a card may give it a height instead. */
  ratio?: string;
  /** `cover` crops the frame to the box (a card); `contain` shows the whole frame (a sheet). */
  fit?: "cover" | "contain";
  unavailable?: boolean;
  /** What a press opens: the live stream, or the card's details. Without it, or while unavailable (a camera that is
   * gone has no stream to open), the picture isn't a button. */
  onOpen?: () => void;
  /** What the press does, said after the label: "Open live view". Default core's `PICTURE_WORDS.open`. */
  openLabel?: string;
  /** The card's glyph, drawn while there is no frame. */
  children?: ReactNode;
}

/**
 * A picture: a camera's still or a player's artwork. A readout, so it has no raised or recessed edge: a neutral well of
 * a fixed size, the frame in it, and never a word over it (the card says how old a still is on its status line). Before
 * a frame, on a failed one and while unavailable it is the well with the card's glyph; unavailable adds the dashed
 * outline, as everything unavailable has. It never glows and never carries a state. With `onOpen` it is the button
 * that opens it, pressed as a readout is; unavailable, it ignores `onOpen` and takes no press or focus.
 */
export function Picture({ picture, label, ratio, fit = "cover", unavailable = false, onOpen, openLabel = PICTURE_WORDS.open, children = <IconPicture /> }: PictureProps) {
  const src = unavailable ? undefined : picture.src;
  const inner = (
    <span className="hd-pic-i">
      {src
        ? <img className="hd-pic-img" src={src} alt="" draggable={false} decoding="async" />
        : <span className="hd-pic-glyph" aria-hidden="true">{children}</span>}
    </span>
  );
  const box = { className: "hd-pic", style: ratio ? { aspectRatio: ratio } : undefined, "data-fit": fit, "data-status": unavailable ? "unavailable" : picture.status };
  return onOpen && !unavailable
    ? <button type="button" ref={picture.ref} {...box} aria-label={`${label}. ${openLabel}`} onClick={onOpen}>{inner}</button>
    : <div ref={picture.ref} {...box} role="img" aria-label={label}>{inner}</div>;
}

/** The minus and the plus that step a value, in their shared size (`hd-step-i`). */
export const IconMinus = () => <svg className="hd-step-i" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8" /></svg>;
export const IconPlus = () => <svg className="hd-step-i" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8M7 3v8" /></svg>;

/**
 * Setpoint stepper: a groove with a minus and a plus button at its ends, the value between them.
 * `kicker` says what the value does ("Heat to"); it shows from 260 px and in the sheet. `cue` is a small
 * icon before the value, for compact rows that keep their mode there.
 */
export function Stepper({ label, kicker, cue, value, unit, format = String, min, max, step, onChange }: { label: string; kicker?: string; cue?: ReactNode; value: number; unit: string; format?: (v: number) => string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const down = Math.max(min, +(value - step).toFixed(2));
  const up = Math.min(max, +(value + step).toFixed(2));
  return (
    <div className="hd-step" role="group" aria-label={label}>
      <button type="button" className="hd-step-b" aria-label={`Lower to ${format(down)}${unit}`} disabled={value <= min} onClick={() => onChange(down)}><span><IconMinus /></span></button>
      <span className="hd-step-v" aria-live="polite">
        {kicker && <span className="hd-step-k">{kicker}</span>}
        {cue && <span className="hd-cue">{cue}</span>}
        {format(value)}<small>{unit}</small>
      </span>
      <button type="button" className="hd-step-b" aria-label={`Raise to ${format(up)}${unit}`} disabled={value >= max} onClick={() => onChange(up)}><span><IconPlus /></span></button>
    </div>
  );
}

/* ---------- Track: a groove you slide along or set ----------
   Every orb control that slides draws its track here. The card calls useSlider or useRangeSlider with what only
   it knows (its ends, its snap, how a pointer reads along it) and hands the result over; the track draws the
   groove, the hit layer that takes the pointer and leaves vertical swipes to the page, the hidden range inputs
   for keyboard and screen readers, and the focus ring. The card's own fill and marks are its children. */

/** What a track takes from useSlider or useRangeSlider: the root's ref and the hit layer's pointer handlers. */
export type TrackGesture = Pick<ReturnType<typeof useSlider<HTMLDivElement>>, "rootProps" | "hitProps">;
/** One hidden range input: a slider's `inputProps`, with its id, and its label unless a `<label>` names it. */
export type TrackInput = InputHTMLAttributes<HTMLInputElement> & { id: string };

export interface TrackProps {
  slider: TrackGesture;
  /** One per value: a slider's input, or a range's low and high. */
  inputs: TrackInput[];
  /** The card's class for this track ("lw-bar"); `hd-track` comes with it. */
  className?: string;
  /**
   * The value on the groove, drawn twice: on the groove, and on the fill in --on-accent, so it flips where the
   * fill passes under it. The fill is clipped from the right by --v (0-1) less --cap, the end cap it keeps at
   * zero; a card with another shape sets its own clip-path on `.hd-track-fill`.
   */
  text?: ReactNode;
  /** Whether the fill shows. Off is the plain groove. Default true. */
  lit?: boolean;
  /** "thumb": the card draws the focus ring on what rides the track, not on the groove. */
  focus?: "groove" | "thumb";
  /** false draws no groove, for a track that is a scale (the warmth ruler). */
  groove?: boolean;
  disabled?: boolean;
  style?: Vars;
  /** The card's fill and marks, under the hit layer. */
  children?: ReactNode;
  [data: `data-${string}`]: string | boolean | undefined;
}

export function Track({ slider, inputs, className, text, lit = true, focus = "groove", groove = true, disabled, style, children, ...data }: TrackProps) {
  return (
    <div
      className={["hd-track", groove && "hd-track--groove", className].filter(Boolean).join(" ")}
      {...slider.rootProps}
      {...data}
      data-lit={lit ? undefined : "false"}
      data-focus={focus === "thumb" ? "thumb" : undefined}
      data-disabled={disabled || undefined}
      style={style}
    >
      {text != null && (
        <>
          <span className="hd-track-lab" aria-hidden="true">{text}</span>
          <span className="hd-track-fill" aria-hidden="true"><span className="hd-track-lab">{text}</span></span>
        </>
      )}
      {children}
      <div className="hd-track-hit" {...slider.hitProps} />
      {inputs.map(({ className: own, ...input }) => <input key={input.id} className={own ? `hd-track-in ${own}` : "hd-track-in"} {...input} />)}
    </div>
  );
}

export interface SliderTrackProps extends Omit<TrackProps, "slider" | "inputs" | "text" | "children"> {
  /** The hidden range input's id: a `<label htmlFor>` in the heading names it, or `label` does. */
  id: string;
  /** The input's spoken name, where no heading's label names it. */
  label?: string;
  /** `useSlider`'s options: the card's ends, snap, how a pointer reads along it, and what the value says. */
  slider: SliderOptions<HTMLDivElement>;
  /** The value on the groove, from the slider's live value (it moves under the finger before the entity answers). */
  text?: (value: number) => ReactNode;
  /** A heading over the track, `hd-blk-h`, from the live value: its label and what the value means. */
  heading?: (value: number) => ReactNode;
  /** Places of `--v`. Default 4. */
  precision?: number;
  /** The card's fill and marks, from the live value. */
  children?: (value: number) => ReactNode;
}

/**
 * A slider on a track: `useSlider` wired into `Track`, the live value set on the track as `--v` (0-1) and handed to
 * the text, the heading and the card's own fill. A card brings what only it knows, its ends, snap and fill; the
 * groove, the hit layer, the hidden input and the focus ring are the track's.
 */
export function SliderTrack({ id, label, slider: options, text, heading, precision = 4, style, children, ...track }: SliderTrackProps) {
  const slider = useSlider<HTMLDivElement>(options);
  const v = slider.value;
  const bar = (
    <Track
      slider={slider}
      inputs={[{ id, ...(label ? { "aria-label": label } : {}), ...slider.inputProps }]}
      text={text?.(v)}
      style={{ "--v": slider.fraction(v).toFixed(precision), ...style }}
      {...track}
    >
      {children?.(v)}
    </Track>
  );
  return heading ? <div className="hd-blk"><p className="hd-blk-h">{heading(v)}</p>{bar}</div> : bar;
}

/* ---------- Level bar: one level in a groove ---------- */

/** Width of a level groove's lit end cap, in px. Matches --cap on `.hd-level` in card.css. */
const LEVEL_CAP = 30;

export interface LevelBarProps {
  /** The hidden range input's id. */
  id: string;
  /** The input's spoken name, where no heading names it ("Kitchen brightness"). */
  label?: string;
  /** A label over the groove, naming its input ("Volume"). */
  heading?: string;
  /** The level, in the card's own steps (a percent, a speed), between `min` and `max`. */
  value: number;
  min: number;
  max: number;
  /** Whether the entity is on: the fill shows, and `text` is the groove's words. */
  on: boolean;
  /**
   * Setting the level switches the entity on (a light, a fan): setting the level the thumb already shows still
   * reports it while off, so a tap on the groove turns it on there. Without it, the level is set and the state kept.
   */
  wakes?: boolean;
  /** The groove's words while on, from the live level: "40%", "Speed 2". */
  text: (value: number) => ReactNode;
  /** The groove's words while off. Default "Off". */
  offText?: (value: number) => ReactNode;
  /** What a screen reader hears for the level, on and off: the card's words. */
  valueText: (value: number) => string;
  onChange: (value: number) => void;
}

/**
 * A level in a groove: a light's brightness, a sound's volume, a fan's speed. The accent fills the groove up to the
 * level while the entity is on, keeping a lit end cap at the bottom; the words on it invert where the fill passes,
 * and say Off while it is off. A card brings its words, its ends and what setting it does.
 */
export function LevelBar({ id, label, heading, value, min, max, on, wakes, text, offText = () => "Off", valueText, onChange }: LevelBarProps) {
  return (
    <SliderTrack
      id={id}
      label={label}
      slider={{ value: Math.round(value), min, max, inset: LEVEL_CAP / 2, reportUnchanged: wakes && !on, onChange, valueText }}
      heading={heading ? () => <label htmlFor={id}>{heading}</label> : undefined}
      className="hd-level"
      text={(v) => (on ? text(v) : offText(v))}
      lit={on}
    />
  );
}

/* ---------- Dial: a value you turn ---------- */

/** The dial's drawing, in its own units round its centre: its ticks' ring, the knob inside it, the stem's start. */
const DIAL = { outer: 86, inner: 62, knob: 48 } as const;
/** A point `r` from the dial's centre, `deg` clockwise from its top. */
const onDial = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: +(r * Math.sin(rad)).toFixed(2), y: +(-r * Math.cos(rad)).toFixed(2) };
};

export interface DialProps {
  /** The hidden range input's id. */
  id: string;
  /** The input's spoken name ("Living room fan aims"). */
  label: string;
  /** The heading over the dial ("Points"), and what the shown value means beside it ("58° right"). */
  heading: string;
  says: (value: number) => string;
  /** What a screen reader hears for a value. Default: `says`. */
  valueText?: (value: number) => string;
  value: number;
  min: number;
  max: number;
  /** The value at the top of the dial; values grow clockwise from it. */
  top: number;
  /** A tick every `step`, and the keyboard's step. Default 5. */
  step?: number;
  /** The word printed over the top ("Ahead"). */
  topLabel?: string;
  /** Where the ticks light in the accent, from the shown value: a sweep's ends, or a beam either side. */
  lit?: (value: number) => [low: number, high: number];
  /** Where the stem starts, out from the centre, past what the card draws there. Default 22. */
  hub?: number;
  disabled?: boolean;
  /** Sent once a drag is let go, or at each key step. */
  onChange: (value: number) => void;
  /**
   * The card's own drawing in the dial's middle, in the dial's units (its centre at 0, its ring 86 out), given how far
   * the shown value is turned from the top, in degrees: wrap what turns with it in `hd-dial-turn`.
   */
  children?: (turned: number) => ReactNode;
}

/**
 * A value you turn, round a circle (a fan's aim): its heading and what the value means, then a ring of ticks every
 * `step` over its range, a gap where it can't go, the ticks lit in the accent where `lit` says, and a stem from the
 * middle to a ring knob turned to the value, the card's own drawing in the middle. A press or a drag anywhere on it
 * turns it there (`useDial`), sent once when let go; the arrow keys step it on a hidden range input. What turns eases
 * round to a new value from a key or the card, and follows the finger at once.
 */
export function Dial({ id, label, heading, says, valueText = says, value, min, max, top, step = 5, topLabel, lit, hub = 22, disabled, onChange, children }: DialProps) {
  const dial = useDial<SVGSVGElement>({ value, min, max, top, step, disabled, valueText, onChange });
  const shown = dial.shown;
  const turned = shown - top;
  const [low, high] = lit?.(shown) ?? [Infinity, -Infinity];
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) ticks.push(v);
  const word = says(shown);
  return (
    <div className="hd-blk hd-dial">
      <p className="hd-blk-h"><label htmlFor={id}>{heading}</label><span className="hd-blk-v" aria-hidden="true">{word.charAt(0).toUpperCase() + word.slice(1)}</span></p>
      <div className="hd-dial-face">
        <input id={id} className="hd-dial-input" aria-label={label} {...dial.inputProps} />
        <svg viewBox="-100 -104 200 208" aria-hidden="true" aria-disabled={disabled || undefined} {...dial.rootProps}>
          {ticks.map((v) => {
            const a = onDial(v - top, DIAL.inner);
            const b = onDial(v - top, DIAL.outer);
            return <path key={v} className="hd-dial-tick" data-lit={v >= low && v <= high ? "" : undefined} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} />;
          })}
          {topLabel && <text className="hd-dial-top" x="0" y={-DIAL.outer - 8} textAnchor="middle">{topLabel}</text>}
          {children?.(turned)}
          <g className="hd-dial-turn" style={{ transform: `rotate(${turned}deg)` }}>
            <path className="hd-dial-stem" d={`M0 ${-hub}V${-DIAL.knob}`} />
            <circle className="hd-dial-knob" cy={-DIAL.knob} r="9" />
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ---------- Today strip ---------- */
/** The hours the strip's axis names, a quarter of the day apart: 00 06 12 18, or 12AM 6AM 12PM 6PM on 12 hours. */
const AXIS_HOURS = [0, 6, 12, 18] as const;

/** `forecastFrom`: hours from this index on are forecasts, drawn as lighter sticks. */
export function TodayStrip({ samples, currentHour, summary, title = "Today", tone, forecastFrom }: { samples: HourSample[]; currentHour: number; summary: string; title?: string; tone?: string; forecastFrom?: number }) {
  const hourCycle = useHourCycle();
  return (
    <div className="hd-tl" style={tone ? ({ "--accent-strong": tone } as Vars) : undefined}>
      <p className="hd-tl-h"><span>{title}</span><span className="hd-tl-v">{summary}</span></p>
      <div className="hd-tl-bars" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => {
          const x = samples[i];
          let s: string;
          let h = 0;
          if (x === "unavailable") s = "unav";
          else if (x === null || x === undefined) s = "future";
          else if (forecastFrom != null && i >= forecastFrom) { s = "fc"; h = x; }
          else if (i === currentHour) { s = x > 0 ? "now" : "now-off"; h = x; }
          else if (x > 0) { s = "on"; h = x; }
          else s = "off";
          return <i key={i} data-s={s} style={{ "--h": h.toFixed(2) } as Vars} />;
        })}
      </div>
      <div className="hd-tl-axis" aria-hidden="true">{AXIS_HOURS.map((hour) => <span key={hour}>{hourLabel(hour, hourCycle)}</span>)}</div>
    </div>
  );
}

/** Minutes as "54m", "3h", "11h 54m". Callers handle 0 with their own words ("Not on today"). */
export { fmt1, fmtDuration };

/* ---------- Choice chips: one of several, the selected one in the accent ---------- */
export interface ChoiceOption<T extends string | number> { value: T; label: string; sub?: string }

/** One chip: pressed while its option is the chosen one. `className` adds to `hd-chip`. */
export function Chip({ selected, className, onPick, children }: { selected: boolean; className?: string; onPick: () => void; children: ReactNode }) {
  const press = usePress({ onPress: onPick, pressed: selected });
  return <button className={className ? `hd-chip ${className}` : "hd-chip"} {...press}>{children}</button>;
}

export function ChoiceChips<T extends string | number>({ id, label, options, value, onChange }: { id: string; label: string; options: ChoiceOption<T>[]; value: T | null | undefined; onChange: (v: T) => void }) {
  return (
    <div className="hd-blk">
      <p className="hd-blk-h"><span id={id}>{label}</span></p>
      <div className="hd-chips" role="group" aria-labelledby={id} style={{ "--n": options.length } as Vars}>
        {options.map((o) => (
          <Chip key={String(o.value)} selected={value === o.value} onPick={() => onChange(o.value)}>
            <span>{o.label}</span>
            {o.sub && <small>{o.sub}</small>}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/* ---------- Guarded actions: the question and the keypad ----------
   An action that asks first (a lock's unlock, an alarm's disarm) is answered in the sheet, on useGuardedAction: by a
   question when no code is asked for, by the keypad when one is. The card says what the action is; these draw it. Every
   word is core's (`@dashhaus/core/entities/guard`, the domain's own words); Orb's punctuation is theirs to add: an
   in-progress word ends in `…`, a sentence in `.` (spec/orb.md → One state vocabulary). */

export interface ConfirmProps {
  /** The question: "Unlock Front door?" */
  question: string;
  /** What it means, under the question: "Anyone at the door can open it." */
  detail: string;
  /** The action's button: "Unlock". */
  action: string;
  /** The answer is on its way: the action takes no press, and the detail says so. */
  busy?: boolean;
  /** What the detail says while busy, in core's words (`waitingFor`); the part ends it in `…`. Default core's `WAITING`. */
  waiting?: string;
  /** The last try didn't go through, in core's words (`ACTION_FAILED`): said in the detail's place, ended in `.`. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The question, in the sheet, for a guarded action that takes no code: what is asked, what it means, and two buttons.
 * Cancel takes focus, so Enter never acts; the action, in the inverse, is the one urgent action on the sheet. The
 * action takes no press for a moment after it appears, so the second tap of a double tap that asked can't land on it.
 */
export function Confirm({ question, detail, action, busy, waiting = WAITING, error, onConfirm, onCancel }: ConfirmProps) {
  const id = useId();
  const settled = useSettled();
  const cancel = useRef<HTMLButtonElement>(null);
  // A sheet opening on the question focuses Cancel through data-autofocus; one already open is focused here.
  useEffect(() => { if (cancel.current?.closest("dialog")?.open) cancel.current.focus(); }, []);
  return (
    <div className="hd-cf" role="group" aria-labelledby={`${id}-q`} aria-describedby={`${id}-d`}>
      <p className="hd-cf-q" id={`${id}-q`}>{question}</p>
      <p className="hd-cf-d" id={`${id}-d`} role="status">{busy ? `${waiting}…` : error ? <span className="hd-warn">{`${error}.`}</span> : detail}</p>
      <div className="hd-cf-b">
        <button type="button" className="hd-cf-x" ref={cancel} data-autofocus="" onClick={onCancel}>Cancel</button>
        <button type="button" className="hd-cf-ok" disabled={busy} onClick={() => { if (settled()) onConfirm(); }}>{action}</button>
      </div>
    </div>
  );
}

export interface KeypadProps {
  /** What the code is for: "Enter the code to disarm". */
  prompt: string;
  /** Letters as well as digits (Home Assistant's `code_format: text`). */
  text?: boolean;
  /** `useKeypad`'s: true accepted, false a wrong code, a throw a call that didn't go through. */
  onSubmit: (code: string) => boolean | Promise<boolean>;
  onCancel: () => void;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * The code keypad, in the sheet, on `useKeypad`: typing the code is the confirmation. Digits, delete and enter; a
 * physical keyboard types too. A text code (letters as well) is typed into a recessed field in the dots' place, which
 * takes the focus so a phone brings up its keyboard; the digit keys still type into it. It may answer later: the dots
 * breathe while it checks. A wrong code shakes the dots and clears; one that didn't go through stays, so Enter tries
 * again. The prompt line is the status: what is asked, then Checking, then what went wrong, read out as it changes.
 */
export function Keypad({ prompt, text, onSubmit, onCancel }: KeypadProps) {
  const id = useId();
  // Focuses itself (or, for a text code, its field) when it appears, so typing and Enter go to it.
  const { code, error, busy, press, back, submit, rootProps, inputProps } = useKeypad({ text, onSubmit });
  const dots = Math.max(4, code.length);
  const entered = `${code.length} ${text ? "characters" : "digits"} entered`;
  return (
    <div className="hd-kp" {...rootProps} aria-label={prompt}>
      <p className="hd-kp-p" id={`${id}-p`} role="status">{busy ? `${CHECKING_CODE}…`
        : error === "wrong" ? <span className="hd-warn">{`${WRONG_CODE}.`}</span>
        : error === "failed" ? <span className="hd-warn">{`${ACTION_FAILED}.`}</span>
        : prompt}</p>
      {inputProps ? (
        // The placeholder is the hint that letters work; the prompt above is its label.
        <input className="hd-kp-in" {...inputProps} aria-labelledby={`${id}-p`} data-error={error === "wrong" || undefined} placeholder="Letters or digits" />
      ) : (
        <div className="hd-kp-dots" data-error={error === "wrong" || undefined} data-busy={busy || undefined} role="img" aria-label={entered}>
          {Array.from({ length: dots }, (_, i) => <i key={i} data-on={i < code.length || undefined} />)}
        </div>
      )}
      <div className="hd-kp-keys" role="group" aria-labelledby={`${id}-p`}>
        {DIGITS.map((d) => <button key={d} type="button" className="hd-key" onClick={() => press(d)} disabled={busy}>{d}</button>)}
        <button type="button" className="hd-key" aria-label="Delete" onClick={back} disabled={!code || busy}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 5h8.5v10H7.5L3.5 10ZM9.5 8l4 4M13.5 8l-4 4" /></svg>
        </button>
        <button type="button" className="hd-key" onClick={() => press("0")} disabled={busy}>0</button>
        <button type="button" className="hd-key hd-key--ok" aria-label="Enter code" onClick={submit} disabled={!code || busy}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5 8.5 14 15 6.5" /></svg>
        </button>
      </div>
      <button type="button" className="hd-cf-x hd-kp-x" onClick={onCancel}>Cancel</button>
    </div>
  );
}

/* ---------- Sheet: modal dialog ----------
   Phones (600px and under): a bottom sheet that slides up, with a grab handle and a pinned header. The frame's
   CardDialog owns the modal behaviour: the drag down to dismiss, the exit transition, Escape and the backdrop.
   This draws the card system's content, and for a bundle's lead the bundle's other members. */

/**
 * What a sheet shows under its card, set by whoever renders the tile. A bundle's lead uses it to list
 * the bundle's other members in its sheet. Sheets inside that list get none, so it never nests.
 */
export const SheetExtra = createContext<{ title: string; content: ReactNode } | null>(null);

export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const extra = useContext(SheetExtra);
  return (
    <CardDialog open={open} onClose={onClose} label={label} className="hd-sheet" handle=".hd--sheet > .hd-head" snapBack="translate 300ms var(--ease-drawer)">
      <CardHeadingLevelContext.Provider value={2}>
        <div className={`hd-c${extra ? " hd-c--more" : ""}`}>
          {children}
          {extra && (
            <SheetExtra.Provider value={null}>
              <section className="hd-more" aria-label={extra.title}>
                <h3 className="hd-blk-h">{extra.title}</h3>
                {extra.content}
              </section>
            </SheetExtra.Provider>
          )}
        </div>
      </CardHeadingLevelContext.Provider>
    </CardDialog>
  );
}

/* ---------- Sheet and tile for a card ----------
   Every card renders twice: as the card, and as itself in its details sheet (`variant="sheet"`).
   The frame composes them; orb supplies its sheet and the container its cards are sized in. */

/** The details sheet for a card: the card itself as `variant="sheet"`, in a `Sheet`. */
export function detailsSheet<P extends CardProps & { entity: { name: string } }>(Card: ComponentType<P>, label = (name: string) => `${name} details`) {
  return detailsSheetOf(Card, Sheet, (props) => label(props.entity.name));
}

/** A dashboard-ready tile for a card: the card in its size container, plus its details sheet. */
export function detailsTile<P extends CardProps>(Card: ComponentType<P>, DetailsSheet: ComponentType<SheetProps<P>>) {
  return detailsTileOf(Card, DetailsSheet, "hd-c");
}

/* ---------- The card frame ----------
   Every card is drawn in one frame: the article with its footprint and colour, the head (the orb a control is pressed
   on or a reading's bare icon, the name with its status line and compact value, the large readout, the sheet's close
   button), the slot (the bare value with no control, the unavailable slot, or the card's control), then the card's
   body in its own order (`SheetBlock`, `Today`, anything of its own) and the sheet's facts. A card brings its words,
   its control and its blocks; the frame draws where they go. */

/** What the frame tells the blocks in it: whether they are in the sheet, and whether the entity is unavailable. */
const FrameContext = createContext<{ sheet: boolean; unavailable: boolean; lastSeen?: string }>({ sheet: false, unavailable: false });

/** The large readout in the head: a figure, or the control's own word repeated where the control isn't shown. */
export interface CardReadout {
  value: ReactNode;
  /** It repeats the control's word ("On"), not a figure of its own: set smaller, and hidden while the control shows. */
  duplicate?: boolean;
  /** Spoken where it stands for a reading (the sheet's large figure); otherwise hidden from screen readers. */
  label?: string;
  /** It says a word (On, Locked, a named speed), not a figure: set a little smaller than a number, and at the one word
   *  size in the sheet (`hd-num--word`; spec/orb.md → Readout type). Mark every word, a `hd-num--long` one too. */
  word?: boolean;
  /** The card's own class for it. */
  className?: string;
}

export interface CardFrameProps {
  /** `useCard`'s result. */
  card: Pick<ReturnType<typeof useCard>, "article" | "nameId" | "sheet" | "compact" | "bare">;
  name: string;
  /** The article's own attributes: its state (`data-state`, `data-armed`…) and `paint()`'s colour. */
  attrs: { [data: `data-${string}`]: string | undefined; style?: Vars };
  /**
   * How much the card's warning may claim, as core ranks it (`packages/core/src/entities/severity.ts`): written on the
   * article as `data-level`, as Field's module writes it, for the dashboard's attention budget (`dashboards/layout.css`).
   * It draws nothing itself; the card's marker or alarm says it. A card with a level never glows (spec/orb.md →
   * Composing for a glance), and the frame doesn't strip one: `paint()` is given no glow.
   */
  level?: Severity;
  /** A control's orb: what it says and does, its icon as children. The frame adds unavailable and press and hold. */
  orb?: Omit<OrbProps, "unavailable" | "onLongPress">;
  /** A reading's bare icon, in place of an orb. */
  glyph?: ReactNode;
  unavailable?: boolean;
  /** When an unavailable entity was last seen: the slot and `Today` say so. */
  lastSeen?: string;
  /** The unavailable slot's word where the card knows why ("Charging"). Default "Unavailable". */
  unavailableWord?: string;
  /** Card only: the name, and a press and hold on the orb, open the details. */
  onOpen?: () => void;
  /** What the name's button adds to it for screen readers. Default "details". */
  openHint?: string;
  /** The status line under the name. */
  status: ReactNode;
  statusTitle?: string;
  /** A compact row's value under the name. */
  value: ReactNode;
  /** A compact value that warns: its marker's spoken label. */
  alert?: string | null;
  /** The value in place of a hidden control. Default `value`. */
  bareValue?: ReactNode;
  readout?: CardReadout;
  /** Sheet only. */
  onClose?: () => void;
  /** Default "Close <name>". */
  closeLabel?: string;
  /** Focus lands on the close button when the sheet opens. Default true. */
  closeFocus?: boolean;
  /** The card's control, or a reading's figures, in the slot while the entity is available. */
  control?: ReactNode;
  /** What can't wait, shown in the slot over everything else (an owlet's vital alarm). */
  urgent?: ReactNode;
  /** false: no slot (a sheet whose large figure already says it all). Default true. */
  slot?: boolean;
  /**
   * What the slot shows, in the card's own words ("setpoint", "range"): when it changes, the new content fades in,
   * scaled up a little where motion is allowed, so a control that swaps for another is seen to. Without it the slot
   * swaps at once.
   */
  slotKind?: string;
  /** The sheet's small print. */
  facts?: { start?: ReactNode; end?: ReactNode; warn?: boolean };
  /** The card's body after the slot, in its order: `SheetBlock`s, `Today`, and anything of its own. */
  children?: ReactNode;
}

/** The slot's ref: when `kind` changes, what it shows fades in, at the card system's press duration and easing. */
function useSlotChange(kind: string | undefined) {
  const slotRef = useRef<HTMLDivElement>(null);
  const previousKind = useRef(kind);

  useLayoutEffect(() => {
    if (previousKind.current === kind) return;
    previousKind.current = kind;

    const slot = slotRef.current;
    if (!slot?.animate) return;

    const styles = getComputedStyle(slot);
    const press = styles.getPropertyValue("--press").trim();
    const duration = Number.parseFloat(press) * (press.endsWith("ms") ? 1 : 1000);
    const easing = styles.getPropertyValue("--ease-out").trim();
    if (!duration || !easing) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animation = slot.animate(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: "scale(0.97)" }, { opacity: 1, transform: "scale(1)" }],
      { duration, easing },
    );
    return () => animation.cancel();
  }, [kind]);

  return slotRef;
}

export function CardFrame({ card, name, attrs, level, orb, glyph, unavailable = false, lastSeen, unavailableWord, onOpen, openHint, status, statusTitle, value, alert, bareValue = value, readout, onClose, closeLabel, closeFocus = true, control, urgent, slot = true, slotKind, facts, children }: CardFrameProps) {
  const { article, nameId, sheet, compact, bare } = card;
  const slotRef = useSlotChange(slotKind);
  const open = sheet ? undefined : onOpen;
  const shown = urgent ?? (bare ? <p className="hd-val">{bareValue}</p> : unavailable ? <UnavailableSlot lastSeen={lastSeen} word={unavailableWord} /> : control);
  return (
    <FrameContext.Provider value={{ sheet, unavailable, lastSeen }}>
      <article {...article} {...attrs} data-level={level}>
        <header className="hd-head">
          {orb
            ? <Orb {...orb} unavailable={unavailable} onLongPress={open} />
            : <span className="hd-orb hd-orb--static" aria-hidden="true" aria-disabled={unavailable || undefined}><span className="hd-orb-i">{glyph}</span></span>}
          <CardTitle id={nameId} name={name} onOpen={open} openHint={openHint}>
            <p className="hd-area" title={statusTitle}>{timed(status)}</p>
            {compact && <p className="hd-sub">{alert ? <AlertStatus label={alert}>{value}</AlertStatus> : timed(value)}</p>}
          </CardTitle>
          {readout && (
            <p
              className={["hd-num", readout.duplicate && "hd-num--control-duplicate", readout.word && "hd-num--word", readout.className].filter(Boolean).join(" ")}
              {...(readout.label ? { role: "img", "aria-label": readout.label } : { "aria-hidden": true })}
            >{readout.value}</p>
          )}
          {sheet && <SheetClose label={closeLabel ?? `Close ${name}`} onClick={onClose} focusOnOpen={closeFocus} />}
        </header>

        {slot && (
          <div className="hd-slot" ref={slotRef}>{shown}</div>
        )}

        {children}

        {sheet && facts && <Facts {...facts} />}
      </article>
    </FrameContext.Provider>
  );
}

/** A block of the sheet's own (presets, a keypad, a second strip): drawn in the sheet only, and only with content. */
export function SheetBlock({ children }: { children?: ReactNode }) {
  const { sheet } = useContext(FrameContext);
  return sheet && Children.toArray(children).length > 0 ? <div className="hd-extra">{children}</div> : null;
}

/** The card's Today strip in its frame: while the entity is unavailable, its summary says since when. */
export function Today({ summary, ...strip }: Parameters<typeof TodayStrip>[0]) {
  const { unavailable, lastSeen } = useContext(FrameContext);
  return <TodayStrip {...strip} summary={unavailable ? unavailableSince(lastSeen) : summary} />;
}
