import type { ReactNode } from "react";
import type { LockAction, LockEntity, LockResult } from "@dashhaus/core/entities/lock/types";
import { lockSeverity } from "@dashhaus/core/entities/lock/severity";
import { isLowBattery } from "@dashhaus/core/entities/battery";
import { useGuardedAction } from "@dashhaus/core/primitives";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { Blank, Confirm, Key, Keypad, ModuleFrame, Pictogram, Warn, useDetails, KeyGroup } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { IconDoor, IconLock, LOCK_PICT } from "./icons";
import "./LockModule.css";

export interface LockModuleProps {
  entity: LockEntity;
  footprint?: FieldFootprint;
  /** Lock it, with the code when the lock asks for one. A press does this. With Home Assistant, `createLockHandlers`. */
  onLock?: (code?: string) => LockResult;
  /** Unlock it: only from the panel's confirmation or its keypad, never from a press on the module. */
  onUnlock?: (code?: string) => LockResult;
  /** Unlatch the door (`lock.open`), where the lock supports it: from the panel, behind the same confirmation. */
  onOpenDoor?: (code?: string) => LockResult;
  /** View only: the lock's state and last change, nothing pressed. Default: on when neither onLock nor onUnlock is given. */
  readOnly?: boolean;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
  /** Open the detail panel on this action's confirmation or keypad (stories). */
  defaultAction?: LockAction;
}

/** The screen's figure, four places like a segment display's; the meta line says the state in words. */
const FIGURE: Partial<Record<LockEntity["state"], string>> = { locked: "LOCK", unlocked: "OPEN", open: "OPEN", jammed: "JAM" };
const WORD: Record<LockEntity["state"], string> = {
  locked: "Locked", unlocked: "Unlocked", locking: "Locking", unlocking: "Unlocking", jammed: "Jammed", open: "Unlatched", opening: "Unlatching", unavailable: "Unavailable",
};
const VERB: Record<LockAction, string> = { lock: "Lock", unlock: "Unlock", open: "Open door" };

/**
 * A door lock (one `lock.*`, with its device's battery) as a field module. The screen says LOCK, OPEN or JAM beside a
 * padlock lit while locked; the meta lines say the state and since when, and who changed it. The row is one key that
 * prints what pressing it does: **Lock** while unlocked (it locks at once), **Unlock** while locked, which only opens
 * the panel on its confirmation, or its keypad when the lock asks for a code, so a press never unlocks a door. Its
 * LED is the locked signal. Jammed is urgent: an inverted block on the screen, on the alert line, and the key locks
 * again. A low battery is advisory, on the plate in place of the area. The name, or a press and hold, opens the panel.
 */
export function LockModule({ entity: e, footprint = "standard", onLock, onUnlock, onOpenDoor, readOnly, defaultOpen = false, defaultAction }: LockModuleProps) {
  const ro = readOnly ?? (!onLock && !onUnlock);
  const details = useDetails(defaultOpen || (!ro && defaultAction != null));
  const unav = e.state === "unavailable";
  const locked = e.state === "locked";
  const moving = e.state === "locking" || e.state === "unlocking" || e.state === "opening";
  const jammed = e.state === "jammed";
  const level = lockSeverity(e);

  // The panel's question or keypad, for the action waiting on it; done elsewhere, the question no longer stands.
  const handler = (a: LockAction) => (a === "lock" ? onLock : a === "unlock" ? onUnlock : onOpenDoor);
  const guard = useGuardedAction<LockAction>({
    run: (a, code) => handler(a)?.(code),
    needsCode: () => !!e.codeFormat,
    settled: (a) => unav || (a === "unlock" && e.state === "unlocked") || (a === "open" && e.state === "open") || (a === "lock" && e.state === "locked"),
    initial: defaultAction,
    disabled: ro,
  });
  const pending = guard.pending;
  const ask = (a: LockAction) => { if (ro) return; guard.ask(a); details.openDetails(); };
  const openPanel = () => { guard.close(); details.openDetails(); };
  const press = () => {
    if (ro || unav || moving) return;
    if (locked) { ask("unlock"); return; }
    void guard.attempt("lock").then((result) => { if (result === "wrong_code") details.openDetails(); });
  };

  const since = sinceFact(e.lastChanged);
  const word = WORD[e.state];
  const pict = <Pictogram param="neutral" lit={locked}>{LOCK_PICT}</Pictogram>;
  const figure = FIGURE[e.state];
  const read: ReactNode = unav ? <Blank places={4} label="Unavailable" />
    : figure ? <><span aria-hidden="true">{figure}</span><span className="fd-sr">{word}</span></>
    : <Blank places={4} label={word} />;
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? `Seen ${e.lastSeen}` : undefined]
    : jammed ? [<Warn key="w" block>Jammed</Warn>, "May not be locked"]
    : [word, e.changedBy && !moving ? `${since ? `${since} · ` : ""}${e.changedBy}` : since];
  const battery = level === "advisory" ? `Battery ${e.battery}%` : undefined;
  // The plate shows one warning, and a jam outranks the battery there; the panel still lists a low battery (spec/field.md).
  const lowBattery = !unav && isLowBattery(e.battery) ? `Battery ${e.battery}%` : undefined;
  // A row has no meta lines: the jam takes the area's line, in its block.
  const warning = jammed ? "Jammed" : battery;

  const verb = locked ? "Unlock" : jammed ? "Lock again" : moving ? undefined : "Lock";
  const icon = <IconLock open={!unav && !locked && e.state !== "locking"} alert={jammed} />;
  const key = (wide: boolean) => (
    <Key
      label={unav ? `${e.name}, unavailable` : moving ? `${e.name}, ${word.toLowerCase()}` : locked ? `Unlock ${e.name}: asks first` : `Lock ${e.name}`}
      led={!unav && locked}
      unavailable={unav || moving || ro}
      onPress={press}
      onHold={openPanel}
      wide={wide}
      caption={wide && verb && !unav && !ro ? verb : undefined}
    >
      {icon}
    </Key>
  );

  const canOpen = e.supportsOpen && !!onOpenDoor && !ro && !unav && !moving && e.state !== "open";
  const openKey = <Key label={`Open ${e.name}: asks first`} wide caption="Open door" onPress={() => guard.ask("open")}><IconDoor /></Key>;
  const needsCode = guard.code || pending === "lock";
  const changed = lastChangedFact(e.lastChanged, e.changedBy);

  return (
    <ModuleFrame
      kind="fd-lk"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      warning={footprint === "compact" ? warning : battery}
      alert={level === "urgent" ? { level, what: "Jammed", startedAt: undefined } : undefined}
      panelFocus={pending ? "content" : undefined}
      facts={pending ? undefined : { start: unav ? lastSeenFact(e.lastSeen) : changed, end: <>{ro ? "View only" : e.codeFormat ? "Code to unlock" : "No code"}{e.battery != null && !unav ? ` · Battery ${e.battery}%` : ""}</> }}
      details={{ ...details, openDetails: openPanel }}
      pict={pict}
      read={read}
      meta={meta}
      lead={key(false)}
      row={key(true)}
    >
      {pending ? (needsCode
        ? <Keypad key={pending} prompt={`Code to ${pending === "open" ? "open the door" : pending}`} text={e.codeFormat === "text"} onSubmit={guard.submit} onCancel={guard.close} />
        : <Confirm key={pending}
            question={`${pending === "open" ? "Open" : VERB[pending]} ${e.name}?`}
            detail={pending === "open" ? `${e.name} unlatches; the door can be pushed open.` : "Anyone at the door can open it."}
            action={VERB[pending]} actionLabel={`${VERB[pending]}, ${e.name}`}
            icon={pending === "open" ? <IconDoor /> : <IconLock open />}
            busy={guard.busy} waiting="Waiting for the lock" error={guard.failed ? "Didn’t go through. Try again" : null}
            onConfirm={() => void guard.confirm()} onCancel={guard.close} />
      ) : (
        <>
          {!ro && (
            <div className="fd-block">
              {/* Jammed, Lock again is the one key for securing the door: Open door steps out of its row, to a group of its own. */}
              <KeyGroup legend="Lock" columns={canOpen && !jammed ? 2 : 1}>
                {key(true)}
                {canOpen && !jammed && openKey}
              </KeyGroup>
              <p className="fd-hint">{locked ? "Unlocking asks first." : jammed ? "The bolt stopped part way: lock again, or check the door." : moving ? "Waiting for the lock." : "Locking takes one press."}</p>
            </div>
          )}
          {!ro && canOpen && jammed && (
            <div className="fd-block">
              <KeyGroup legend="Door" columns={1}>{openKey}</KeyGroup>
            </div>
          )}
          {lowBattery && <p className="fd-hint"><Warn>{lowBattery}. Replace it soon.</Warn></p>}
        </>
      )}
    </ModuleFrame>
  );
}
