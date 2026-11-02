import { useEffect, useRef } from "react";
import { useKeypad } from "@dashhaus/core/primitives";
import { useSettled } from "@dashhaus/core/hooks";

/**
 * The unlock (or open) confirmation, in the sheet, for a lock that takes no code. Its question, what it means, and
 * two buttons: Cancel, where focus lands so Enter never unlocks, and the action itself in the inverse, the one
 * urgent action on the sheet. The action takes no press for a moment after it appears, so the second tap of a
 * double tap that opened the sheet can't land on it.
 */
export function Confirm({ id, question, detail, action, busy, error, onConfirm, onCancel }: {
  id: string;
  question: string;
  detail: string;
  action: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const settled = useSettled();
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancel.current?.focus(); }, []);
  return (
    <div className="lk-cf" role="group" aria-labelledby={`${id}-q`} aria-describedby={`${id}-d`}>
      <p className="lk-cf-q" id={`${id}-q`}>{question}</p>
      <p className="lk-cf-d" id={`${id}-d`} role="status">{busy ? "Waiting for the lock…" : error ? <span className="hd-warn">{error}</span> : detail}</p>
      <div className="lk-cf-b">
        <button type="button" className="lk-cf-x" ref={cancel} onClick={onCancel}>Cancel</button>
        <button type="button" className="lk-cf-ok" disabled={busy} onClick={() => { if (settled()) onConfirm(); }}>{action}</button>
      </div>
    </div>
  );
}

/**
 * The code keypad, in the sheet, for a lock that asks for a code: typing it is the confirmation. Digits, delete and
 * enter; a physical keyboard types too (letters as well, for a text code). A wrong code shakes the dots and clears;
 * one that didn't go through stays, so Enter tries again.
 */
export function Keypad({ id, prompt, text, onSubmit, onCancel }: { id: string; prompt: string; text?: boolean; onSubmit: (code: string) => boolean | Promise<boolean>; onCancel: () => void }) {
  const { code, error, busy, press, back, submit, rootProps } = useKeypad({ text, onSubmit });
  const dots = Math.max(4, code.length);
  return (
    <div className="lk-kp" {...rootProps} aria-label={prompt}>
      <p className="lk-kp-p" id={`${id}-p`}>{busy ? "Checking…"
        : error === "wrong" ? <span className="hd-warn">Wrong code. Try again.</span>
        : error === "failed" ? <span className="hd-warn">Didn’t go through. Try again.</span>
        : prompt}</p>
      <div className="lk-kp-dots" data-error={error === "wrong" || undefined} data-busy={busy || undefined} aria-label={`${code.length} ${text ? "characters" : "digits"} entered`} role="status">
        {Array.from({ length: dots }, (_, i) => <i key={i} data-on={i < code.length || undefined} />)}
      </div>
      <div className="lk-kp-keys" role="group" aria-labelledby={`${id}-p`}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => <button key={d} type="button" className="lk-key" onClick={() => press(d)} disabled={busy}>{d}</button>)}
        <button type="button" className="lk-key lk-key--fn" aria-label="Delete" onClick={back} disabled={!code || busy}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 5h8.5v10H7.5L3.5 10ZM9.5 8l4 4M13.5 8l-4 4" /></svg>
        </button>
        <button type="button" className="lk-key" onClick={() => press("0")} disabled={busy}>0</button>
        <button type="button" className="lk-key lk-key--ok" aria-label="Enter code" onClick={submit} disabled={!code || busy}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5 8.5 14 15 6.5" /></svg>
        </button>
      </div>
      <button type="button" className="lk-kp-x" onClick={onCancel}>Cancel</button>
    </div>
  );
}
