import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import type { AlarmAction, AlarmEntity, AlarmHistory, AlarmMode, AlarmResult } from "../../../../domains/alarm/types";
import { ARMED_LABEL, ARMED_MODE, MODE_HINT, MODE_LABEL, alarmSeverity, mmss, modeChoices, needsCode } from "../../../../domains/alarm/modes";
import { fmtAgo, fmtDuration } from "../../../../domains/format";
import { useDelayLeft } from "../../../../hooks/useDelayLeft";
import { useNow } from "../../../../hooks/useNow";
import { useKeypad } from "../../../../primitives/keypad";
import { Blank, Digits, Glyph, Key, Legend, ModuleFrame, Pictogram, Screen, Today, Warn, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { IconDelete, IconEnter, IconMode, IconShield, SHIELD_PICT } from "./icons";
import "./AlarmModule.css";

export interface AlarmModuleProps {
  entity: AlarmEntity;
  footprint?: FieldFootprint;
  /** Today, for the detail panel, and a view-only module's row. Omit to leave them without it. */
  history?: AlarmHistory;
  /**
   * Arm in a mode. Resolve (or return) false when the code was wrong; reject when the call didn't go through. May
   * answer later: the keypad waits. With Home Assistant, `createAlarmHandlers` from src/ha/actions/alarm does all of this.
   */
  onArm?: (mode: AlarmMode, code?: string) => AlarmResult;
  /** Disarm (also cancels arming and silences a triggered alarm). Same contract as onArm. */
  onDisarm?: (code?: string) => AlarmResult;
  /**
   * View only: the alarm as a reading, its state, delays and today, with nothing to arm, disarm or type a code into.
   * For panels Home Assistant can read but not control (a Ring Alarm without a subscription). Default: on when
   * neither onArm nor onDisarm is given.
   */
  readOnly?: boolean;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
  /** Open the detail panel on the keypad for this action (stories). */
  defaultAction?: AlarmAction;
}

const listOf = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/**
 * A security alarm (one alarm_control_panel) as a field module. The screen says ON or OFF beside a shield, lit while
 * armed, and counts an exit or entry delay down in its place; the meta lines say the mode and since when, a warning
 * behind its marker (triggered, an entry delay, a door left open). The row is a choice key for Off and each mode, the
 * current one chosen; where they don't fit, and through a delay, one key says what pressing it does (Arm, Disarm,
 * Cancel). Whatever needs the code opens the detail panel on its keypad. A view-only alarm is a reading: its glyph
 * and today, where the keys would be. The name, or a press and hold on a key, opens the panel.
 */
export function AlarmModule({ entity: e, footprint = "standard", history, onArm, onDisarm, readOnly, defaultOpen = false, defaultAction }: AlarmModuleProps) {
  const ro = readOnly ?? (!onArm && !onDisarm);
  const details = useDetails(defaultOpen || (!ro && defaultAction != null));
  // The keypad's action, while the panel asks for the code.
  const [pending, setPending] = useState<AlarmAction | null>(ro ? null : defaultAction ?? null);
  const unav = e.state === "unavailable";
  const armedMode = ARMED_MODE[e.state];
  const current = armedMode ?? "off";
  const moving = e.state === "arming" || e.state === "pending" || e.state === "disarming";
  const steady = e.state === "disarmed" || armedMode != null;
  // Armed, and on its way in or out: the shield lights and the LED says on.
  const on = !unav && e.state !== "disarmed";
  const left = useDelayLeft(e.delay, e.changedAt, moving);
  const now = useNow();
  const level = unav ? undefined : alarmSeverity(e);
  // A disarm that's no longer needed (it disarmed from elsewhere) leaves the keypad.
  useEffect(() => { if (e.state === "disarmed" && pending?.kind === "disarm") setPending(null); }, [e.state, pending]);

  const run = async (a: AlarmAction, code?: string) => (await (a.kind === "disarm" ? onDisarm?.(code) : onArm?.(a.mode, code))) !== false;
  const openPanel = () => { setPending(null); details.openDetails(); };
  const act = (a: AlarmAction) => {
    if (ro) return;
    // No code: nothing to wait for on screen; the state change is the answer.
    if (!needsCode(e, a)) { run(a).catch(() => undefined); return; }
    setPending(a);
    details.openDetails();
  };
  const pick = (m: AlarmMode | "off") => act(m === "off" ? { kind: "disarm" } : { kind: "arm", mode: m });

  const to = e.armingTo ? ` ${MODE_LABEL[e.armingTo].toLowerCase()}` : "";
  const open = e.openSensors ?? [];
  // Triggered and the entry delay name what set them off, short: the figure says ALARM, or counts down.
  const warning = unav ? undefined
    : e.state === "triggered" ? e.triggeredBy ?? "Triggered"
    : e.state === "pending" ? e.triggeredBy ?? "Entry delay"
    // More than one open: the count first, so a long name truncates before it does.
    : e.state === "disarmed" && open.length ? (open.length > 1 ? `${open.length} open: ${open.join(", ")}` : `${open[0]} open`)
    : undefined;
  const word = e.state === "arming" ? `Arming${to}` : e.state === "disarming" ? "Disarming" : armedMode ? ARMED_LABEL[armedMode] : "Disarmed";

  const pict = <Pictogram param="neutral" lit={on}>{SHIELD_PICT}</Pictogram>;
  // A delay counts down in the figure's place; without its length there's no way to know, so the segments are blank.
  // Triggered, the alarm: the figure says ALARM; a row's screen can't hold it, so it says how long ago it went off, which
  // can't be mistaken for the clock.
  const ago = e.changedAt != null ? Math.floor((now.getTime() - e.changedAt) / 60_000) : undefined;
  const read: ReactNode = unav ? <Blank label="Unavailable" />
    : e.state === "triggered" ? (footprint === "compact" ? (ago != null ? <><span className="fd-sr">Alarm, </span>{ago < 1 ? "NOW" : fmtAgo(ago)}</> : <Blank label="Alarm" />) : "ALARM")
    : moving ? (left != null ? <Digits text={mmss(left)} places={4} /> : <Blank places={4} label={word} />)
    : on ? "ON" : "OFF";
  const since = e.lastChanged ? `Since ${e.lastChanged}` : undefined;
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? `Seen ${e.lastSeen}` : undefined]
    // The figure says ALARM: its lines say what set it off, if known, and since when.
    : e.state === "triggered" ? (e.triggeredBy ? [e.triggeredBy, since] : [since ?? "Triggered"])
    : e.state === "pending" ? [<Warn key="w" block>{warning}</Warn>, ro ? "Entry delay" : "Disarm now"]
    : e.state === "arming" ? [word, "Leave now"]
    : warning ? [<Warn key="w">{warning}</Warn>, since]
    : [word, since];
  // A row has no meta lines: a warning takes the area's line behind its marker, and the mode, which the screen can't
  // hold, takes it while armed or on the way.
  const line = !unav && !warning && e.state !== "disarmed" ? word : undefined;
  const shield = <IconShield kind={!unav && (e.state === "pending" || e.state === "triggered") ? "alert" : on ? "armed" : "off"} />;

  // The one key: what pressing it does, from the state. Disarmed with more than one mode, Arm opens the panel's mode keys.
  const key = (wide: boolean) => {
    const only = e.modes.length === 1 ? e.modes[0] : undefined;
    const press = e.state === "disarmed"
      ? (only ? { does: `Arm ${MODE_LABEL[only].toLowerCase()}`, label: `Arm ${e.name}, ${MODE_LABEL[only].toLowerCase()}`, run: () => act({ kind: "arm", mode: only }) }
        : e.modes.length ? { does: "Arm", label: `Arm ${e.name}: choose a mode`, run: openPanel } : undefined)
      : e.state === "arming" ? { does: "Cancel", label: `Cancel arming ${e.name}`, run: () => act({ kind: "disarm" }) }
      : e.state === "disarming" ? undefined
      : { does: "Disarm", label: `Disarm ${e.name}`, run: () => act({ kind: "disarm" }) };
    const flat = unav || !press;
    return (
      <Key
        label={unav ? `${e.name}, unavailable` : press ? press.label : `${e.name}, ${word.toLowerCase()}`}
        led={on}
        unavailable={flat}
        onPress={press?.run ?? (() => {})}
        onHold={details.openDetails}
        wide={wide}
        caption={wide && press && !unav ? press.does : undefined}
      >
        {shield}
      </Key>
    );
  };

  const choices = modeChoices(e.modes, current);
  // Off and each mode, the current one chosen. Captions where every one fits, glyphs below; where even the glyphs
  // don't, AlarmModule.css hands the row to the one key.
  const bank = (where: "m" | "p") => (
    <div className="fd-al-bank" role="group" aria-label={`${e.name} mode`} data-n={choices.length} data-where={where}>
      {choices.map((m) => (
        <Key key={m} label={m === "off" ? "Disarm" : `Arm ${MODE_LABEL[m].toLowerCase()}`} chosen={m === current} onPress={() => pick(m)} onHold={where === "m" ? details.openDetails : undefined} wide caption={MODE_LABEL[m]}>
          <IconMode mode={m} />
        </Key>
      ))}
    </div>
  );

  const glyph = <Glyph unavailable={unav}>{shield}</Glyph>;
  const today = history && (unav ? `Unavailable since ${e.lastSeen ?? "earlier"}` : history.armedMinutes > 0 ? `Armed ${fmtDuration(history.armedMinutes)}` : "Not armed today");
  const row = ro ? (
    <div className="fd-al-row">
      {glyph}
      <Today summary={today} label="Armed by hour today." tone="neutral" samples={history?.samples} currentHour={history?.currentHour} />
    </div>
  ) : steady && !unav ? (
    <div className="fd-al-row" data-bank data-n={choices.length}>
      {bank("m")}
      <div className="fd-al-alt">{key(true)}</div>
    </div>
  ) : key(true);

  return (
    <ModuleFrame
      kind="fd-al"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      warning={footprint === "compact" ? warning : undefined}
      line={line}
      alert={level === "alarm" ? { level, what: warning ?? "Triggered", startedAt: e.changedAt, say: `Alarm: ${e.name} triggered${e.triggeredBy ? ` by ${e.triggeredBy}` : ""}.` }
        : level === "urgent" ? { level, what: e.triggeredBy ? `Entry delay, ${e.triggeredBy}` : "Entry delay", startedAt: e.changedAt } : undefined}
      panelFocus={pending ? "content" : undefined}
      details={{ ...details, openDetails: openPanel }}
      pict={pict}
      read={read}
      meta={meta}
      lead={ro ? glyph : key(false)}
      row={row}
    >
      <div className="fd-al-panel" data-state={e.state}>
        <Screen pict={pict} meta={meta}>{read}</Screen>
        {pending ? (
          <Keypad
            key={JSON.stringify(pending)}
            prompt={pending.kind === "disarm" ? (e.state === "arming" ? "Code to cancel arming" : "Code to disarm") : `Code to arm ${MODE_LABEL[pending.mode].toLowerCase()}`}
            text={e.codeFormat === "text"}
            onSubmit={async (code) => { const ok = await run(pending, code); if (ok) setPending(null); return ok; }}
            onCancel={() => setPending(null)}
          />
        ) : (
          <AlarmDetails e={e} ro={ro} history={history} today={today} control={ro ? null : steady && !unav ? bank("p") : key(true)} />
        )}
      </div>
    </ModuleFrame>
  );
}

interface DetailsProps {
  e: AlarmEntity;
  ro: boolean;
  history?: AlarmHistory;
  today?: string;
  control: ReactNode;
}

/** The panel's content under its screen: the mode keys, or the one key through a delay; what's open; today; facts. */
function AlarmDetails({ e, ro, history, today, control }: DetailsProps) {
  const uid = useId();
  const unav = e.state === "unavailable";
  const armedMode = ARMED_MODE[e.state];
  const open = unav ? [] : e.openSensors ?? [];
  const codeToArm = !!e.codeFormat && (e.codeArmRequired ?? true);
  const changed = e.lastChanged ? `Last changed ${e.lastChanged}${e.changedBy ? ` by ${e.changedBy}` : ""}` : "";
  return (
    <>
      {control && (
        <div className="fd-block">
          <Legend id={`${uid}-m`}>Mode</Legend>
          {control}
          {armedMode && <p className="fd-al-hint">Watches {MODE_HINT[armedMode].toLowerCase()}.</p>}
        </div>
      )}
      {open.length > 0 && (
        <p className="fd-al-open">
          <Warn>{listOf(open)} {open.length > 1 ? "are" : "is"} open.</Warn>
          {!ro && e.state === "disarmed" && <span> Arming will leave {open.length > 1 ? "them" : "it"} unguarded.</span>}
        </p>
      )}
      {history && <Today summary={today} label="Armed by hour today." tone="neutral" samples={history.samples} currentHour={history.currentHour} />}
      <p className="fd-info">
        <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : changed}</span>
        <span>{ro ? "View only" : !e.codeFormat ? "No code" : codeToArm ? "Code to arm and disarm" : "Code to disarm"}</span>
      </p>
    </>
  );
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * The code keypad, in the panel: what the code is for, the code on a strip of screen (a dot per place, unlit to
 * four), digits, delete and enter, then Cancel. A physical keyboard types too. While Home Assistant answers it says
 * Checking; a wrong code clears for another try, and one that didn't go through stays for Enter to try again.
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
    <div className="fd-al-pad" {...rootProps} role="group" aria-labelledby={`${uid}-p`}>
      <Legend id={`${uid}-p`}>{prompt}</Legend>
      <div className="fd-al-code" role="status">
        <Screen meta={[status]}>
          <span className="fd-al-dots" aria-hidden="true">{Array.from({ length: places }, (_, i) => <i key={i} data-on={i < code.length || undefined} />)}</span>
        </Screen>
      </div>
      <div className="fd-al-keys">
        {DIGITS.map((d) => <Key key={d} label={d} wide disabled={busy} onPress={() => press(d)}><span className="fd-key-fig">{d}</span></Key>)}
        <Key label="Delete" wide disabled={busy} unavailable={!code} onPress={back}><IconDelete /></Key>
        <Key label="0" wide disabled={busy} onPress={() => press("0")}><span className="fd-key-fig">0</span></Key>
        <Key label="Enter code" wide disabled={busy} unavailable={!code} onPress={() => void submit()}><IconEnter /></Key>
      </div>
      <Key label="Cancel" wide caption="Cancel" onPress={onCancel}>{null}</Key>
    </div>
  );
}
