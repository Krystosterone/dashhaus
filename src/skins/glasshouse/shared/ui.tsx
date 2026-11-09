import { useEffect, useId, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useKeypad, useGuardedAction, usePress, useSlider } from "@dashhaus/core/primitives";
import type { GuardedResult } from "@dashhaus/core/primitives";
import type { HourSample } from "@dashhaus/core/entities/history";
import { useHourCycle, useSettled } from "@dashhaus/core/hooks";
import { timeOfDay } from "@dashhaus/core/entities/clock";
import { CardDialog, detailsSheet, detailsTile, useCardFrame } from "@dashhaus/core/lovelace/card";
import type { ActionCardProps, CardSheetProps, TileProps } from "@dashhaus/core/lovelace/card";
import "./ui.css";

export type GlasshouseFootprint = "compact" | "standard";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export interface GlasshouseActionProps {
  label: string;
  onPress: () => void;
  pressed?: boolean;
  unavailable?: boolean;
  /** A small glyph before the words. */
  icon?: ReactNode;
}

/** A raised glass button: a one-shot action, or a latching one (`pressed`), on the shared press primitive. */
export function GlasshouseAction({ label, onPress, pressed, unavailable, icon }: GlasshouseActionProps) {
  const press = usePress({ onPress, pressed, unavailable });
  return <button {...press} className="glasshouse-action">{icon && <span className="glasshouse-action-icon" aria-hidden="true">{icon}</span>}{label}</button>;
}

export interface GlasshouseSwitchProps {
  /** What it switches, for its accessible name: "Floor lamp". */
  label: string;
  on: boolean;
  onPress: () => void;
  unavailable?: boolean;
}

/**
 * The pill switch: a recessed track with a knob that slides across and lights cyan when on. A latching button
 * (`aria-pressed`), so it reads "Floor lamp, toggle button, pressed". The knob moves on `transform` only.
 */
export function GlasshouseSwitch({ label, on, onPress, unavailable }: GlasshouseSwitchProps) {
  const press = usePress({ onPress, pressed: on, unavailable });
  return (
    <button {...press} className="glasshouse-switch" aria-label={label} data-on={on ? "" : undefined}>
      <span className="glasshouse-switch-knob" aria-hidden="true" />
    </button>
  );
}

/** Round step buttons (− and +) for a value: a thermostat's target. */
export function GlasshouseStep({ label, glyph, onPress, unavailable }: { label: string; glyph: "minus" | "plus"; onPress: () => void; unavailable?: boolean }) {
  const press = usePress({ onPress, unavailable });
  return (
    <button {...press} className="glasshouse-step" aria-label={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d={glyph === "plus" ? "M12 6v12M6 12h12" : "M6 12h12"} /></svg>
    </button>
  );
}

export interface GlasshouseSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unavailable?: boolean;
  /** The value in words, shown beside the label and read out: "55%". */
  valueText: (value: number) => string;
  onChange: (value: number) => void;
}

/**
 * A recessed glass groove with a cyan fill and a glowing thumb, on `useSlider`: tap or drag anywhere along it, or use
 * the keyboard on its hidden range input. Fill and thumb move on `transform` only.
 */
export function GlasshouseSlider({ label, value, min, max, step = 1, unavailable, valueText, onChange }: GlasshouseSliderProps) {
  const id = useId();
  const slider = useSlider<HTMLDivElement>({ value, min, max, step, inset: 14, disabled: unavailable, valueText, onChange });
  return (
    <div className="glasshouse-slider" data-unavailable={unavailable ? "" : undefined}>
      <label htmlFor={id} className="glasshouse-slider-label"><span>{label}</span><strong>{valueText(slider.value)}</strong></label>
      <div {...slider.rootProps} className="glasshouse-slider-track" style={{ "--glasshouse-fill": slider.fraction(slider.value) } as Vars}>
        <span className="glasshouse-slider-fill" aria-hidden="true" />
        <span className="glasshouse-slider-thumb" aria-hidden="true" />
        <div {...slider.hitProps} className="glasshouse-slider-hit" />
        <input {...slider.inputProps} id={id} className="glasshouse-sr" />
      </div>
    </div>
  );
}

const HOUR_LABELS = [0, 6, 12, 18];

/**
 * Today as 24 hourly bars, the reference's energy chart: each bar its hour's 0–1 value, a cyan-to-blue column,
 * hours ahead a faint stub and unavailable hours a dashed stub, so a gap never reads as zero.
 */
export function GlasshouseBars({ samples, current, label }: { samples: readonly HourSample[]; current: number; label: string }) {
  // The axis's hours are on the dashboard's clock: "06:00", or "6:00 AM".
  const hourCycle = useHourCycle();
  return (
    <figure className="glasshouse-bars" role="img" aria-label={label}>
      <div className="glasshouse-bars-plot">
        {samples.map((sample, hour) => {
          const kind = sample === null ? "ahead" : sample === "unavailable" ? "gap" : "value";
          const value = typeof sample === "number" ? Math.max(0.06, Math.min(1, sample)) : 0.06;
          return <span key={hour} className="glasshouse-bar" data-kind={kind} data-now={hour === current ? "" : undefined} style={{ "--glasshouse-bar": value } as Vars} />;
        })}
      </div>
      <figcaption className="glasshouse-bars-axis" aria-hidden="true">{HOUR_LABELS.map((hour) => <span key={hour}>{timeOfDay(hour, 0, hourCycle)}</span>)}</figcaption>
    </figure>
  );
}

/** A label above a figure, for a card's small facts row: "Humidity 47%". */
export function GlasshouseStat({ label, value, tone }: { label: string; value: ReactNode; tone?: "good" | "warm" | "warn" }) {
  return (
    <div className="glasshouse-stat">
      <span className="glasshouse-stat-label">{label}</span>
      <span className="glasshouse-stat-value" data-tone={tone}>{value}</span>
    </div>
  );
}

/** A small rounded tag beside a value: "47% RH", "Heating". */
export function GlasshouseChip({ children, tone }: { children: ReactNode; tone?: "good" | "warm" | "warn" | "accent" }) {
  return <span className="glasshouse-chip" data-tone={tone}>{children}</span>;
}

/** The details' list of facts: a term and its value per line. */
export function GlasshouseFacts({ facts }: { facts: readonly (readonly [string, ReactNode] | false | "" | 0 | undefined | null)[] }) {
  const shown = facts.filter((fact): fact is readonly [string, ReactNode] => Array.isArray(fact));
  return <dl className="glasshouse-facts">{shown.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>;
}

/**
 * An action that never runs on one tap without asking, or that takes a code: a lock's unlock, an alarm's disarm. The
 * Card draws its button; its answer, the question or the keypad, is in the Card's details, on `useGuardedAction`.
 */
export interface GlasshouseGuardedAction {
  /** The action's key: what the details open on. */
  key: string;
  /** Its button's words: "Unlock". */
  label: string;
  /**
   * It asks first: a press opens the details on the question, or on the keypad when the entity wants a code. Without
   * it, a press runs it at once, and asks for the code only when the entity wants one.
   */
  asks?: boolean;
  /** The entity wants a code for it: the keypad, not the question. */
  code?: boolean;
  /** A code with letters as well as digits. */
  text?: boolean;
  run: (code?: string) => GuardedResult;
}

/** The question, in the details, for a guarded action that takes no code. Cancel is focused, and the action takes no press for a moment. */
export function GlasshouseConfirm({ question, action, busy, failed, onConfirm, onCancel }: { question: string; action: string; busy?: boolean; failed?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const settled = useSettled();
  const cancel = useRef<HTMLButtonElement>(null);
  // A dialog opening on the question focuses Cancel through data-autofocus; one already open is focused here.
  useEffect(() => { if (cancel.current?.closest("dialog")?.open) cancel.current.focus(); }, []);
  return (
    <div className="glasshouse-ask" role="group" aria-label={question}>
      <p className="glasshouse-ask-q">{question}</p>
      <p className="glasshouse-ask-d" role="status">{busy ? "Waiting…" : failed ? "Didn’t go through. Try again." : "It asks first, so a stray tap never does it."}</p>
      <div className="glasshouse-ask-b">
        <button type="button" className="glasshouse-action" ref={cancel} data-autofocus="" onClick={onCancel}>Cancel</button>
        <button type="button" className="glasshouse-action" data-primary="" disabled={busy} onClick={() => { if (settled()) onConfirm(); }}>{action}</button>
      </div>
    </div>
  );
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/** The code keypad, in the details, on `useKeypad`: typing the code is the confirmation. */
export function GlasshouseKeypad({ prompt, text, onSubmit, onCancel }: { prompt: string; text?: boolean; onSubmit: (code: string) => boolean | Promise<boolean>; onCancel: () => void }) {
  const { code, error, busy, press, back, submit, rootProps } = useKeypad({ text, onSubmit });
  return (
    <div className="glasshouse-ask" {...rootProps} role="group" aria-label={prompt}>
      <p className="glasshouse-ask-q">{prompt}</p>
      <p className="glasshouse-ask-d" role="status">{busy ? "Checking…" : error === "wrong" ? "Wrong code. Try again." : error === "failed" ? "Didn’t go through. Try again." : `${code.length} entered`}</p>
      <div className="glasshouse-keys">
        {DIGITS.map((d) => <button key={d} type="button" className="glasshouse-action" disabled={busy} onClick={() => press(d)}>{d}</button>)}
        <button type="button" className="glasshouse-action" disabled={busy || !code} onClick={back}>Delete</button>
        <button type="button" className="glasshouse-action" data-primary="" disabled={busy || !code} aria-label="Enter code" onClick={() => void submit()}>Enter</button>
      </div>
      <button type="button" className="glasshouse-action" onClick={onCancel}>Cancel</button>
    </div>
  );
}

/** One Card's props: its entity's facts, and the frame's card props. */
export interface GlasshouseCardProps extends Omit<ActionCardProps<string>, "footprint"> {
  /** Which card this is (its folder's name, e.g. `light`), on the article as `data-card` for styling and tests. */
  card?: string;
  name: string;
  /** Its Home Assistant entity id, at the foot of its details: which entity this is. */
  entityId?: string;
  area?: string;
  state: string;
  /** The state in words for the sub line, when the raw state reads badly ("Heating", "Partly cloudy"). */
  stateLabel?: string;
  /** The one value a compact row shows, and a standard card shows big when it has no `face`. */
  summary: ReactNode;
  icon?: ReactNode;
  footprint?: GlasshouseFootprint;
  /** Its entity is on (a lit lamp, a heating thermostat): the card's edge and glyph glow cyan. */
  lit?: boolean;
  /** Something needs a look (a jammed or open lock): a warm edge and a warn marker, never only colour. */
  alert?: boolean;
  /** The control at the head's end, in every footprint: a switch. */
  control?: ReactNode;
  /** The standard card's body under its head: a chart, a gauge, a big figure. */
  face?: ReactNode;
  /** One-shot buttons along the standard card's foot. */
  actions?: ReactNode;
  /** Actions that ask first or take a code, drawn after `actions` and answered in the details. */
  guarded?: GlasshouseGuardedAction[];
  children?: ReactNode;
}

/** What a generated Card takes: the Card plus its details, opened from its name. */
export type GlasshouseCardFrameProps = TileProps<GlasshouseCardProps>;

/** A Home Assistant state in words: "heat_cool" → "Heat cool". */
export const glasshouseWords = (state: string) => {
  const text = state.replace(/[_-]+/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * The Card as it sits on the dashboard, or as the dialog's body while it is in its sheet. The frame names the article
 * after the Card's title (`frame.article` points at `frame.nameId`), and the title says it opens a dialog.
 */
function GlasshouseCard({ card, name, entityId, area, state, stateLabel, summary, icon, footprint, lit, alert, control, face, actions, guarded = [], children, variant, onOpenDetails, onClose, action }: GlasshouseCardProps) {
  const frame = useCardFrame({ variant, footprint });
  const unavailable = state === "unavailable";
  const said = unavailable ? "Unavailable" : stateLabel ?? glasshouseWords(state);
  // A guarded action is asked in the details: the Card opens them on it, the details hold its question or keypad.
  const find = (key: string) => guarded.find((g) => g.key === key);
  const guard = useGuardedAction<string>({
    run: (key, code) => find(key)?.run(code),
    needsCode: (key) => !!find(key)?.code,
    settled: () => unavailable,
    initial: action,
    askElsewhere: frame.sheet ? undefined : (key) => onOpenDetails?.(key),
  });
  const asking = guard.pending == null ? undefined : find(guard.pending);
  const buttons = guarded.map((g) => (
    <GlasshouseAction key={g.key} label={g.asks ? `${g.label}…` : g.label} unavailable={unavailable} onPress={() => { if (g.asks) guard.ask(g.key); else void guard.attempt(g.key); }} />
  ));
  const identity = <div className="glasshouse-identity" aria-hidden="true">{icon ?? name.slice(0, 1).toUpperCase()}</div>;
  if (frame.sheet) {
    return (
      <div className="glasshouse-sheet" data-card={card} data-state={state} data-lit={lit && !unavailable ? "" : undefined} data-alert={alert ? "" : undefined}>
        <div className="glasshouse-dialog-head">
          {identity}
          <div className="glasshouse-dialog-name"><strong>{name}</strong><span>{area ? `${area} · ${said}` : said}</span></div>
          <button type="button" data-autofocus onClick={onClose} aria-label={`Close ${name} details`}>Close</button>
        </div>
        <div className="glasshouse-dialog-body">
          {asking ? (guard.code
            ? <GlasshouseKeypad key={asking.key} prompt={`Enter the code to ${asking.label.toLowerCase()}`} text={asking.text} onSubmit={guard.submit} onCancel={guard.close} />
            : <GlasshouseConfirm key={asking.key} question={`${asking.label} ${name}?`} action={asking.label} busy={guard.busy} failed={guard.failed} onConfirm={() => void guard.confirm()} onCancel={guard.close} />)
            : <>
                {buttons.length > 0 && !unavailable && <div className="glasshouse-ask-b">{buttons}</div>}
                {children}
                {entityId && <p className="glasshouse-entity-id">{entityId}</p>}
              </>}
        </div>
      </div>
    );
  }
  const compact = frame.footprint === "compact";
  return (
    <article {...frame.article} className="glasshouse-card" data-card={card} data-footprint={frame.footprint} data-state={state} data-lit={lit && !unavailable ? "" : undefined} data-alert={alert ? "" : undefined}>
      <div className="glasshouse-head">
        {identity}
        <div className="glasshouse-copy">
          <button type="button" id={frame.nameId} className="glasshouse-title" aria-haspopup="dialog" onClick={() => onOpenDetails?.()}>{name}</button>
          <p className="glasshouse-sub">
            {alert && <span className="glasshouse-marker" aria-hidden="true">!</span>}
            <span>{area && `${area} · `}<span>{said}</span></span>
          </p>
        </div>
        {compact && <p className="glasshouse-summary">{unavailable ? "—" : summary}</p>}
        {control && <div className="glasshouse-control">{control}</div>}
      </div>
      {!compact && <div className="glasshouse-face">{unavailable ? <p className="glasshouse-big glasshouse-none">—</p> : face ?? <p className="glasshouse-big">{summary}</p>}</div>}
      {!compact && (actions || buttons.length > 0) && <div className="glasshouse-actions">{actions}{buttons}</div>}
    </article>
  );
}

/** The details: a smoked-glass native dialog, a bottom sheet on a phone. */
function GlasshouseSheet({ open, onClose, label, children }: CardSheetProps) {
  return (
    <CardDialog open={open} onClose={onClose} label={label} className="glasshouse-dialog" handle=".glasshouse-dialog-head" closeMs={240} snapBack="translate 220ms var(--glasshouse-ease-out)">
      {children}
    </CardDialog>
  );
}

const GlasshouseDetails = detailsSheet(GlasshouseCard, GlasshouseSheet, (props) => `${props.name} details`);

/**
 * The Glasshouse card frame: a smoked-glass panel with a fixed height per footprint, a head (glyph, name that opens
 * the details, area and state, an optional switch), the card's own face and foot, and a native details dialog that
 * opens on a guarded action's question or keypad.
 */
export const GlasshouseCardFrame = detailsTile(GlasshouseCard, GlasshouseDetails);
