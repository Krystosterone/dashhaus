import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useKeypad, useGuardedAction, usePress } from "@dashhaus/core/primitives";
import type { GuardedResult } from "@dashhaus/core/primitives";
import { useSettled } from "@dashhaus/core/hooks";
import { CardDialog, detailsSheet, detailsTile, useCardFrame } from "@dashhaus/core/lovelace/card";
import type { ActionCardProps, CardSheetProps, TileProps } from "@dashhaus/core/lovelace/card";
import "./ui.css";

export type __Skin__Footprint = "compact" | "standard";

export interface __Skin__ActionProps {
  label: string;
  onPress: () => void;
  pressed?: boolean;
  unavailable?: boolean;
}

/** The generated baseline's latching or one-shot action, on the shared press primitive. */
export function __Skin__Action({ label, onPress, pressed, unavailable }: __Skin__ActionProps) {
  const press = usePress({ onPress, pressed, unavailable });
  return <button {...press} className="__skin__-action">{label}</button>;
}

/**
 * An action that never runs on one tap without asking, or that takes a code: a lock's unlock, an alarm's disarm. The
 * Card draws its button; its answer, the question or the keypad, is in the Card's details, on `useGuardedAction`.
 */
export interface __Skin__GuardedAction {
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
export function __Skin__Confirm({ question, action, busy, failed, onConfirm, onCancel }: { question: string; action: string; busy?: boolean; failed?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const settled = useSettled();
  const cancel = useRef<HTMLButtonElement>(null);
  // A dialog opening on the question focuses Cancel through data-autofocus; one already open is focused here.
  useEffect(() => { if (cancel.current?.closest("dialog")?.open) cancel.current.focus(); }, []);
  return (
    <div className="__skin__-ask" role="group" aria-label={question}>
      <p className="__skin__-ask-q">{question}</p>
      <p className="__skin__-ask-d" role="status">{busy ? "Waiting…" : failed ? "Didn’t go through. Try again." : "It asks first, so a stray tap never does it."}</p>
      <div className="__skin__-ask-b">
        <button type="button" className="__skin__-action" ref={cancel} data-autofocus="" onClick={onCancel}>Cancel</button>
        <button type="button" className="__skin__-action" disabled={busy} onClick={() => { if (settled()) onConfirm(); }}>{action}</button>
      </div>
    </div>
  );
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/** The code keypad, in the details, on `useKeypad`: typing the code is the confirmation. */
export function __Skin__Keypad({ prompt, text, onSubmit, onCancel }: { prompt: string; text?: boolean; onSubmit: (code: string) => boolean | Promise<boolean>; onCancel: () => void }) {
  const { code, error, busy, press, back, submit, rootProps } = useKeypad({ text, onSubmit });
  return (
    <div className="__skin__-ask" {...rootProps} role="group" aria-label={prompt}>
      <p className="__skin__-ask-q">{prompt}</p>
      <p className="__skin__-ask-d" role="status">{busy ? "Checking…" : error === "wrong" ? "Wrong code. Try again." : error === "failed" ? "Didn’t go through. Try again." : `${code.length} entered`}</p>
      <div className="__skin__-keys">
        {DIGITS.map((d) => <button key={d} type="button" className="__skin__-action" disabled={busy} onClick={() => press(d)}>{d}</button>)}
        <button type="button" className="__skin__-action" disabled={busy || !code} onClick={back}>Delete</button>
        <button type="button" className="__skin__-action" disabled={busy || !code} aria-label="Enter code" onClick={() => void submit()}>Enter</button>
      </div>
      <button type="button" className="__skin__-action" onClick={onCancel}>Cancel</button>
    </div>
  );
}

/** One Card's props: its entity's facts, and the frame's card props. */
export interface __Skin__CardProps extends Omit<ActionCardProps<string>, "footprint"> {
  /** Which card this is (its folder's name, e.g. `light`), on the article as `data-card` for styling and tests. */
  card?: string;
  name: string;
  area?: string;
  state: string;
  summary: ReactNode;
  icon?: ReactNode;
  footprint?: __Skin__Footprint;
  actions?: ReactNode;
  /** Actions that ask first or take a code, drawn after `actions` and answered in the details. */
  guarded?: __Skin__GuardedAction[];
  children?: ReactNode;
}

/** What a generated Card takes: the Card plus its details, opened from its name. */
export type __Skin__CardFrameProps = TileProps<__Skin__CardProps>;

/**
 * The Card as it sits on the dashboard, or as the dialog's body while it is in its sheet. The frame names the article
 * after the Card's title (`frame.article` points at `frame.nameId`), and the title says it opens a dialog.
 */
function __Skin__Card({ card, name, area, state, summary, icon, footprint, actions, guarded = [], children, variant, onOpenDetails, onClose, action }: __Skin__CardProps) {
  const frame = useCardFrame({ variant, footprint });
  const unavailable = state === "unavailable";
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
    <__Skin__Action key={g.key} label={g.asks ? `${g.label}…` : g.label} unavailable={unavailable} onPress={() => { if (g.asks) guard.ask(g.key); else void guard.attempt(g.key); }} />
  ));
  if (frame.sheet) {
    return (
      <>
        <div className="__skin__-dialog-head">
          <div><strong>{name}</strong>{area && <span>{area}</span>}</div>
          <button type="button" data-autofocus onClick={onClose} aria-label={`Close ${name} details`}>Close</button>
        </div>
        <div className="__skin__-dialog-body">
          <p className="__skin__-dialog-state">{unavailable ? "Unavailable" : state.replace(/[_-]+/g, " ")}</p>
          {asking ? (guard.code
            ? <__Skin__Keypad key={asking.key} prompt={`Enter the code to ${asking.label.toLowerCase()}`} text={asking.text} onSubmit={guard.submit} onCancel={guard.close} />
            : <__Skin__Confirm key={asking.key} question={`${asking.label} ${name}?`} action={asking.label} busy={guard.busy} failed={guard.failed} onConfirm={() => void guard.confirm()} onCancel={guard.close} />)
            : <>
                {buttons.length > 0 && !unavailable && <div className="__skin__-ask-b">{buttons}</div>}
                {children ?? <p>This neutral detail surface is ready for the Card's domain-specific design.</p>}
              </>}
        </div>
      </>
    );
  }
  return (
    <article {...frame.article} className="__skin__-card" data-card={card} data-footprint={frame.footprint} data-state={state}>
      <div className="__skin__-identity" aria-hidden="true">{icon ?? name.slice(0, 1).toUpperCase()}</div>
      <div className="__skin__-copy">
        <button type="button" id={frame.nameId} className="__skin__-title" aria-haspopup="dialog" onClick={() => onOpenDetails?.()}>{name}</button>
        <p className="__skin__-area">{area ?? "No area"}</p>
        <p className="__skin__-state">{unavailable ? "Unavailable" : state.replace(/[_-]+/g, " ")}</p>
      </div>
      <p className="__skin__-summary">{unavailable ? "—" : summary}</p>
      {(actions || buttons.length > 0) && <div className="__skin__-actions">{actions}{buttons}</div>}
    </article>
  );
}

/** The generated skin's details wrapper: the frame's native dialog and the Card's sheet view inside it. */
function __Skin__Sheet({ open, onClose, label, children }: CardSheetProps) {
  return (
    <CardDialog open={open} onClose={onClose} label={label} className="__skin__-dialog" handle=".__skin__-dialog-head" closeMs={240} snapBack="translate 220ms var(--__skin__-ease-out)">
      {children}
    </CardDialog>
  );
}

const __Skin__Details = detailsSheet(__Skin__Card, __Skin__Sheet, (props) => `${props.name} details`);

/**
 * Neutral Card frame for a generated skin: fixed footprints, explicit unavailable state, and a native details dialog
 * that opens on a guarded action's question or keypad.
 * Replace its visual language, not its entity or Home Assistant contracts, when giving the skin its own design.
 */
export const __Skin__CardFrame = detailsTile(__Skin__Card, __Skin__Details);
