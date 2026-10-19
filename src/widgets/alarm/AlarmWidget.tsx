import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import type { AlarmEntity, AlarmHistory, AlarmMode, AlarmAction } from "./types";
import { ShieldIcon, MODE_LABEL } from "./icons";
import { ModeSwitch, Countdown, AlarmPill, AlarmStatus, Keypad } from "./parts";
import { CircleButton, IconOpen, IconClose, UnavailableSlot, TodayStrip, Sheet, fmtDuration, paint } from "../../shared/ui";
import "./AlarmWidget.css";

/** What an arm or disarm call answers: false is a wrong code; anything else is accepted. */
export type AlarmResult = boolean | void | Promise<boolean | void>;

export interface AlarmWidgetProps {
  entity: AlarmEntity;
  history?: AlarmHistory;
  variant?: "card" | "sheet";
  density?: "regular" | "thin";
  /**
   * Thin only. false: no control in the row (no pill, bar, stepper or switch); the value shows as text in
   * its place and tapping the row opens the details sheet, where every control is. The orb still switches
   * and holds as usual. Default true.
   */
  showControl?: boolean;
  /**
   * Arm in a mode. Resolve (or return) false when the code was wrong; reject when the call didn't go through.
   * May answer later: the keypad waits. With Home Assistant, `callAlarm` from ./hass does all of this.
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
  /** Card only: the arrow opens the sheet; with an action when it needs the code. */
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
 * Armed is charcoal (on, not energy); off sits on hatching. Anything that needs the code opens the
 * keypad in the sheet; the badge only shows status, so a stray tap never arms or disarms.
 * Exit and entry delays count down in the slot; a triggered alarm is the one warn-filled pill.
 */
export function AlarmWidget({ entity: e, history, variant = "card", density = "regular", showControl = true, onArm, onDisarm, readOnly, onOpenDetails, onClose, action }: AlarmWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const thin = !sheet && density === "thin";
  const bare = thin && !showControl;
  const unav = e.state === "unavailable";
  const armedMode = ARMED[e.state];
  const alert = e.state === "pending" || e.state === "triggered";
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
  // Arming to an unknown mode (HA's core entity doesn't say) reads as plain "Arming".
  const to = e.armingTo ? ` ${MODE_LABEL[e.armingTo].toLowerCase()}` : "";
  const status: ReactNode = unav ? "Not responding"
    : e.state === "triggered" ? <span className="hd-warn">Triggered{e.triggeredBy ? ` by ${e.triggeredBy}` : ""}</span>
    : e.state === "pending" ? <span className="hd-warn">{e.triggeredBy ? `${e.triggeredBy} opened` : "Entry delay"}</span>
    : e.state === "arming" ? `Arming${to} · leave now`
    : e.state === "disarming" ? "Disarming…"
    : armedMode ? `${MODE_LABEL[armedMode]}${e.lastChanged ? ` since ${e.lastChanged}` : ""}`
    : openText ? <span className="hd-warn">{openText}</span>
    : e.area ?? "Disarmed";
  const word = unav ? "Unavailable" : e.state === "triggered" ? "Alarm" : e.state === "pending" ? (ro ? "Entry delay" : "Disarm now") : e.state === "arming" ? "Arming" : e.state === "disarming" ? "Disarming" : armedMode ? MODE_LABEL[armedMode] : "Off";

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
    : <ModeSwitch name={e.name} modes={e.modes} current={armedMode ?? "off"} onPick={pick} />;

  const promptFor = (a: AlarmAction) => (a.kind === "disarm" ? `Enter the code to ${e.state === "arming" ? "cancel arming" : "disarm"}` : `Enter the code to arm ${MODE_LABEL[a.mode].toLowerCase()}`);

  // The value in words: under the name in narrow thin rows, and in place of the control when it's hidden.
  const subText = word;
  return (
    <article
      className={`hd al${sheet ? " hd--sheet" : ""}${thin ? " hd--thin" : ""}`} data-control={bare ? "off" : undefined}
      data-state={e.state} data-armed={armedMode || e.state === "arming" || e.state === "disarming" ? "" : undefined} data-alert={alert || undefined}
      {...colors} aria-labelledby={`${uid}-n`}
    >
      <header className="hd-head">
        <span className="hd-orb hd-orb--static" aria-hidden="true" aria-disabled={unav || undefined}>
          <span className="hd-orb-i"><ShieldIcon kind={unav ? "unavailable" : alert ? "alert" : armedMode || e.state === "arming" || e.state === "disarming" ? "armed" : "off"} /></span>
        </span>
        <div className="hd-title">
          <h2 className="hd-name" id={`${uid}-n`} title={e.name}>{e.name}</h2>
          <p className="hd-area">{status}</p>
          {thin && <p className="hd-sub">{subText}</p>}
        </div>
        <p className="hd-num" aria-hidden="true">{word}</p>
        {sheet
          ? <CircleButton label={`Close ${e.name}`} onClick={onClose} autoFocus={!pending}><IconClose /></CircleButton>
          : onOpenDetails && <CircleButton label={`${e.name} details`} onClick={() => onOpenDetails()}><IconOpen /></CircleButton>}
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
          summary={unav ? `Unreachable since ${e.lastSeen ?? "earlier"}` : history.armedMinutes > 0 ? `Armed ${fmtDuration(history.armedMinutes)}` : "Not armed today"}
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

export interface AlarmSheetProps extends Omit<AlarmWidgetProps, "variant" | "density" | "onOpenDetails" | "onClose"> {
  open: boolean;
  onClose: () => void;
}

export function AlarmSheet({ open, onClose, ...props }: AlarmSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} label={`${props.entity.name} details`}>
      <AlarmWidget {...props} variant="sheet" onClose={onClose} />
    </Sheet>
  );
}
