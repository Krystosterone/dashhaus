import type { Vars } from "../../shared/ui";
import { usePress } from "@dashhaus/core/primitives";
import type { AlarmMode } from "@dashhaus/core/entities/alarm/types";
import { ARMED_LABEL, MODE_LABEL, mmss, modeChoices } from "@dashhaus/core/entities/alarm/modes";
import { ModeIcon } from "./icons";

/**
 * The mode switch: Off and each arm mode, one segment each. The current one sits on a thumb that slides
 * along a groove: the accent when armed (on), a raised button when off.
 * Labels from 260px up (six choices: from 340px, under their icons); icons only in compact cards.
 */
export function ModeSwitch({ name, modes, current, onPick }: { name: string; modes: AlarmMode[]; current: AlarmMode | "off"; onPick: (m: AlarmMode | "off") => void }) {
  const all = modeChoices(modes, current);
  const i = Math.max(0, all.indexOf(current));
  return (
    <div className="al-sw" role="group" aria-label={`${name} mode`} data-armed={current !== "off" || undefined} data-many={all.length >= 5 || undefined} data-crowd={all.length >= 6 || undefined} style={{ "--n": all.length, "--i": i } as Vars}>
      <span className="al-thumb" aria-hidden="true" />
      {all.map((m) => <Segment key={m} mode={m} current={current === m} onPick={() => { if (current !== m) onPick(m); }} />)}
    </div>
  );
}

function Segment({ mode, current, onPick }: { mode: AlarmMode | "off"; current: boolean; onPick: () => void }) {
  const press = usePress({ onPress: onPick, pressed: current });
  return (
    <button className="al-seg" aria-label={mode === "off" ? "Off: Disarm" : `Arm ${MODE_LABEL[mode].toLowerCase()}`} title={MODE_LABEL[mode]} {...press}>
      <ModeIcon mode={mode} />
      <span className="al-seg-l">{MODE_LABEL[mode]}</span>
    </button>
  );
}

/**
 * Exit delay (arming), entry delay (pending) or disarming: what's happening, the time left, and the one thing to do.
 * Without `left` (the delay's length isn't known) there's no timer and no fill: just the words and the action.
 */
export function Countdown({ kind, label, left, total, action, onAction }: { kind: "arming" | "pending" | "disarming"; label: string; left?: number; total?: number; action?: string; onAction?: () => void }) {
  const timed = left != null && total != null && total > 0;
  const done = timed ? 1 - Math.max(0, left) / total : 0;
  return (
    <div className="al-cd" data-kind={kind} data-timed={timed || undefined} role="timer" aria-live="off" style={{ "--f": done.toFixed(3) } as Vars}>
      {timed ? <span className="al-cd-fill" aria-hidden="true" /> : <span className="al-cd-wait" aria-hidden="true" />}
      <span className="al-cd-l">{label}</span>
      {timed && <span className="al-cd-t">{mmss(left)}</span>}
      {action && onAction && <button type="button" className="al-cd-b" onClick={onAction}>{action}</button>}
    </div>
  );
}

/**
 * View-only mode's slot, in place of the mode switch: what the alarm is doing, nothing to press.
 * A readout, with no container: the badge says armed. Who changed it, from M up.
 */
export function AlarmStatus({ mode, by, onOpen }: { mode: AlarmMode | "off"; by?: string; onOpen?: () => void }) {
  const armed = mode !== "off";
  const label = armed ? ARMED_LABEL[mode] : "Disarmed";
  if (onOpen) return (
    <button type="button" className="al-st al-st--open" data-armed={armed || undefined} aria-label={`${label}. Change mode`} onClick={onOpen}>
      <ModeIcon mode={mode} />
      <span className="al-st-l">{label}</span>
      <span className="al-st-s">{armed ? MODE_LABEL[mode] : label}</span>
      <span className="al-st-x">Change</span>
    </button>
  );
  return (
    <div className="al-st" data-armed={armed || undefined}>
      <ModeIcon mode={mode} />
      <span className="al-st-l">{label}</span>
      <span className="al-st-s">{armed ? MODE_LABEL[mode] : label}</span>
      {by && <span className="al-st-x">by {by}</span>}
    </div>
  );
}
