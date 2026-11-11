import { useId } from "react";
import type { ReactNode } from "react";
import type { AlarmAction, AlarmEntity, AlarmHistory, AlarmMode, AlarmResult } from "@dashhaus/core/entities/alarm/types";
import { ARMED_LABEL, ARMED_MODE, MODE_HINT, MODE_LABEL, mmss, modeChoices, needsCode } from "@dashhaus/core/entities/alarm/modes";
import { alarmSeverity } from "@dashhaus/core/entities/alarm/severity";
import { alarmCodeFor, alarmWarning, openSentence, warningLine } from "@dashhaus/core/entities/alarm/words";
import { fmtAgo } from "@dashhaus/core/entities/format";
import { useDelayLeft } from "@dashhaus/core/hooks";
import { useNow } from "@dashhaus/core/hooks";
import { useGuardedAction } from "@dashhaus/core/primitives";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { Blank, Digits, Glyph, Key, KeyGroup, Keypad, Legend, ModuleFrame, Pictogram, Today, Warn, WarnWords, useDetails, ModuleRow } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { IconMode, IconShield, SHIELD_PICT } from "./icons";
import "./AlarmModule.css";

export interface AlarmModuleProps {
  entity: AlarmEntity;
  footprint?: FieldFootprint;
  /** Today, for the detail panel, and a view-only module's row. Omit to leave them without it. */
  history?: AlarmHistory;
  /**
   * Arm in a mode. Resolve (or return) false when the code was wrong; reject when the call didn't go through. May
   * answer later: the keypad waits. With Home Assistant, `createAlarmHandlers` from packages/core/src/ha/actions/alarm does all of this.
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
  // The keypad's action, while the panel asks for the code. No code: nothing to wait for on screen; the state change
  // is the answer. A disarm that's no longer needed (it disarmed from elsewhere) leaves the keypad.
  const guard = useGuardedAction<AlarmAction>({
    run: (a, code) => (a.kind === "disarm" ? onDisarm?.(code) : onArm?.(a.mode, code)),
    needsCode: (a) => needsCode(e, a),
    settled: (a) => a.kind === "disarm" && e.state === "disarmed",
    initial: defaultAction,
    disabled: ro,
  });
  const pending = guard.pending;
  const openPanel = () => { guard.close(); details.openDetails(); };
  const act = (a: AlarmAction) => {
    if (ro) return;
    void guard.attempt(a).then((result) => { if (result === "wrong_code") details.openDetails(); });
    if (needsCode(e, a)) details.openDetails();
  };
  const pick = (m: AlarmMode | "off") => act(m === "off" ? { kind: "disarm" } : { kind: "arm", mode: m });

  const to = e.armingTo ? ` ${MODE_LABEL[e.armingTo].toLowerCase()}` : "";
  const open = e.openSensors ?? [];
  // The warning in core's words: its word first (Triggered, Entry delay, Open, 2 open), so a long name truncates before
  // it does, then what set it off or what is open. The figure says ALARM, or counts down.
  const said = unav ? undefined : alarmWarning(e);
  const warning = said ? warningLine(said) : undefined;
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
  const since = sinceFact(e.lastChanged);
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    // The figure says ALARM: its lines say what set it off, if known, and since when.
    : e.state === "triggered" ? (e.triggeredBy ? [e.triggeredBy, since] : [since ?? "Triggered"])
    : e.state === "pending" ? [<Warn key="w" block>{said!.word}</Warn>, said!.detail ?? (ro ? undefined : "Disarm now")]
    : e.state === "arming" ? [word, "Leave now"]
    : said ? [<Warn key="w">{said.word}</Warn>, said.detail ?? since]
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
    <KeyGroup className="fd-al-bank" label={`${e.name} mode`} data-n={choices.length} data-where={where}>
      {choices.map((m) => (
        <Key key={m} label={m === "off" ? "Disarm" : `Arm ${MODE_LABEL[m].toLowerCase()}`} chosen={m === current} onPress={() => pick(m)} onHold={where === "m" ? details.openDetails : undefined} wide caption={MODE_LABEL[m]}>
          <IconMode mode={m} />
        </Key>
      ))}
    </KeyGroup>
  );

  const glyph = <Glyph unavailable={unav}>{shield}</Glyph>;
  const today = history && (unav ? "Unavailable" : todaySummary("armed", history.armedMinutes));
  const row = ro ? (
    <ModuleRow className="fd-al-row">
      {glyph}
      <Today summary={today} label="Armed by hour today." tone="neutral" samples={history?.samples} currentHour={history?.currentHour} />
    </ModuleRow>
  ) : steady && !unav ? (
    <ModuleRow className="fd-al-row" solo data-n={choices.length}>
      {bank("m")}
      <div className="fd-al-alt">{key(true)}</div>
    </ModuleRow>
  ) : key(true);

  return (
    <ModuleFrame
      kind="fd-al"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      // Disarmed is a reading, not a blank, so OFF keeps its places in the dim ink.
      rest={e.state === "disarmed"}
      // A row's line: the word stays whole while what set it off or what is open gives way (`Triggered · Back door`).
      warning={footprint === "compact" && said ? <WarnWords word={said.word} detail={said.detail && ` · ${said.detail}`} /> : undefined}
      line={line}
      alert={level === "alarm" ? { level, what: warning!, startedAt: e.changedAt, say: `Alarm: ${e.name} ${said!.said.charAt(0).toLowerCase()}${said!.said.slice(1)}.` }
        : level === "urgent" ? { level, what: warning!, startedAt: e.changedAt } : undefined}
      panelFocus={pending ? "content" : undefined}
      facts={pending ? undefined : {
        start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged, e.changedBy),
        end: ro ? "View only" : !e.codeFormat ? "No code" : e.codeArmRequired ?? true ? "Code to arm and disarm" : "Code to disarm",
      }}
      details={{ ...details, openDetails: openPanel }}
      pict={pict}
      read={read}
      meta={meta}
      lead={ro ? glyph : key(false)}
      row={row}
    >
      {pending ? (<>
        {/* Arming with something open: the warning stays while the code is entered, the moment it matters. */}
        {pending.kind === "arm" && open.length > 0 && (
          <p className="fd-hint fd-al-open"><Warn>{openSentence(open)}</Warn> Arming will leave {open.length > 1 ? "them" : "it"} unguarded.</p>
        )}
        <Keypad
          key={guard.pendingKey}
          prompt={`Code to ${alarmCodeFor(pending, e)}`}
          text={e.codeFormat === "text"}
          onSubmit={guard.submit}
          onCancel={guard.close}
        />
      </>) : (
        <AlarmDetails e={e} ro={ro} history={history} today={today} control={ro ? null : steady && !unav ? bank("p") : key(true)} />
      )}
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

/** The panel's content under its screen: the mode keys, or the one key through a delay; what's open; today. */
function AlarmDetails({ e, ro, history, today, control }: DetailsProps) {
  const uid = useId();
  const unav = e.state === "unavailable";
  const armedMode = ARMED_MODE[e.state];
  const open = unav ? [] : e.openSensors ?? [];
  return (
    <>
      {control && (
        <div className="fd-block">
          <Legend id={`${uid}-m`}>Mode</Legend>
          {control}
          {armedMode && <p className="fd-hint">Watches {MODE_HINT[armedMode].toLowerCase()}.</p>}
        </div>
      )}
      {open.length > 0 && (
        <p className="fd-hint fd-al-open">
          <Warn>{openSentence(open)}</Warn>
          {!ro && e.state === "disarmed" && <span> Arming will leave {open.length > 1 ? "them" : "it"} unguarded.</span>}
        </p>
      )}
      {history && <Today summary={today} label="Armed by hour today." tone="neutral" samples={history.samples} currentHour={history.currentHour} />}
    </>
  );
}
