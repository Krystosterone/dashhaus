import type { AlarmEntity, AlarmHistory, AlarmMode, AlarmAction, AlarmResult } from "@dashhaus/core/entities/alarm/types";
import { ARMED_MODE, MODE_LABEL, needsCode as codeFor } from "@dashhaus/core/entities/alarm/modes";
import { alarmSeverity } from "@dashhaus/core/entities/alarm/severity";
import { alarmWarning, openSentence, warningLine } from "@dashhaus/core/entities/alarm/words";
import { useDelayLeft } from "@dashhaus/core/hooks";
import { useGuardedAction } from "@dashhaus/core/primitives";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { ShieldIcon } from "./icons";
import { ModeSwitch, Countdown, AlarmStatus } from "./parts";
import { AlarmPill, AlertStatus, CardFrame, Keypad, SheetBlock, Today, detailsSheet, paint, useCard } from "../../shared/ui";
import type { ActionCardProps, SheetProps } from "../../shared/ui";
import "./AlarmCard.css";

export type { AlarmResult };

export interface AlarmCardProps extends ActionCardProps<AlarmAction> {
  entity: AlarmEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: AlarmHistory;
  /**
   * Compact only. false removes the inline control, shows the value in its place, and makes the row open
   * the detail sheet. Default true.
   */
  showControl?: boolean;
  /**
   * Arm in a mode. Resolve (or return) false when the code was wrong; reject when the call didn't go through.
   * May answer later: the keypad waits. With Home Assistant, `createAlarmHandlers` from packages/core/src/ha/actions/alarm does all of this.
   */
  onArm?: (mode: AlarmMode, code?: string) => AlarmResult;
  /** Disarm (also cancels arming and silences a triggered alarm). Same contract as onArm. */
  onDisarm?: (code?: string) => AlarmResult;
  /**
   * View only: show the alarm's state, countdowns and history, with nothing to arm, disarm or type a code into.
   * For panels Home Assistant can read but not control (a Ring Alarm without a subscription, say).
   * Default: on when neither onArm nor onDisarm is given.
   */
  readOnly?: boolean;
}

/**
 * A security alarm (one alarm_control_panel). The slot is the mode switch: Off, Home, Away, Night.
 * Armed is the accent, on the badge and the switch's thumb. Anything that needs the code opens the
 * keypad in the sheet; the badge only shows status, so a stray tap never arms or disarms.
 * Exit and entry delays count down in the slot; a triggered alarm is the one warn-filled pill.
 */
export function AlarmCard({ entity: e, history, variant, footprint, showControl, onArm, onDisarm, readOnly, onOpenDetails, onClose, action }: AlarmCardProps) {
  const card = useCard("al", { variant, footprint, showControl, area: e.area });
  const { sheet, area } = card;
  const unav = e.state === "unavailable";
  const armedMode = ARMED_MODE[e.state];
  // Core ranks it (triggered is the alarm, the entry delay urgent, open doors while disarmed advisory) and says it;
  // the card draws the level it is given.
  const level = unav ? undefined : alarmSeverity(e);
  const warning = unav ? undefined : alarmWarning(e);
  const urgentState = level === "alarm" || level === "urgent";
  const moving = e.state === "arming" || e.state === "pending" || e.state === "disarming";
  const colors = paint("state", 0);
  // View only: everything that arms, disarms or asks for the code is left out.
  const ro = readOnly ?? (!onArm && !onDisarm);
  // Home Assistant asks for the code to arm too unless the integration says otherwise.
  const codeToArm = !!e.codeFormat && (e.codeArmRequired ?? true);
  const left = useDelayLeft(e.delay, e.changedAt, moving);

  // The keypad (sheet only), for an action that needs the code. No code: nothing to wait for on screen; the state
  // change is the answer.
  const guard = useGuardedAction<AlarmAction>({
    run: (a, code) => (a.kind === "disarm" ? onDisarm?.(code) : onArm?.(a.mode, code)),
    needsCode: (a) => codeFor(e, a),
    settled: (a) => a.kind === "disarm" && e.state === "disarmed",
    initial: action,
    disabled: ro,
    askElsewhere: sheet ? undefined : (a) => onOpenDetails?.(a),
  });
  const pending = guard.pending;
  const act = (a: AlarmAction) => { void guard.attempt(a); };
  const pick = (m: AlarmMode | "off") => act(m === "off" ? { kind: "disarm" } : { kind: "arm", mode: m });

  const open = e.openSensors ?? [];
  const warningText = warning ? warningLine(warning) : null;
  const alertLabel = warning ? `${level === "alarm" ? "Alert" : "Warning"}: ${e.name}: ${warning.said}` : null;
  // Arming to an unknown mode (HA's core entity doesn't say) reads as plain "Arming".
  const to = e.armingTo ? ` ${MODE_LABEL[e.armingTo].toLowerCase()}` : "";
  // An alarm fills the slot, so its status line keeps plain words; urgent and advisory lead it behind the marker,
  // the warning's word first and the sensor after it (spec/orb.md → the warn colour).
  const status = level === "alarm" ? warningText
    : warning ? <><AlertStatus label={alertLabel!}>{warning.word}</AlertStatus>{warning.detail && ` · ${warning.detail}`}</>
    : unav ? area ?? "Unavailable"
    : e.state === "arming" ? `Arming${to} · leave now`
    : e.state === "disarming" ? "Disarming…"
    : armedMode ? `${MODE_LABEL[armedMode]}${e.lastChanged ? ` since ${e.lastChanged}` : ""}`
    : area ?? "Disarmed";
  const word = unav ? "Unavailable" : e.state === "triggered" ? "Alarm" : e.state === "pending" ? (ro ? "Entry delay" : "Disarm now") : e.state === "arming" ? "Arming" : e.state === "disarming" ? "Disarming" : armedMode ? MODE_LABEL[armedMode] : "Disarmed";

  let slot;
  if (e.state === "pending") slot = ro
    ? <Countdown kind="pending" label={left == null ? "Entry delay…" : "Entry delay"} left={left} total={e.delay} />
    : <Countdown kind="pending" label={left == null ? "Entry delay · disarm now" : "Disarm now"} left={left} total={e.delay} action="Disarm" onAction={() => act({ kind: "disarm" })} />;
  else if (e.state === "arming") slot = <Countdown kind="arming" label={left == null ? `Arming${to}…` : `Arming${to}`} left={left} total={e.delay} action={ro ? undefined : "Cancel"} onAction={ro ? undefined : () => act({ kind: "disarm" })} />;
  else if (e.state === "disarming") slot = <Countdown kind="disarming" label="Disarming…" left={left} total={e.delay} />;
  else slot = ro
    ? <AlarmStatus mode={armedMode ?? "off"} by={e.changedBy} />
    : <>
        <ModeSwitch name={e.name} modes={e.modes} current={armedMode ?? "off"} onPick={pick} />
        {!sheet && onOpenDetails && <AlarmStatus mode={armedMode ?? "off"} onOpen={() => onOpenDetails()} />}
      </>;

  const promptFor = (a: AlarmAction) => (a.kind === "disarm" ? `Enter the code to ${e.state === "arming" ? "cancel arming" : "disarm"}` : `Enter the code to arm ${MODE_LABEL[a.mode].toLowerCase()}`);

  // The compact value appears under the name, or in place of a hidden control.
  const subText = warningText ?? word;
  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, "data-armed": armedMode || e.state === "arming" || e.state === "disarming" ? "" : undefined, "data-alert": level === "alarm" ? "alarm" : level ? "warn" : undefined, ...colors }}
      glyph={<ShieldIcon kind={unav ? "unavailable" : urgentState ? "alert" : armedMode || e.state === "arming" || e.state === "disarming" ? "armed" : "off"} />}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails && (() => onOpenDetails())}
      status={status}
      value={subText}
      alert={alertLabel}
      readout={{ value: word, duplicate: true }}
      onClose={onClose}
      closeFocus={!pending}
      control={slot}
      // Triggered: the shared alarm pill, its alert and what set it off, since when where nothing can be pressed, and Disarm.
      urgent={level === "alarm" ? (
        <AlarmPill
          alert="Alarm"
          more={e.triggeredBy}
          value={ro ? sinceFact(e.lastChanged) : undefined}
          action={ro ? undefined : <button type="button" className="al-cd-b al-alarm-b" onClick={() => act({ kind: "disarm" })}>Disarm</button>}
        />
      ) : undefined}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged, e.changedBy), end: ro ? "View only" : !e.codeFormat ? "No code" : codeToArm ? "Code to arm and disarm" : "Code to disarm" }}
    >
      {!unav && (
        <SheetBlock>
          {open.length > 0 && (!pending || pending.kind === "arm") && (
            <p className="hd-note"><span className="hd-warn">{openSentence(open)}</span>{ro ? null : <> Arming will leave {open.length > 1 ? "them" : "it"} unguarded.</>}</p>
          )}
          {pending && (
            <Keypad key={guard.pendingKey} prompt={promptFor(pending)} text={e.codeFormat === "text"} onSubmit={guard.submit} onCancel={guard.close} />
          )}
        </SheetBlock>
      )}
      {history && !pending && <Today samples={history.samples} currentHour={history.currentHour} summary={todaySummary("armed", history.armedMinutes)} />}
    </CardFrame>
  );
}

export type AlarmSheetProps = SheetProps<AlarmCardProps>;

export const AlarmSheet = detailsSheet(AlarmCard);
