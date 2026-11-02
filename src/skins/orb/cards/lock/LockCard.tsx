import { useEffect, useState } from "react";
import type { LockAction, LockEntity, LockOutcome, LockResult } from "@dashhaus/core/entities/lock/types";
import { isLowBattery } from "@dashhaus/core/entities/battery";
import { DoorIcon, LockIcon } from "./icons";
import { Confirm, Keypad } from "./parts";
import { AlertStatus, CardTitle, Orb, SheetClose, TogglePill, UnavailableSlot, paint, useCard, detailsSheet } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./LockCard.css";

export type { LockAction, LockOutcome, LockResult };

export interface LockCardProps extends CardProps {
  entity: LockEntity;
  /**
   * Lock it, with the code when the lock asks for one. A tap does this. Answer `wrong_code` when the lock wants a
   * code to lock too, and the sheet asks for it. With Home Assistant, `createLockHandlers` does all of this.
   */
  onLock?: (code?: string) => LockResult;
  /** Unlock it: only ever from the sheet's confirmation or its keypad, never from a tap on the card. */
  onUnlock?: (code?: string) => LockResult;
  /** Unlatch the door (`lock.open`), where the lock supports it; from the sheet, behind the same confirmation. */
  onOpenDoor?: (code?: string) => LockResult;
  /** View only: the lock's state and last change with nothing to press. Default: on when neither onLock nor onUnlock is given. */
  readOnly?: boolean;
  /** Card only: the name opens the sheet; with an action when that action needs confirming or a code. */
  onOpenDetails?: (action?: LockAction) => void;
  onClose?: () => void;
  /** Sheet only: start on this action's confirmation or keypad. */
  action?: LockAction;
}

const WORD: Record<LockEntity["state"], string> = {
  locked: "Locked",
  unlocked: "Unlocked",
  locking: "Locking…",
  unlocking: "Unlocking…",
  jammed: "Jammed",
  open: "Open",
  opening: "Opening…",
  unavailable: "Unavailable",
};

const VERB: Record<LockAction, string> = { lock: "Lock", unlock: "Unlock", open: "Open" };

/** A handler's answer, whatever it returned; a throw is a call that didn't go through. */
async function outcome(result: LockResult): Promise<LockOutcome> {
  try { return (await result) ?? "done"; } catch { return "failed"; }
}

/**
 * A door lock (one `lock.*`, with its device's battery). Locking is one tap on the orb or the pill. Unlocking never
 * is: a tap on a locked lock opens the sheet on its confirmation, or on the keypad when the lock asks for a code, and
 * a press and hold opens the sheet as on every card. Locked is the accent, as armed is; unlocked is the plain
 * surface. A jam or a low battery is a warn marker on the status line, never glow; a lock is a state, so it never
 * glows at all. It shows its last change, not a day's history.
 */
export function LockCard({ entity: e, variant, footprint, showControl, onLock, onUnlock, onOpenDoor, readOnly, onOpenDetails, onClose, action, color }: LockCardProps) {
  const { uid, nameId, sheet, compact, bare, article, area } = useCard("lk", { variant, footprint, showControl, area: e.area });
  const unav = e.state === "unavailable";
  const locked = e.state === "locked";
  const moving = e.state === "locking" || e.state === "unlocking" || e.state === "opening";
  const jammed = e.state === "jammed";
  const ro = readOnly ?? (!onLock && !onUnlock);
  const colors = paint("state", 0, null, color);
  const word = WORD[e.state];

  // The confirmation or keypad (sheet only), for the action waiting on it.
  const [pending, setPending] = useState<LockAction | null>(ro ? null : action ?? null);
  // A lock that turned out to want a code for an action the card thought needed none.
  const [askCode, setAskCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setPending(ro ? null : action ?? null); setAskCode(false); setFailed(false); }, [action, ro]);
  // Done elsewhere (another panel, the door itself): the question no longer stands.
  useEffect(() => {
    if (!pending) return;
    if ((pending === "unlock" && e.state === "unlocked") || (pending === "open" && e.state === "open") || (pending === "lock" && e.state === "locked") || unav) setPending(null);
  }, [e.state, pending, unav]);

  const handler = (a: LockAction) => (a === "lock" ? onLock : a === "unlock" ? onUnlock : onOpenDoor);
  const run = (a: LockAction, code?: string) => outcome(handler(a)?.(code));
  // A lock is only asked for in the sheet when it turned out to want a code (a tap locks everywhere else).
  const needsCode = !!e.codeFormat || askCode || pending === "lock";

  /** Ask for an action: in the sheet, show its confirmation; on the card, open the sheet on it. */
  const ask = (a: LockAction) => {
    if (ro) return;
    setFailed(false);
    if (sheet) setPending(a);
    else onOpenDetails?.(a);
  };
  /** The tap: lock an unlocked (or jammed, or open) lock at once; ask before unlocking a locked one. */
  const tap = () => {
    if (ro || unav || moving) return;
    if (locked) { ask("unlock"); return; }
    // No code needed: the state change is the answer. A lock that wants one to lock too asks in the sheet.
    void run("lock").then((result) => { if (result === "wrong_code") { setAskCode(true); ask("lock"); } });
  };
  const close = () => { setPending(null); setAskCode(false); setFailed(false); };
  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    const result = await run(pending);
    setBusy(false);
    if (result === "done") close();
    else if (result === "wrong_code") setAskCode(true);
    else setFailed(true);
  };

  const lowBattery = !unav && isLowBattery(e.battery);
  const warning = unav ? null : jammed ? "Jammed" : lowBattery ? `Battery ${e.battery}%` : null;
  const alertLabel = warning ? `Warning: ${e.name}: ${jammed ? "jammed, it may not be locked" : `battery ${e.battery}%, replace soon`}` : null;
  const since = e.lastChanged ? `Since ${e.lastChanged}` : undefined;
  const status = alertLabel ? <AlertStatus label={alertLabel}>{warning}</AlertStatus> : area ?? (unav ? "Unavailable" : since);
  // What a tap does, in the pill's second voice; while it waits, nothing.
  const cue = locked ? "Unlock…" : jammed ? undefined : "Lock";
  const orbLabel = unav ? `${e.name}: Unavailable` : moving ? `${e.name}: ${word}` : locked ? `Unlock ${e.name}…` : `Lock ${e.name}`;

  let slot;
  if (unav) slot = <UnavailableSlot lastSeen={e.lastSeen} />;
  else if (ro || moving) slot = <p className="lk-st" data-moving={moving || undefined}>{word}{ro && e.changedBy && !moving ? <span className="lk-st-x"> by {e.changedBy}</span> : null}</p>;
  else slot = (
    <TogglePill label={locked ? `${e.name}: Locked · Unlock…` : jammed ? `${e.name}: Jammed · Lock again` : `${e.name}: ${word} · Lock`} on={locked} onToggle={tap} extra={cue}>
      {jammed ? "Lock again" : word}
    </TogglePill>
  );

  const prompt = (a: LockAction) => `Enter the code to ${a === "open" ? "open the door" : a}`;
  const lastChange = [e.lastChanged && `${WORD[e.state].replace("…", "")} ${moving ? "since" : "at"} ${e.lastChanged}`, e.changedBy && `by ${e.changedBy}`].filter(Boolean).join(" ");
  const icon = <LockIcon open={!unav && !locked && e.state !== "locking"} alert={jammed} />;
  const canOpen = e.supportsOpen && !!onOpenDoor && !ro && !unav && !moving && e.state !== "open";

  return (
    <article {...article} data-state={e.state} data-alert={alertLabel ? "warn" : undefined} {...colors}>
      <header className="hd-head">
        {ro
          ? <span className="hd-orb hd-orb--static" aria-hidden="true" aria-disabled={unav || undefined}><span className="hd-orb-i">{icon}</span></span>
          : <Orb label={orbLabel} pressed={locked} unavailable={unav} intensity={0} onToggle={tap} onLongPress={sheet ? undefined : () => onOpenDetails?.()}>{icon}</Orb>}
        <CardTitle id={nameId} name={e.name} onOpen={sheet || !onOpenDetails ? undefined : () => onOpenDetails()}>
          <p className="hd-area">{status}</p>
          {compact && <p className="hd-sub">{alertLabel ? <AlertStatus label={alertLabel}>{warning}</AlertStatus> : word}</p>}
        </CardTitle>
        <p className="hd-num hd-num--control-duplicate" aria-hidden="true">{unav ? null : word}</p>
        {sheet && <SheetClose label={`Close ${e.name}`} onClick={onClose} focusOnOpen={!pending} />}
      </header>

      <div className="hd-slot">{bare ? <p className="hd-val">{alertLabel ? warning : word}</p> : slot}</div>

      {sheet && !unav && (pending || canOpen) && (
        <div className="hd-extra">
          {pending && (needsCode
            ? <Keypad key={pending} id={`${uid}-kp`} prompt={prompt(pending)} text={e.codeFormat === "text"}
                onSubmit={async (code) => {
                  const result = await run(pending, code);
                  if (result === "failed") throw new Error("not sent");
                  if (result === "done") close();
                  return result === "done";
                }}
                onCancel={close} />
            : <Confirm key={pending} id={`${uid}-cf`} busy={busy} error={failed ? "Didn’t go through. Try again." : null}
                question={`${VERB[pending]} ${pending === "open" ? "the door" : e.name}?`}
                detail={pending === "open" ? `${e.name} unlatches, and the door can be pushed open.` : pending === "unlock" ? "Anyone at the door can open it." : "It locks now."}
                action={pending === "open" ? "Open door" : VERB[pending]}
                onConfirm={confirm} onCancel={close} />)}
          {!pending && canOpen && (
            <button type="button" className="lk-door" onClick={() => ask("open")}>
              <DoorIcon />
              <span>Open door</span>
              <span className="lk-door-x">Unlatch it</span>
            </button>
          )}
        </div>
      )}

      {!unav && !pending && (lastChange || e.battery != null) && (
        <dl className="lk-last">
          {lastChange && <div><dt>Last change</dt><dd>{lastChange}</dd></div>}
          {e.battery != null && <div><dt>Battery</dt><dd>{lowBattery ? <span className="hd-warn">{e.battery}% · replace soon</span> : `${e.battery}%`}</dd></div>}
        </dl>
      )}

      {sheet && (
        <p className="hd-info">
          <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : ro ? "View only" : e.codeFormat ? "Code to unlock" : "No code"}</span>
          <span>{unav ? area ?? "" : e.supportsOpen ? "Lock · opens the door" : "Lock"}</span>
        </p>
      )}
    </article>
  );
}

export type LockSheetProps = SheetProps<LockCardProps>;

export const LockSheet = detailsSheet(LockCard);
