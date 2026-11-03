import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LockAction, LockEntity, LockOutcome, LockResult } from "@dashhaus/core/entities/lock/types";
import { lockSeverity } from "@dashhaus/core/entities/lock/severity";
import { useSettled } from "@dashhaus/core/hooks";
import { useKeypad } from "@dashhaus/core/primitives";
import { Blank, Key, Legend, ModuleFrame, Pictogram, Screen, Warn, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { IconCancel, IconDelete, IconDoor, IconEnter, IconLock, LOCK_PICT } from "./icons";
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

async function outcome(result: LockResult): Promise<LockOutcome> {
  try { return (await result) ?? "done"; } catch { return "failed"; }
}

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
  const [pending, setPending] = useState<LockAction | null>(ro ? null : defaultAction ?? null);
  const [askCode, setAskCode] = useState(false);
  const unav = e.state === "unavailable";
  const locked = e.state === "locked";
  const moving = e.state === "locking" || e.state === "unlocking" || e.state === "opening";
  const jammed = e.state === "jammed";
  const level = lockSeverity(e);
  // Done elsewhere: the question no longer stands.
  useEffect(() => {
    if (!pending) return;
    if ((pending === "unlock" && e.state === "unlocked") || (pending === "open" && e.state === "open") || (pending === "lock" && e.state === "locked") || unav) setPending(null);
  }, [e.state, pending, unav]);

  const handler = (a: LockAction) => (a === "lock" ? onLock : a === "unlock" ? onUnlock : onOpenDoor);
  const run = (a: LockAction, code?: string) => outcome(handler(a)?.(code));
  const ask = (a: LockAction) => { if (ro) return; setPending(a); details.openDetails(); };
  const close = () => { setPending(null); setAskCode(false); };
  const openPanel = () => { close(); details.openDetails(); };
  const press = () => {
    if (ro || unav || moving) return;
    if (locked) { ask("unlock"); return; }
    void run("lock").then((result) => { if (result === "wrong_code") { setAskCode(true); ask("lock"); } });
  };

  const since = e.lastChanged ? `Since ${e.lastChanged}` : undefined;
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
  const needsCode = !!e.codeFormat || askCode || pending === "lock";
  const changed = e.lastChanged ? `Last changed ${e.lastChanged}${e.changedBy ? ` by ${e.changedBy}` : ""}` : "";

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
      details={{ ...details, openDetails: openPanel }}
      pict={pict}
      read={read}
      meta={meta}
      lead={key(false)}
      row={key(true)}
    >
      <div className="fd-lk-panel" data-state={e.state}>
        <Screen pict={pict} meta={meta}>{read}</Screen>
        {pending ? (needsCode
          ? <Keypad key={pending} prompt={`Code to ${pending === "open" ? "open the door" : pending}`} text={e.codeFormat === "text"}
              onSubmit={async (code) => {
                const result = await run(pending, code);
                if (result === "failed") throw new Error("not sent");
                if (result === "done") close();
                return result === "done";
              }}
              onCancel={close} />
          : <Confirm key={pending} action={pending} name={e.name} run={() => run(pending)} onDone={close} onCode={() => setAskCode(true)} onCancel={close} />
        ) : (
          <>
            {!ro && (
              <div className="fd-block">
                <Legend>Lock</Legend>
                <div className="fd-lk-keys" data-n={canOpen ? 2 : 1}>
                  {key(true)}
                  {canOpen && <Key label={`Open ${e.name}: asks first`} wide caption="Open door" onPress={() => setPending("open")}><IconDoor /></Key>}
                </div>
                <p className="fd-lk-hint">{locked ? "Unlocking asks first." : jammed ? "The bolt stopped part way: lock again, or check the door." : moving ? "Waiting for the lock." : "Locking takes one press."}</p>
              </div>
            )}
            {battery && <p className="fd-lk-note"><Warn>{battery}. Replace it soon.</Warn></p>}
            <p className="fd-info">
              <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : changed}</span>
              <span>{ro ? "View only" : e.codeFormat ? "Code to unlock" : "No code"}{e.battery != null && !unav ? ` · Battery ${e.battery}%` : ""}</span>
            </p>
          </>
        )}
      </div>
    </ModuleFrame>
  );
}

/**
 * The panel's confirmation, for a lock that takes no code: the question as its legend, what it means, then Cancel and
 * the action as two keys. Focus lands on Cancel, so Enter never unlocks, and the action takes no press for a moment
 * after it appears, so the second tap of the press that asked can't land on it.
 */
function Confirm({ action, name, run, onDone, onCode, onCancel }: { action: LockAction; name: string; run: () => Promise<LockOutcome>; onDone: () => void; onCode: () => void; onCancel: () => void }) {
  const uid = useId();
  const settled = useSettled();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Cancel takes focus: marked for a panel that opens on the question, focused for one already open.
  const keys = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cancel = keys.current?.querySelector("button");
    cancel?.setAttribute("data-autofocus", "");
    if (cancel?.closest("dialog")?.open) cancel.focus();
  }, []);
  const go = async () => {
    if (!settled() || busy) return;
    setBusy(true);
    setFailed(false);
    const result = await run();
    setBusy(false);
    if (result === "done") onDone();
    else if (result === "wrong_code") onCode();
    else setFailed(true);
  };
  const what = action === "open" ? `${name} unlatches; the door can be pushed open.` : action === "unlock" ? "Anyone at the door can open it." : "It locks now.";
  return (
    <div className="fd-lk-cf" role="group" aria-labelledby={`${uid}-q`} aria-describedby={`${uid}-d`}>
      <Legend id={`${uid}-q`}>{action === "open" ? `Open ${name}?` : `${VERB[action]} ${name}?`}</Legend>
      <p className="fd-lk-hint" id={`${uid}-d`} role="status">{busy ? "Waiting for the lock" : failed ? <Warn>Didn’t go through. Try again</Warn> : what}</p>
      <div className="fd-lk-keys" data-n={2} ref={keys}>
        <Key label="Cancel" wide caption="Cancel" onPress={onCancel}><IconCancel /></Key>
        <Key label={`${VERB[action]}, ${name}`} wide caption={VERB[action]} disabled={busy} onPress={() => void go()}>
          {action === "open" ? <IconDoor /> : <IconLock open={action !== "lock"} />}
        </Key>
      </div>
    </div>
  );
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * The code keypad, in the panel, for a lock that asks for a code: typing it is the confirmation. What the code is for,
 * the code on a strip of screen, digits, delete and enter, then Cancel; a physical keyboard types too.
 */
function Keypad({ prompt, text, onSubmit, onCancel }: { prompt: string; text?: boolean; onSubmit: (code: string) => boolean | Promise<boolean>; onCancel: () => void }) {
  const uid = useId();
  const { code, error, busy, press, back, submit, rootProps } = useKeypad({ text, onSubmit });
  const places = Math.max(4, code.length);
  const status = busy ? "Checking"
    : error === "wrong" ? <Warn>Wrong code. Try again</Warn>
    : error === "failed" ? <Warn>Didn’t go through. Try again</Warn>
    : code.length ? `${code.length} entered` : "Enter the code";
  return (
    <div className="fd-lk-pad" {...rootProps} role="group" aria-labelledby={`${uid}-p`}>
      <Legend id={`${uid}-p`}>{prompt}</Legend>
      <div className="fd-lk-code" role="status">
        <Screen meta={[status]}>
          <span className="fd-lk-dots" aria-hidden="true">{Array.from({ length: places }, (_, i) => <i key={i} data-on={i < code.length || undefined} />)}</span>
        </Screen>
      </div>
      <div className="fd-lk-pad-keys">
        {DIGITS.map((d) => <Key key={d} label={d} wide disabled={busy} onPress={() => press(d)}><span className="fd-key-fig">{d}</span></Key>)}
        <Key label="Delete" wide disabled={busy} unavailable={!code} onPress={back}><IconDelete /></Key>
        <Key label="0" wide disabled={busy} onPress={() => press("0")}><span className="fd-key-fig">0</span></Key>
        <Key label="Enter code" wide disabled={busy} unavailable={!code} onPress={() => void submit()}><IconEnter /></Key>
      </div>
      <Key label="Cancel" wide caption="Cancel" onPress={onCancel}>{null}</Key>
    </div>
  );
}
