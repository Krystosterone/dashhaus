import type { ReactNode } from "react";
import type { LockAction, LockEntity, LockResult } from "@dashhaus/core/entities/lock/types";
import { lockSeverity } from "@dashhaus/core/entities/lock/severity";
import { batteryAdvice, batteryText, isLowBattery } from "@dashhaus/core/entities/battery";
import { JAMMED_MEANING, LOCK_WAITING, LOCK_WORD, lockAskAction, lockAskDetail, lockAsksHint, lockCodeFor, lockQuestion } from "@dashhaus/core/entities/lock/words";
import { ACTION_FAILED } from "@dashhaus/core/entities/guard";
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
    // A lock that wants a code to lock too takes it on the panel's keypad, as the alarm's keys do.
    if (e.codeFormat) details.openDetails();
  };

  const since = sinceFact(e.lastChanged);
  const word = LOCK_WORD[e.state];
  const pict = <Pictogram param="neutral" lit={locked}>{LOCK_PICT}</Pictogram>;
  const figure = FIGURE[e.state];
  const read: ReactNode = unav ? <Blank places={4} label="Unavailable" />
    : figure ? <><span aria-hidden="true">{figure}</span><span className="fd-sr">{word}</span></>
    : <Blank places={4} label={word} />;
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    : jammed ? [<Warn key="w" block>{LOCK_WORD.jammed}</Warn>, JAMMED_MEANING]
    : [word, e.changedBy && !moving ? `${since ? `${since} · ` : ""}${e.changedBy}` : since];
  const battery = level === "advisory" ? batteryText(e.battery!) : undefined;
  // The plate shows one warning, and a jam outranks the battery there; the panel still lists a low battery (spec/field.md).
  const lowBattery = !unav && isLowBattery(e.battery) ? batteryAdvice(e.battery) : undefined;
  // A row has no meta lines: the jam takes the area's line, in its block.
  const warning = jammed ? LOCK_WORD.jammed : battery;

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
      // Unlocked is a state, not a blank: OPEN keeps its places in the dim ink.
      rest={e.state === "unlocked" || e.state === "open"}
      warning={footprint === "compact" ? warning : battery}
      alert={level === "urgent" ? { level, what: "Jammed", startedAt: undefined } : undefined}
      panelFocus={pending ? "content" : undefined}
      facts={pending ? undefined : { start: unav ? lastSeenFact(e.lastSeen) : changed, end: <>{ro ? "View only" : e.codeFormat ? "Code to unlock" : "No code"}{e.battery != null && !unav ? ` · ${batteryText(e.battery)}` : ""}</> }}
      details={{ ...details, openDetails: openPanel }}
      pict={pict}
      read={read}
      meta={meta}
      lead={key(false)}
      row={key(true)}
    >
      {pending ? (needsCode
        ? <Keypad key={pending} prompt={`Code to ${lockCodeFor(pending)}`} text={e.codeFormat === "text"} onSubmit={guard.submit} onCancel={guard.close} />
        : <Confirm key={pending}
            question={lockQuestion(pending, e.name)} detail={lockAskDetail(pending, e.name)}
            action={lockAskAction(pending)} actionLabel={`${lockAskAction(pending)}, ${e.name}`}
            icon={pending === "open" ? <IconDoor /> : <IconLock open />}
            busy={guard.busy} waiting={LOCK_WAITING} error={guard.failed ? ACTION_FAILED : null}
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
              <p className="fd-hint">{jammed ? "The bolt stopped part way: lock again, or check the door." : moving ? `${LOCK_WAITING}.`
                : locked ? lockAsksHint(true, canOpen) : ["Locking takes one press.", lockAsksHint(false, canOpen)].filter(Boolean).join(" ")}</p>
            </div>
          )}
          {!ro && canOpen && jammed && (
            <div className="fd-block">
              <KeyGroup legend="Door" columns={1}>{openKey}</KeyGroup>
              <p className="fd-hint">{lockAsksHint(false, true)}</p>
            </div>
          )}
          {lowBattery && <p className="fd-hint"><Warn>{lowBattery}</Warn></p>}
        </>
      )}
    </ModuleFrame>
  );
}
