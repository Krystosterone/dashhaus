import type { LockAction, LockEntity, LockOutcome, LockResult } from "@dashhaus/core/entities/lock/types";
import { BATTERY_ADVICE, batterySaid, batteryText, isLowBattery } from "@dashhaus/core/entities/battery";
import { lockSeverity } from "@dashhaus/core/entities/lock/severity";
import { JAMMED_MEANING, LOCK_WORD } from "@dashhaus/core/entities/lock/words";
import { useGuardedAction } from "@dashhaus/core/primitives";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { DoorIcon, LockIcon } from "./icons";
import { AlertStatus, CardFrame, Confirm, Keypad, SheetBlock, TogglePill, detailsSheet, paint, useCard } from "../../shared/ui";
import type { ActionCardProps, SheetProps } from "../../shared/ui";
import "./LockCard.css";

export type { LockAction, LockOutcome, LockResult };

export interface LockCardProps extends ActionCardProps<LockAction> {
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
}

const VERB: Record<LockAction, string> = { lock: "Lock", unlock: "Unlock", open: "Open" };

/**
 * A door lock (one `lock.*`, with its device's battery). Locking is one tap on the orb or the pill. Unlocking never
 * is: a tap on a locked lock opens the sheet on its confirmation, or on the keypad when the lock asks for a code, and
 * a press and hold opens the sheet as on every card. Locked is the accent, as armed is; unlocked is the plain
 * surface. A jam or a low battery is a warn marker on the status line, never glow; a lock is a state, so it never
 * glows at all. It shows its last change, not a day's history.
 */
export function LockCard({ entity: e, variant, footprint, showControl, onLock, onUnlock, onOpenDoor, readOnly, onOpenDetails, onClose, action }: LockCardProps) {
  const card = useCard("lk", { variant, footprint, showControl, area: e.area });
  const { sheet, compact, area } = card;
  const unav = e.state === "unavailable";
  const locked = e.state === "locked";
  const moving = e.state === "locking" || e.state === "unlocking" || e.state === "opening";
  const jammed = e.state === "jammed";
  const ro = readOnly ?? (!onLock && !onUnlock);
  const colors = paint("state", 0);
  // Core's word; on its way it trails off, as every orb transition does ("Locking…").
  const word = `${LOCK_WORD[e.state]}${moving ? "…" : ""}`;
  // Core ranks it: a jam is urgent, a low battery advisory; the card draws the level it is given.
  const level = lockSeverity(e);

  // The question or keypad (sheet only), for the action waiting on it. A lock is only asked for in the sheet when it
  // turned out to want a code: a tap locks everywhere else.
  const handler = (a: LockAction) => (a === "lock" ? onLock : a === "unlock" ? onUnlock : onOpenDoor);
  const guard = useGuardedAction<LockAction>({
    run: (a, code) => handler(a)?.(code),
    needsCode: () => !!e.codeFormat,
    settled: (a) => unav || (a === "unlock" && e.state === "unlocked") || (a === "open" && e.state === "open") || (a === "lock" && e.state === "locked"),
    initial: action,
    disabled: ro,
    askElsewhere: sheet ? undefined : (a) => onOpenDetails?.(a),
  });
  const pending = guard.pending;
  const needsCode = guard.code || pending === "lock";

  /** The tap: lock an unlocked (or jammed, or open) lock at once; ask before unlocking a locked one. */
  const tap = () => {
    if (ro || unav || moving) return;
    if (locked) guard.ask("unlock");
    else void guard.attempt("lock");
  };

  const lowBattery = !unav && isLowBattery(e.battery);
  const warning = level === "urgent" ? LOCK_WORD.jammed : level === "advisory" ? batteryText(e.battery!) : null;
  const alertLabel = level === "urgent" ? `Warning: ${e.name}: jammed, it ${JAMMED_MEANING.toLowerCase()}`
    : level === "advisory" ? `Warning: ${batterySaid(e.battery!, e.name)}`
    : null;
  const since = sinceFact(e.lastChanged);
  // A jam is urgent and a low battery advisory: both are a warn marker, so the jam says what it means (attention-budget: words, not brightness); a compact row has room only for the word.
  const status = alertLabel ? <AlertStatus label={alertLabel}>{level === "urgent" && !compact ? `${warning} · ${JAMMED_MEANING.toLowerCase()}` : warning}</AlertStatus> : area ?? (unav ? "Unavailable" : since);
  // What a tap does, in the pill's second voice; while it waits, nothing.
  const cue = locked ? "Unlock…" : jammed ? undefined : "Lock";
  const orbLabel = unav ? `${e.name}: Unavailable` : moving ? `${e.name}: ${word}` : locked ? `Unlock ${e.name}…` : `Lock ${e.name}`;

  let slot;
  if (ro || moving) slot = <p className="lk-st" data-moving={moving || undefined}>{word}{ro && e.changedBy && !moving ? <span className="lk-st-x"> by {e.changedBy}</span> : null}</p>;
  else slot = (
    <TogglePill label={locked ? `${e.name}: Locked · Unlock…` : jammed ? `${e.name}: Jammed · Lock again` : `${e.name}: ${word} · Lock`} on={locked} onToggle={tap} extra={cue}>
      {jammed ? "Lock again" : word}
    </TogglePill>
  );

  const prompt = (a: LockAction) => `Enter the code to ${a === "open" ? "open the door" : a}`;
  const icon = <LockIcon open={!unav && !locked && e.state !== "locking"} alert={jammed} />;
  const canOpen = e.supportsOpen && !!onOpenDoor && !ro && !unav && !moving && e.state !== "open";

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, "data-alert": alertLabel ? "warn" : undefined, ...colors }}
      orb={ro ? undefined : { label: orbLabel, pressed: locked, intensity: 0, onToggle: tap, children: icon }}
      glyph={ro ? icon : undefined}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails && (() => onOpenDetails())}
      status={status}
      value={alertLabel ? warning : word}
      alert={alertLabel}
      bareValue={jammed ? warning : word}
      readout={{ value: unav ? null : word, duplicate: true }}
      onClose={onClose}
      closeFocus={!pending}
      control={slot}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged, e.changedBy), end: ro ? "View only" : e.codeFormat ? "Code to unlock" : "No code" }}
    >
      {!unav && (
        <SheetBlock>
          {pending && (needsCode
            ? <Keypad key={pending} prompt={prompt(pending)} text={e.codeFormat === "text"} onSubmit={guard.submit} onCancel={guard.close} />
            : <Confirm key={pending} busy={guard.busy} waiting="Waiting for the lock…" error={guard.failed ? "Didn’t go through. Try again." : null}
                question={`${VERB[pending]} ${e.name}?`}
                detail={pending === "open" ? `${e.name} unlatches, and the door can be pushed open.` : pending === "unlock" ? "Anyone at the door can open it." : "It locks now."}
                action={pending === "open" ? "Open door" : VERB[pending]}
                onConfirm={() => void guard.confirm()} onCancel={guard.close} />)}
          {!pending && canOpen && (
            <button type="button" className="lk-door" onClick={() => guard.ask("open")}>
              <DoorIcon />
              <span>Open door</span>
              <span className="lk-door-x">Unlatch it</span>
            </button>
          )}
        </SheetBlock>
      )}

      {!unav && !pending && e.battery != null && (
        <dl className="lk-last">
          {/* The figure keeps its own ink: the status line's marker already says a low battery (spec/orb.md). */}
          {e.battery != null && <div><dt>Battery</dt><dd>{lowBattery ? `${e.battery}% · ${BATTERY_ADVICE}` : `${e.battery}%`}</dd></div>}
        </dl>
      )}
    </CardFrame>
  );
}

export type LockSheetProps = SheetProps<LockCardProps>;

export const LockSheet = detailsSheet(LockCard);
