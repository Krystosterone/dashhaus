import { useEffect, useRef, useState } from "react";
import type { Vars } from "../../shared/ui";
import type { AlarmMode } from "./types";
import { ModeIcon, MODE_LABEL } from "./icons";

/**
 * The mode switch: Off and each arm mode, one segment each. The current one sits on a thumb that slides
 * between segments: charcoal when armed (on or chosen), a plain raised chip when off, on a hatched track
 * (absence: nothing is guarded). Labels from 260px up; icons only below 260px and in compact cards.
 */
export function ModeSwitch({ name, modes, current, onPick }: { name: string; modes: AlarmMode[]; current: AlarmMode | "off"; onPick: (m: AlarmMode | "off") => void }) {
  // Armed in a mode the list leaves out (custom bypass, set from the panel itself): show it rather than "Off".
  const all: (AlarmMode | "off")[] = ["off", ...modes, ...(current !== "off" && !modes.includes(current) ? [current] : [])];
  const i = Math.max(0, all.indexOf(current));
  return (
    <div className="al-sw" role="group" aria-label={`${name} mode`} data-armed={current !== "off" || undefined} data-many={all.length >= 5 || undefined} data-crowd={all.length >= 6 || undefined} style={{ "--n": all.length, "--i": i } as Vars}>
      <span className="al-thumb" aria-hidden="true" />
      {all.map((m) => (
        <button key={m} type="button" className="al-seg" aria-pressed={current === m} aria-label={m === "off" ? "Off: Disarm" : `Arm ${MODE_LABEL[m].toLowerCase()}`} title={MODE_LABEL[m]} onClick={() => { if (current !== m) onPick(m); }}>
          <ModeIcon mode={m} />
          <span className="al-seg-l">{MODE_LABEL[m]}</span>
        </button>
      ))}
    </div>
  );
}

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.ceil(s)) % 60).padStart(2, "0")}`;

/**
 * Exit delay (arming), entry delay (pending) or disarming: what's happening, the time left, and the one thing to do.
 * Without `left` (the delay's length isn't known) there's no timer and no fill: just the words and the action.
 */
export function Countdown({ kind, label, left, total, action, onAction }: { kind: "arming" | "pending" | "disarming"; label: string; left?: number; total?: number; action?: string; onAction?: () => void }) {
  const timed = left != null && total != null && total > 0;
  const done = timed ? 1 - Math.max(0, left) / total : 0;
  return (
    <div className="al-cd" data-kind={kind} data-timed={timed || undefined} role="timer" aria-live="off" style={{ "--f": done.toFixed(3) } as Vars}>
      {timed ? <span className="al-cd-fill" aria-hidden="true" /> : <span className="al-cd-wait" aria-hidden="true" />}
      <span className="al-cd-l">{label}</span>
      {timed && <span className="al-cd-t">{mmss(left)}</span>}
      {action && onAction && <button type="button" className="al-cd-b" onClick={onAction}>{action}</button>}
    </div>
  );
}

/** Triggered: the one place the warn colour fills. What set it off, and Disarm (not in view-only mode). */
export function AlarmPill({ cause, onDisarm }: { cause?: string; onDisarm?: () => void }) {
  return (
    <div className="al-alarm" role="alert">
      <span className="al-alarm-l"><b>Alarm</b>{cause ? <span className="al-alarm-c"> · {cause}</span> : null}</span>
      {onDisarm && <button type="button" className="al-cd-b al-alarm-b" onClick={onDisarm}>Disarm</button>}
    </div>
  );
}

const ARMED_AS: Record<AlarmMode, string> = { home: "Armed home", away: "Armed away", night: "Armed night", vacation: "Armed vacation", custom_bypass: "Armed, custom bypass" };

/**
 * View-only mode's slot, in place of the mode switch: what the alarm is doing, nothing to press.
 * Armed is charcoal (on, not energy), disarmed sits on hatching, as on the switch. Who changed it, from M up.
 */
export function AlarmStatus({ mode, by }: { mode: AlarmMode | "off"; by?: string }) {
  const armed = mode !== "off";
  return (
    <div className="al-st" data-armed={armed || undefined}>
      <ModeIcon mode={mode} />
      <span className="al-st-l">{armed ? ARMED_AS[mode] : "Disarmed"}</span>
      <span className="al-st-s">{armed ? MODE_LABEL[mode] : "Off"}</span>
      {by && <span className="al-st-x">by {by}</span>}
    </div>
  );
}

/**
 * The code keypad, in the sheet. Digits, delete and enter; a physical keyboard works too.
 * `onSubmit` may answer later (Home Assistant does): the keypad waits, then closes on true.
 * False is a wrong code: the dots shake and clear for another try. A throw means it didn't go through:
 * the code stays, so Enter tries again.
 */
export function Keypad({ prompt, text, onSubmit, onCancel }: { prompt: string; text?: boolean; onSubmit: (code: string) => boolean | Promise<boolean>; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<"wrong" | "failed" | null>(null);
  // Home Assistant answers asynchronously; while it does, the keypad waits and says so.
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  // Focus the keypad when it appears, so typing and Enter go to it (not to a button behind it).
  // In a sheet that is opening, the sheet focuses [data-autofocus] once it is shown.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (root.current?.closest("dialog")?.open) root.current.focus(); }, []);
  const submit = async () => {
    if (!code || busy) return;
    setBusy(true);
    let result: "ok" | "wrong" | "failed";
    try { result = (await onSubmit(code)) ? "ok" : "wrong"; } catch { result = "failed"; }
    if (!alive.current) return;
    setBusy(false);
    if (result === "ok") return;
    setError(result);
    if (result === "wrong") setCode("");
  };
  const press = (k: string) => { if (busy) return; setError(null); setCode((c) => (c.length >= 12 ? c : c + k)); };
  const back = () => { if (busy) return; setError(null); setCode((c) => c.slice(0, -1)); };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement) return;
      if (/^[0-9]$/.test(ev.key) || (text && /^[a-z]$/i.test(ev.key))) { ev.preventDefault(); press(ev.key); }
      else if (ev.key === "Backspace") { ev.preventDefault(); back(); }
      else if (ev.key === "Enter" && !(ev.target instanceof HTMLButtonElement)) { ev.preventDefault(); submit(); }
      else if (ev.key === "Enter" && ev.target instanceof HTMLButtonElement && !root.current?.contains(ev.target) && code) { ev.preventDefault(); submit(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const dots = Math.max(4, code.length);
  return (
    <div className="al-kp" ref={root} tabIndex={-1} data-autofocus aria-label={prompt}>
      <p className="al-kp-p" id="al-kp-p">{busy ? "Checking…"
        : error === "wrong" ? <span className="hd-warn">Wrong code. Try again.</span>
        : error === "failed" ? <span className="hd-warn">Didn’t go through. Try again.</span>
        : prompt}</p>
      <div className="al-kp-dots" data-error={error === "wrong" || undefined} data-busy={busy || undefined} aria-label={`${code.length} digits entered`} role="status">
        {Array.from({ length: dots }, (_, i) => <i key={i} data-on={i < code.length || undefined} />)}
      </div>
      <div className="al-kp-keys" role="group" aria-labelledby="al-kp-p">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => <button key={d} type="button" className="al-key" onClick={() => press(d)} disabled={busy}>{d}</button>)}
        <button type="button" className="al-key al-key--fn" aria-label="Delete" onClick={back} disabled={!code || busy}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 5h8.5v10H7.5L3.5 10ZM9.5 8l4 4M13.5 8l-4 4" /></svg>
        </button>
        <button type="button" className="al-key" onClick={() => press("0")} disabled={busy}>0</button>
        <button type="button" className="al-key al-key--ok" aria-label="Enter code" onClick={submit} disabled={!code || busy}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5 8.5 14 15 6.5" /></svg>
        </button>
      </div>
      <button type="button" className="al-kp-x" onClick={onCancel}>Cancel</button>
    </div>
  );
}
