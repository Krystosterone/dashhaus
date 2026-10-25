import { useEffect, useState } from "react";
import type { AlarmEntity, AlarmHistory, AlarmMode, AlarmAction } from "../../domains/alarm/types";
import { ShieldIcon, MODE_LABEL } from "./icons";
import { ModeSwitch, Countdown, AlarmPill, AlarmStatus, Keypad } from "./parts";
import { AlertStatus, CardTitle, UnavailableSlot, TodayStrip, fmtDuration, paint, SheetClose, useCard, detailsSheet } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./AlarmWidget.css";

/** What an arm or disarm call answers: false is a wrong code; anything else is accepted. */
export type AlarmResult = boolean | void | Promise<boolean | void>;

export interface AlarmWidgetProps extends CardProps {
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
   * May answer later: the keypad waits. With Home Assistant, `createAlarmHandlers` from src/ha/actions/alarm does all of this.
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
  /** Card only: the name opens the sheet; with an action when it needs the code. */
  onOpenDetails?: (action?: AlarmAction) => void;
  onClose?: () => void;
  /** Sheet only: start with the keypad for this action. */
  action?: AlarmAction;
}

const ARMED: Partial<Record<AlarmEntity["state"], AlarmMode>> = { armed_home: "home", armed_away: "away", armed_night: "night", armed_vacation: "vacation", armed_custom_bypass: "custom_bypass" };

/** Seconds left in the current delay, ticking each second; undefined when there's no way to know. */
function useDelayLeft(delay: number | undefined, since: number | undefined, active: boolean) {
  const timed = active && delay != null && delay > 0 && since != null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timed) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    const wake = () => setNow(Date.now());
    document.addEventListener("visibilitychange", wake);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", wake); };
  }, [timed, since]);
  if (!timed) return undefined;
  return Math.max(0, Math.ceil(delay - (now - since) / 1000));
}

/**
 * A security alarm (one alarm_control_panel). The slot is the mode switch: Off, Home, Away, Night.
 * Armed is the accent, on the badge and the switch's thumb. Anything that needs the code opens the
 * keypad in the sheet; the badge only shows status, so a stray tap never arms or disarms.
 * Exit and entry delays count down in the slot; a triggered alarm is the one warn-filled pill.
 */
export function AlarmWidget({ entity: e, history, variant, footprint, showControl, onArm, onDisarm, readOnly, onOpenDetails, onClose, action }: AlarmWidgetProps) {
  const { nameId, sheet, compact, bare, article, area } = useCard("al", { variant, footprint, showControl, area: e.area });
  const unav = e.state === "unavailable";
  const armedMode = ARMED[e.state];
  const urgentState = e.state === "pending" || e.state === "triggered";
  const moving = e.state === "arming" || e.state === "pending" || e.state === "disarming";
  const colors = paint("state", 0, null, "none");
  // View only: everything that arms, disarms or asks for the code is left out.
  const ro = readOnly ?? (!onArm && !onDisarm);
  // Home Assistant asks for the code to arm too unless the integration says otherwise.
  const codeToArm = !!e.codeFormat && (e.codeArmRequired ?? true);
  const left = useDelayLeft(e.delay, e.changedAt, moving);

  // The keypad (sheet only), for an action that needs the code.
  const [pending, setPending] = useState<AlarmAction | null>(ro ? null : action ?? null);
  useEffect(() => { setPending(ro ? null : action ?? null); }, [action, ro]);
  useEffect(() => { if (!sheet) return; if (e.state === "disarmed" && pending?.kind === "disarm") setPending(null); }, [e.state, sheet, pending]);

  const needsCode = (a: AlarmAction) => (a.kind === "disarm" ? !!e.codeFormat : codeToArm);
  const run = async (a: AlarmAction, code?: string) => (await (a.kind === "disarm" ? onDisarm?.(code) : onArm?.(a.mode, code))) !== false;
  const act = (a: AlarmAction) => {
    if (ro) return;
    // No code: nothing to wait for on screen; the state change is the answer.
    if (!needsCode(a)) { run(a).catch(() => undefined); return; }
    if (sheet) setPending(a);
    else onOpenDetails?.(a);
  };
  const pick = (m: AlarmMode | "off") => act(m === "off" ? { kind: "disarm" } : { kind: "arm", mode: m });

  const open = e.openSensors ?? [];
  const openText = open.length ? `${open[0]} open${open.length > 1 ? ` +${open.length - 1}` : ""}` : null;
  const warningText = unav ? null
    : e.state === "triggered" ? `Triggered${e.triggeredBy ? ` by ${e.triggeredBy}` : ""}`
    : e.state === "pending" ? (e.triggeredBy ? `${e.triggeredBy} opened` : "Entry delay")
    : e.state === "disarmed" ? openText
    : null;
  const alertLabel = warningText ? `Warning: ${e.name}: ${warningText}` : null;
  // Arming to an unknown mode (HA's core entity doesn't say) reads as plain "Arming".
  const to = e.armingTo ? ` ${MODE_LABEL[e.armingTo].toLowerCase()}` : "";
  const status = alertLabel ? <AlertStatus label={alertLabel}>{warningText}</AlertStatus>
    : unav ? area ?? "Unavailable"
    : e.state === "arming" ? `Arming${to} · leave now`
    : e.state === "disarming" ? "Disarming…"
    : armedMode ? `${MODE_LABEL[armedMode]}${e.lastChanged ? ` since ${e.lastChanged}` : ""}`
    : area ?? "Disarmed";
  const word = unav ? "Unavailable" : e.state === "triggered" ? "Alarm" : e.state === "pending" ? (ro ? "Entry delay" : "Disarm now") : e.state === "arming" ? "Arming" : e.state === "disarming" ? "Disarming" : armedMode ? MODE_LABEL[armedMode] : "Disarmed";

  let slot;
  if (unav) slot = <UnavailableSlot lastSeen={e.lastSeen} />;
  else if (e.state === "triggered") slot = <AlarmPill cause={e.triggeredBy} onDisarm={ro ? undefined : () => act({ kind: "disarm" })} />;
  else if (e.state === "pending") slot = ro
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
    <article
      {...article}
      data-state={e.state} data-armed={armedMode || e.state === "arming" || e.state === "disarming" ? "" : undefined} data-alert={alertLabel ? "warn" : undefined}
      {...colors}
    >
      <header className="hd-head">
        <span className="hd-orb hd-orb--static" aria-hidden="true" aria-disabled={unav || undefined}>
          <span className="hd-orb-i"><ShieldIcon kind={unav ? "unavailable" : urgentState ? "alert" : armedMode || e.state === "arming" || e.state === "disarming" ? "armed" : "off"} /></span>
        </span>
        <CardTitle id={nameId} name={e.name} onOpen={sheet || !onOpenDetails ? undefined : () => onOpenDetails()}>
          <p className="hd-area">{status}</p>
          {compact && <p className="hd-sub">{alertLabel ? <AlertStatus label={alertLabel}>{subText}</AlertStatus> : subText}</p>}
        </CardTitle>
        <p className="hd-num hd-num--control-duplicate" aria-hidden="true">{word}</p>
        {sheet && <SheetClose label={`Close ${e.name}`} onClick={onClose} focusOnOpen={!pending} />}
      </header>

      <div className="hd-slot">{bare ? <p className="hd-val">{subText}</p> : slot}</div>

      {sheet && !unav && (pending || open.length > 0) && (
        <div className="hd-extra">
          {open.length > 0 && !pending && (
            <p className="al-open"><span className="hd-warn">{listOf(open)} {open.length > 1 ? "are" : "is"} open.</span>{ro ? null : <> Arming will leave {open.length > 1 ? "them" : "it"} unguarded.</>}</p>
          )}
          {pending && (
            <Keypad key={JSON.stringify(pending)} prompt={promptFor(pending)} text={e.codeFormat === "text"}
              onSubmit={async (code) => { const ok = await run(pending, code); if (ok) setPending(null); return ok; }}
              onCancel={() => setPending(null)} />
          )}
        </div>
      )}

      {history && !pending && (
        <TodayStrip
          samples={history.samples}
          currentHour={history.currentHour}
          summary={unav ? `Unavailable since ${e.lastSeen ?? "earlier"}` : history.armedMinutes > 0 ? `Armed ${fmtDuration(history.armedMinutes)}` : "Not armed today"}
        />
      )}

      {sheet && (
        <p className="hd-info">
          <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : e.lastChanged ? `${e.changedBy ? `${e.changedBy}, ` : ""}${e.lastChanged}` : ""}</span>
          <span>{ro ? "View only" : !e.codeFormat ? "No code" : codeToArm ? "Code to arm and disarm" : "Code to disarm"}</span>
        </p>
      )}
    </article>
  );
}

const listOf = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export type AlarmSheetProps = SheetProps<AlarmWidgetProps>;

export const AlarmSheet = detailsSheet(AlarmWidget);
