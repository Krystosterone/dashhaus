import { useEffect, useId, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useKeypad, useGuardedAction, usePress, useSlider } from "@dashhaus/core/primitives";
import type { GuardedResult } from "@dashhaus/core/primitives";
import { useSettled } from "@dashhaus/core/hooks";
import type { HourSample } from "@dashhaus/core/entities/history";
import { CardDialog, detailsSheet, detailsTile, useCardFrame } from "@dashhaus/dashboard/card";
import type { ActionCardProps, CardSheetProps, TileProps } from "@dashhaus/dashboard/card";
import "./ui.css";

export type TitanFootprint = "compact" | "standard";

/**
 * A card's colour role, the one colour its elbow is painted in. `on` (salmon) is something running: a light, a
 * switch, heating, an unlocked door. `read` (teal) is a reading or cooling. `idle` (slate) is off or at rest.
 * `alert` (red) is reserved for a state that needs a person (a jammed lock, poor air), and always comes with words.
 */
export type TitanTone = "on" | "read" | "idle" | "alert";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** A stable, decorative console number for an entity ("21-534"), so every card carries a registry plate like the reference's keys. */
export function titanPlate(entityId: string): string {
  let h = 2166136261;
  for (let i = 0; i < entityId.length; i++) h = Math.imul(h ^ entityId.charCodeAt(i), 16777619);
  const n = (h >>> 0) % 100000;
  return `${String(Math.floor(n / 1000)).padStart(2, "0")}-${String(n % 1000).padStart(3, "0")}`;
}

/* ------------------------------------------------------------------ Keys */

export interface TitanActionProps {
  label: string;
  onPress: () => void;
  pressed?: boolean;
  unavailable?: boolean;
  /** The key's colour when it isn't pressed: `key` (lilac), `cool` (teal) or `frame` (slate). */
  tone?: "key" | "cool" | "frame";
  /** Grows to fill its row. */
  wide?: boolean;
  /** Words for a screen reader when the label is a code. */
  ariaLabel?: string;
}

/**
 * A console key, on the shared press primitive: a flat rectangle with its words at the bottom right and the small
 * square marker top left that says it can be pressed. A latching key turns salmon while it is on.
 */
export function TitanAction({ label, onPress, pressed, unavailable, tone = "key", wide, ariaLabel }: TitanActionProps) {
  const press = usePress({ onPress, pressed, unavailable });
  return <button {...press} className="titan-action" data-tone={tone} data-wide={wide ? "" : undefined} aria-label={ariaLabel}>{label}</button>;
}

/** A row of keys that pick one value (a thermostat's mode): the current one lit, each a single press. */
export function TitanKeyGroup<T extends string>({ label, options, value, unavailable, onChange }: { label: string; options: { value: T; label: string }[]; value?: T; unavailable?: boolean; onChange: (value: T) => void }) {
  return (
    <div className="titan-keygroup" role="group" aria-label={label}>
      <span className="titan-keygroup-label" aria-hidden="true">{label}</span>
      <div className="titan-keygroup-keys">
        {options.map((o) => <TitanAction key={o.value} label={o.label} pressed={o.value === value} unavailable={unavailable} onPress={() => { if (o.value !== value) onChange(o.value); }} />)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ The dot strip */

export interface TitanToday {
  samples: HourSample[];
  currentHour: number;
  /** Today in words, for a screen reader and the details: "On 2 h 10 min today". */
  summary: string;
}

const level = (s: HourSample) => s == null ? "ahead" : s === "unavailable" ? "gone" : s >= 0.66 ? "high" : s >= 0.33 ? "mid" : s > 0 ? "low" : "none";

/**
 * Today as the reference's dot strip: one dot an hour on a recessed coal segment, white where it ran hard, grey part
 * way, dark where nothing happened, a ring where it was unavailable and nothing for hours still ahead. The current
 * hour sits in the card's colour.
 */
export function TitanDots({ today, scale }: { today: TitanToday; scale?: boolean }) {
  const hours = Array.from({ length: 24 }, (_, i) => today.samples[i] ?? null);
  return (
    <div className="titan-dots" role="img" aria-label={`Today: ${today.summary}`} data-scale={scale ? "" : undefined}>
      <span className="titan-dots-row">
        {hours.map((s, i) => <span key={i} className="titan-dot" data-level={level(s)} data-now={i === today.currentHour ? "" : undefined} />)}
      </span>
      {scale && <span className="titan-dots-hours" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></span>}
    </div>
  );
}

/* ------------------------------------------------------------------ Gauges */

export interface TitanGaugeProps {
  /** Two to five capitals on the gauge's label block: "BRT", "HUM". */
  label: string;
  /** Where the value sits, 0–1. */
  fraction: number;
  /** The value in words, printed after the track: "62%". */
  text: string;
  /** Its accessible name: "Humidity 62 percent". */
  name: string;
  tone?: TitanTone;
  /** No reading: the well stays empty and the text is a dash. */
  empty?: boolean;
}

/** A reading on the reference's ruled bar: a label block, a recessed well with a scale above, and a fill. */
export function TitanGauge({ label, fraction, text, name, tone = "read", empty }: TitanGaugeProps) {
  const f = empty ? 0 : Math.min(Math.max(fraction, 0), 1);
  return (
    <div className="titan-gauge" data-tone={tone} role="meter" aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(f * 100)} aria-valuetext={empty ? "No reading" : text}>
      <span className="titan-gauge-label" aria-hidden="true">{label}</span>
      <span className="titan-gauge-track" aria-hidden="true">
        <span className="titan-gauge-scale" />
        <span className="titan-gauge-rail"><span className="titan-gauge-fill" style={{ transform: `scaleX(${f})` }} /></span>
      </span>
      <span className="titan-gauge-text" aria-hidden="true">{empty ? "—" : text}</span>
    </div>
  );
}

const THUMB = 11;

export interface TitanFaderProps {
  label: string;
  /** The hidden range input's accessible name: "Brightness". */
  name: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** The value as printed after the track. */
  format: (value: number) => string;
  valueText: (value: number) => string;
  onChange: (value: number) => void;
  tone?: TitanTone;
  /** The fill reads as at rest (a light that is off keeps its last level, dimmed). */
  resting?: boolean;
  disabled?: boolean;
  /** A tap where the thumb already sits still reports (a light that is off turns on at its level). */
  reportUnchanged?: boolean;
}

/**
 * The gauge you can set: the same ruled bar with the reference's grey oval thumb, on `useSlider` (tap anywhere,
 * drag, or the keyboard through a hidden range input).
 */
export function TitanFader({ label, name, value, min, max, step = 1, format, valueText, onChange, tone = "on", resting, disabled, reportUnchanged }: TitanFaderProps) {
  const id = useId();
  const slider = useSlider<HTMLSpanElement>({ value, min, max, step, inset: THUMB, disabled, reportUnchanged, valueText, onChange });
  const f = slider.fraction(slider.value);
  return (
    <div className="titan-gauge titan-fader" data-tone={tone} data-resting={resting ? "" : undefined} data-disabled={disabled ? "" : undefined}>
      <label className="titan-gauge-label" htmlFor={id}>{label}<span className="titan-hidden"> {name}</span></label>
      <span className="titan-gauge-track" {...slider.rootProps} style={{ "--titan-f": f } as Vars}>
        <span className="titan-gauge-scale" />
        <span className="titan-gauge-rail"><span className="titan-gauge-fill" style={{ transform: `scaleX(${f})` }} /></span>
        <span className="titan-fader-thumbs"><span className="titan-fader-carriage" style={{ transform: `translateX(${f * 100}%)` }}><span className="titan-fader-thumb" /></span></span>
        <span className="titan-fader-hit" {...slider.hitProps} />
        <input id={id} className="titan-hidden" {...slider.inputProps} />
      </span>
      <span className="titan-gauge-text" aria-hidden="true">{format(slider.value)}</span>
    </div>
  );
}

/** A reading's block on the card's bottom row: not a key, no marker; deep blue with its figure at the bottom right. */
export function TitanDatum({ label, value, tone = "read" }: { label: string; value: ReactNode; tone?: "read" | "idle" | "alert" }) {
  return <p className="titan-datum" data-tone={tone}><span className="titan-datum-label">{label}</span><span className="titan-datum-value">{value}</span></p>;
}

/* ------------------------------------------------------------------ Facts */

export type TitanFact = readonly [label: string, value: ReactNode];
/** A fact, or a falsy placeholder for one a card leaves out. */
export type TitanMaybeFact = TitanFact | false | "" | 0 | null | undefined;

/** The details' facts as the reference's key pairs: a lilac label block and its value, one row each. */
export function TitanFacts({ facts }: { facts: readonly TitanMaybeFact[] }) {
  const rows = facts.filter((f): f is TitanFact => !!f && f[1] != null && f[1] !== "");
  if (!rows.length) return null;
  return (
    <dl className="titan-facts">
      {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  );
}

/* ------------------------------------------------------------------ Guarded actions */

/**
 * An action that never runs on one tap without asking, or that takes a code: a lock's unlock, an alarm's disarm. The
 * Card draws its key; its answer, the question or the keypad, is in the Card's details, on `useGuardedAction`.
 */
export interface TitanGuardedAction {
  key: string;
  label: string;
  asks?: boolean;
  code?: boolean;
  text?: boolean;
  /** Lit while this is the entity's state (Lock while locked). */
  pressed?: boolean;
  /** Its key's colour; a `frame` key lights pale, not salmon, so a resting state never reads as active. */
  tone?: TitanActionProps["tone"];
  run: (code?: string) => GuardedResult;
}

/** The question, in the details, for a guarded action that takes no code. Cancel is focused, and the action takes no press for a moment. */
export function TitanConfirm({ question, action, busy, failed, onConfirm, onCancel }: { question: string; action: string; busy?: boolean; failed?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const settled = useSettled();
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (cancel.current?.closest("dialog")?.open) cancel.current.focus(); }, []);
  return (
    <div className="titan-ask" role="group" aria-label={question}>
      <p className="titan-ask-q">{question}</p>
      <p className="titan-ask-d" role="status">{busy ? "Waiting…" : failed ? "Didn’t go through. Try again." : "It asks first, so a stray tap never does it."}</p>
      <div className="titan-ask-b">
        <button type="button" className="titan-action" data-tone="key" ref={cancel} data-autofocus="" onClick={onCancel}>Cancel</button>
        <button type="button" className="titan-action" data-tone="confirm" disabled={busy} onClick={() => { if (settled()) onConfirm(); }}>{action}</button>
      </div>
    </div>
  );
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/** The code keypad, in the details, on `useKeypad`: typing the code is the confirmation. */
export function TitanKeypad({ prompt, text, onSubmit, onCancel }: { prompt: string; text?: boolean; onSubmit: (code: string) => boolean | Promise<boolean>; onCancel: () => void }) {
  const { code, error, busy, press, back, submit, rootProps } = useKeypad({ text, onSubmit });
  return (
    <div className="titan-ask" {...rootProps} role="group" aria-label={prompt}>
      <p className="titan-ask-q">{prompt}</p>
      <p className="titan-ask-d" role="status">{busy ? "Checking…" : error === "wrong" ? "Wrong code. Try again." : error === "failed" ? "Didn’t go through. Try again." : `${"●".repeat(code.length) || "—"}`}</p>
      <div className="titan-keys">
        {DIGITS.map((d) => <button key={d} type="button" className="titan-action" data-tone="key" disabled={busy} onClick={() => press(d)}>{d}</button>)}
        <button type="button" className="titan-action" data-tone="frame" disabled={busy || !code} onClick={back}>Delete</button>
        <button type="button" className="titan-action" data-tone="confirm" disabled={busy || !code} aria-label="Enter code" onClick={() => void submit()}>Enter</button>
      </div>
      <div className="titan-ask-b"><button type="button" className="titan-action" data-tone="frame" onClick={onCancel}>Cancel</button></div>
    </div>
  );
}

/* ------------------------------------------------------------------ The frame */

/** One Card's props: its entity's facts, and the frame's card props. */
export interface TitanCardProps extends Omit<ActionCardProps<string>, "footprint"> {
  /** Which card this is (its folder's name, e.g. `light`), on the article as `data-card` for styling and tests. */
  card?: string;
  /** The card's two-letter code on its elbow: "LT". Default: the card's first two letters. */
  code?: string;
  /** Its entity id, for the plate and the details; default: the name. */
  entityId?: string;
  /** Kept so a card `npm run add` writes compiles as it is; Titan draws no glyphs, the plate stands in for them. */
  icon?: ReactNode;
  name: string;
  area?: string;
  /** The entity's state, on the article as `data-state`. */
  state: string;
  /** The status line in words: "On since 10:31", "Heating to 21°". Default: the state in words. */
  status?: string;
  /** The big readout: "90", "21.8". */
  summary: ReactNode;
  /** Its unit, set small after it: "%", "°C". */
  unit?: string;
  /** Its colour role; default: `on` for an active state (on, open, unlocked, heating…), else `idle`. */
  tone?: TitanTone;
  /** A warning in words, drawn with the alert marker beside the status: "Jammed", "Poor air". */
  warning?: string;
  today?: TitanToday;
  /** The card's gauge or fader, under the readout. */
  gauge?: ReactNode;
  footprint?: TitanFootprint;
  actions?: ReactNode;
  /** Actions that ask first or take a code, drawn after `actions` and answered in the details. */
  guarded?: TitanGuardedAction[];
  /** The details' facts. */
  facts?: readonly TitanMaybeFact[];
  /** More for the details only, after the facts. */
  children?: ReactNode;
}

/** What a Card takes: the Card plus its details, opened from its name. */
export type TitanCardFrameProps = TileProps<TitanCardProps>;

const ACTIVE = new Set(["on", "open", "opening", "unlocked", "unlocking", "heat", "cool", "heat_cool", "auto", "playing", "home"]);

function TitanCard({ card, code = (card ?? "--").slice(0, 2).toUpperCase(), entityId: id, name, area, state, status = state.replace(/[_-]+/g, " "), summary, unit, tone = ACTIVE.has(state) ? "on" : "idle", warning, today, gauge, footprint, actions, guarded = [], facts, children, variant, onOpenDetails, onClose, action }: TitanCardProps) {
  const frame = useCardFrame({ variant, footprint });
  const entityId = id ?? name;
  const unavailable = state === "unavailable";
  const find = (key: string) => guarded.find((g) => g.key === key);
  const guard = useGuardedAction<string>({
    run: (key, run) => find(key)?.run(run),
    needsCode: (key) => !!find(key)?.code,
    settled: () => unavailable,
    initial: action,
    askElsewhere: frame.sheet ? undefined : (key) => onOpenDetails?.(key),
  });
  const asking = guard.pending == null ? undefined : find(guard.pending);
  const buttons = guarded.map((g) => (
    <TitanAction key={g.key} label={g.asks ? `${g.label}…` : g.label} pressed={g.pressed} tone={g.tone} unavailable={unavailable} onPress={() => { if (g.asks) guard.ask(g.key); else void guard.attempt(g.key); }} />
  ));
  const shownTone: TitanTone | "gone" = unavailable ? "gone" : tone;
  const plate = `${code} ${titanPlate(entityId)}`;
  const readout = (
    <p className="titan-readout">
      {unavailable ? <span className="titan-readout-value">—</span> : <><span className="titan-readout-value">{summary}</span>{unit && <span className="titan-readout-unit">{unit}</span>}</>}
    </p>
  );
  const statusLine = (
    <p className="titan-status">
      {warning && !unavailable && <span className="titan-warn"><span className="titan-warn-mark" aria-hidden="true" />{warning}</span>}
      <span className="titan-status-words">{unavailable ? "Unavailable" : status}</span>
    </p>
  );

  if (frame.sheet) {
    return (
      <div className="titan-sheet" data-card={card} data-tone={shownTone} data-state={state}>
        <div className="titan-sheet-head">
          <span className="titan-sheet-elbow" aria-hidden="true"><span>{plate}</span></span>
          <span className="titan-sheet-bar" aria-hidden="true" />
          <div className="titan-sheet-top">
            <button type="button" className="titan-action titan-sheet-close" data-tone="frame" data-autofocus onClick={onClose} aria-label={`Close ${name} details`}>Close</button>
            <div className="titan-sheet-name"><h2>{name}</h2><span>{area ?? "No area"}</span></div>
          </div>
        </div>
        <div className="titan-sheet-body">
          <div className="titan-sheet-read">{readout}{statusLine}</div>
          {asking ? (guard.code
            ? <TitanKeypad key={asking.key} prompt={`Enter the code to ${asking.label.toLowerCase()}`} text={asking.text} onSubmit={guard.submit} onCancel={guard.close} />
            : <TitanConfirm key={asking.key} question={`${asking.label} ${name}?`} action={asking.label} busy={guard.busy} failed={guard.failed} onConfirm={() => void guard.confirm()} onCancel={guard.close} />)
            : <>
                {gauge && <div className="titan-sheet-gauge">{gauge}</div>}
                {(actions || buttons.length > 0) && !unavailable && <div className="titan-sheet-keys">{actions}{buttons}</div>}
                {children}
                {today && <section className="titan-sheet-today" aria-label="Today"><h3>Today</h3><TitanDots today={today} scale /><p>{today.summary}</p></section>}
                <TitanFacts facts={[id && ["Entity", id], ...(facts ?? [])]} />
              </>}
        </div>
      </div>
    );
  }

  if (frame.compact) {
    return (
      <article {...frame.article} className="titan-card" data-card={card} data-footprint="compact" data-state={state} data-tone={shownTone}>
        <span className="titan-compact-value">{unavailable ? "—" : <>{summary}{unit && <small>{unit}</small>}</>}</span>
        <button type="button" id={frame.nameId} className="titan-title titan-compact-name" aria-haspopup="dialog" onClick={() => onOpenDetails?.()}>
          <span className="titan-compact-words">{name}</span>
          <span className="titan-compact-state">{unavailable ? "Unavailable" : warning ?? status}</span>
        </button>
      </article>
    );
  }

  return (
    <article {...frame.article} className="titan-card" data-card={card} data-footprint="standard" data-state={state} data-tone={shownTone}>
      <span className="titan-elbow-side" aria-hidden="true"><span className="titan-plate">{plate}</span></span>
      <span className="titan-elbow-bar" aria-hidden="true" />
      <span className="titan-elbow-corner" aria-hidden="true" />
      <span className="titan-card-strip">{today ? <TitanDots today={today} /> : <span className="titan-strip-blank" aria-hidden="true" />}</span>
      <div className="titan-head">
        <button type="button" id={frame.nameId} className="titan-title" aria-haspopup="dialog" onClick={() => onOpenDetails?.()}>{name}</button>
        <p className="titan-area">{area ?? "No area"}</p>
      </div>
      <div className="titan-read">{readout}{statusLine}</div>
      <div className="titan-card-gauge">{gauge}</div>
      <div className="titan-actions">{actions}{buttons}</div>
    </article>
  );
}

/** The details: the frame's native dialog, drawn as a console panel with its own elbow. */
function TitanSheet({ open, onClose, label, children }: CardSheetProps) {
  return (
    <CardDialog open={open} onClose={onClose} label={label} className="titan-dialog" handle=".titan-sheet-top" closeMs={240} snapBack="translate 220ms var(--titan-ease-out)">
      {children}
    </CardDialog>
  );
}

const TitanDetails = detailsSheet(TitanCard, TitanSheet, (props) => `${props.name} details`);

/**
 * The Titan card frame: an elbow in the card's colour role carrying its plate, the dot strip of today in the bar,
 * the name (it opens the details), the readout, a gauge and a row of keys, at a fixed height for every state.
 */
export const TitanCardFrame = detailsTile(TitanCard, TitanDetails);
