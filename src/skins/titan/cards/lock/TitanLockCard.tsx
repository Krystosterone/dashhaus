import type { LockEntity } from "@dashhaus/core/entities/lock/types";
import { lockSeverity } from "@dashhaus/core/entities/lock/severity";
import { lastChangedFact, lastSeenFact } from "@dashhaus/core/entities/facts";
import type { GuardedResult } from "@dashhaus/core/primitives";
import { TitanCardFrame, TitanDatum } from "../../shared/ui";
import type { TitanGuardedAction, TitanFootprint, TitanTone } from "../../shared/ui";
import "./TitanLockCard.css";

export interface TitanLockCardProps {
  entity: LockEntity;
  footprint?: TitanFootprint;
  defaultOpen?: boolean;
  /** Runs at once, and asks for the code where the entity wants one. */
  onLock?: (code?: string) => GuardedResult;
  /** Asks first: the question, or the keypad where the entity wants a code; never one tap. */
  onUnlock?: (code?: string) => GuardedResult;
  /** Asks first: the question, or the keypad where the entity wants a code; never one tap. */
  onOpen?: (code?: string) => GuardedResult;
}

const WORDS: Record<LockEntity["state"], string> = {
  locked: "Locked", unlocked: "Unlocked", locking: "Locking", unlocking: "Unlocking", jammed: "Jammed", open: "Open", opening: "Opening", unavailable: "Unavailable",
};

/** Locked rests in slate; unlocked or open is salmon, the console's "active"; jammed is the one red alert. */
const toneOf = (e: LockEntity): TitanTone =>
  e.state === "jammed" ? "alert" : e.state === "unlocked" || e.state === "open" || e.state === "opening" || e.state === "unlocking" ? "on" : "idle";

/**
 * A door lock: its state as the big word, LOCK as a key lit while locked, UNLOCK… (and OPEN… where it unlatches)
 * asking first in the details, on the keypad where it wants a code. A jammed bolt is the red alert, with words.
 */
export function TitanLockCard({ entity: e, footprint = "standard", defaultOpen = false, onLock, onUnlock, onOpen }: TitanLockCardProps) {
  const unavailable = e.state === "unavailable";
  const severity = lockSeverity(e);
  const code = !!e.codeFormat;
  const text = e.codeFormat === "text";
  const guarded: TitanGuardedAction[] = [
    ...(onLock ? [{ key: "lock", label: "Lock", code, text, tone: "frame" as const, pressed: e.state === "locked", run: onLock }] : []),
    ...(onUnlock ? [{ key: "unlock", label: "Unlock", asks: true, code, text, run: onUnlock }] : []),
    ...(onOpen && e.supportsOpen ? [{ key: "open", label: "Open", asks: true, code, text, run: onOpen }] : []),
  ];
  const status = e.state === "jammed" ? "Bolt stopped part way" : e.changedBy ? `By ${e.changedBy}` : e.lastChanged ? `Since ${e.lastChanged}` : code ? "Code required" : "Secured by key";
  const battery = e.battery != null && <TitanDatum label="Battery" value={unavailable ? "—" : `${Math.round(e.battery)}%`} tone={severity === "advisory" ? "alert" : "idle"} />;
  return (
    <TitanCardFrame
      card="lock" code="LK" entityId={e.entityId} name={e.name} area={e.area} state={e.state}
      status={status} summary={WORDS[e.state]} tone={toneOf(e)}
      warning={severity === "urgent" ? "Jammed" : severity === "advisory" ? "Battery low" : undefined}
      gauge={<span className="titan-rail titan-lock-bolt" data-bolt={e.state} aria-hidden="true"><span /></span>}
      actions={battery || undefined} guarded={guarded} footprint={footprint} defaultOpen={defaultOpen}
      facts={[
        ["State", WORDS[e.state]],
        ["Code", code ? (text ? "Letters and digits" : "Digits") : "None"],
        e.supportsOpen && ["Unlatch", "Supported"],
        e.battery != null && ["Battery", `${Math.round(e.battery)}%`],
        !unavailable && ["Changed", lastChangedFact(e.lastChanged, e.changedBy).replace(/^Last changed /, "")],
        unavailable && ["Last seen", lastSeenFact(e.lastSeen).replace(/^Last seen /, "")],
      ]}
    />
  );
}
