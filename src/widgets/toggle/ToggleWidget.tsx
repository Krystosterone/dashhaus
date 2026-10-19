import { useId } from "react";
import type { KeyboardEvent } from "react";
import { useLongPress } from "../../shared/useLongPress";
import type { ToggleEntity, ToggleHistory, DurationOption } from "./types";
import { ToggleIconSvg } from "./icons";
import { Orb, CircleButton, IconOpen, IconClose, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, Sheet, fmtDuration, paint } from "../../shared/ui";
import type { ColorProp } from "../../shared/ui";
import "./ToggleWidget.css";

/** Default ways to turn a mode on: for a while, until morning, or until turned off. */
export const DEFAULT_DURATIONS: DurationOption[] = [
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
  { value: "morning", label: "Morning", sub: "07:00" },
  { value: "manual", label: "Until off", sub: "No end" },
];

export interface ToggleWidgetProps {
  entity: ToggleEntity;
  /** Shown at L size and in the sheet. */
  history?: ToggleHistory;
  variant?: "card" | "sheet";
  /** "mini": a 64px tile that is itself the switch, for grids of modes. */
  density?: "regular" | "thin" | "mini";
  /**
   * Thin only. false: no control in the row (no pill, bar, stepper or switch); the value shows as text in
   * its place and tapping the row opens the details sheet, where every control is. The orb still switches
   * and holds as usual. Default true.
   */
  showControl?: boolean;
  /** Sheet: ways to turn it on. Omit `onTurnOnFor` to hide them. */
  durations?: DurationOption[];
  onToggle: () => void;
  /** Sheet: turn on (or keep on) with one of `durations`. */
  onTurnOnFor?: (value: string) => void;
  /** Card only: the arrow, and press and hold on the orb, open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
  /** The orb's colour. Default: the entity's `color`, else none (on is charcoal). */
  color?: ColorProp;
}

/**
 * A mode you switch on and off: Do Not Disturb, Quiet, Guest. One input_boolean or switch.
 * The orb and the pill both toggle; the pill is hatched when off and filled with the mode's tone when on,
 * and says when it ends. The sheet turns it on for a while. Same sizes and fixed heights as every widget.
 */
export function ToggleWidget(props: ToggleWidgetProps) {
  if (props.density === "mini" && props.variant !== "sheet") return <MiniToggle {...props} />;
  return <ToggleCard {...props} />;
}

/**
 * Mini: a 64px tile that is itself the switch, like a control-centre tile. Tap anywhere to switch;
 * on is charcoal (the house colour for "on" that isn't energy), with the colour slot on the disc if one is set.
 * Press and hold, the arrow (from 220px wide), or Shift+F10 / the context-menu key open the details sheet.
 */
function MiniToggle({ entity: e, onToggle, onOpenDetails, color }: ToggleWidgetProps) {
  const uid = useId();
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const colors = paint("state", 0, null, color ?? e.color);
  const lp = useLongPress(onOpenDetails);
  const state = unav ? "Unavailable" : on ? (e.until ? `On · until ${e.until}` : "On") : "Off";
  const onKeyDown = (ev: KeyboardEvent) => {
    if (onOpenDetails && (ev.key === "ContextMenu" || (ev.shiftKey && ev.key === "F10"))) { ev.preventDefault(); onOpenDetails(); }
  };
  return (
    <article className="hd tw hd--mini" data-state={e.state} {...colors} aria-labelledby={`${uid}-n`}>
      <button
        type="button" className="tw-mini" aria-pressed={on} aria-disabled={unav || undefined} aria-describedby={`${uid}-s`}
        data-holding={lp.holding || undefined}
        {...lp.handlers}
        onKeyDown={onKeyDown}
        onClick={() => { if (lp.consumeLongPress()) return; if (!unav) onToggle(); }}
      >
        <span className="tw-mini-o" aria-hidden="true"><ToggleIconSvg icon={e.icon} /></span>
        <span className="tw-mini-t">
          <span className="tw-mini-n" id={`${uid}-n`} title={e.name}>{e.name}</span>
          <span className="tw-mini-s" id={`${uid}-s`}>{state}</span>
        </span>
      </button>
      {onOpenDetails && <CircleButton label={`${e.name} details`} onClick={onOpenDetails}><IconOpen /></CircleButton>}
    </article>
  );
}

function ToggleCard({ entity: e, history, variant = "card", density = "regular", showControl = true, durations = DEFAULT_DURATIONS, onToggle, onTurnOnFor, onOpenDetails, onClose, color }: ToggleWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const thin = !sheet && density === "thin";
  const bare = thin && !showControl;
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // A mode is a state, not energy: on is charcoal and there is no glow. A colour only if one was chosen.
  const colors = paint("state", 0, null, color ?? e.color);

  const ends = on ? (e.until ? `Until ${e.until}` : e.lastChanged ? `Since ${e.lastChanged}` : "On") : null;
  // Where it applies; when it ends takes its place at S and in thin rows, where the pill has no room to say so.
  const status = unav ? "Not responding" : on && e.until
    ? <><span className="tw-st-u">{ends}</span><span className="tw-st-a">{e.area ?? "On"}</span></>
    : e.area ?? (on ? "On" : "Off");
  const valueText = unav ? "Unavailable" : on ? (e.until ? `On until ${e.until}` : "On") : "Off";

  // The value in words: under the name in narrow thin rows, and in place of the control when it's hidden.
  const subText = valueText;
  // In place of the control the status line already says until when: just on or off.
  const valText = unav ? "Unavailable" : on ? "On" : "Off";
  return (
    <article className={`hd tw${sheet ? " hd--sheet" : ""}${thin ? " hd--thin" : ""}`} data-control={bare ? "off" : undefined} data-state={e.state} {...colors} aria-labelledby={`${uid}-n`}>
      <header className="hd-head">
        <Orb label={e.name} pressed={on} unavailable={unav} intensity={0.7} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          <ToggleIconSvg icon={e.icon} />
        </Orb>
        <div className="hd-title">
          <h2 className="hd-name" id={`${uid}-n`} title={e.name}>{e.name}</h2>
          <p className="hd-area">{sheet && e.area ? `${e.area}${on && e.until ? ` · Until ${e.until}` : ""}` : status}</p>
          {thin && <p className="hd-sub">{subText}</p>}
        </div>
        <p className="hd-num" aria-hidden="true">{unav ? null : on ? "On" : "Off"}</p>
        {sheet
          ? <CircleButton label={`Close ${e.name}`} onClick={onClose} autoFocus><IconClose /></CircleButton>
          : onOpenDetails && <CircleButton label={`${e.name} details`} onClick={onOpenDetails}><IconOpen /></CircleButton>}
      </header>

      <div className="hd-slot">
        {bare ? <p className="hd-val">{valText}</p> : unav
          ? <UnavailableSlot lastSeen={e.lastSeen} />
          : <TogglePill label={on ? `Turn off ${e.name}` : `Turn on ${e.name}`} on={on} onToggle={onToggle} extra={on ? ends : "Turn on"}>{on ? "On" : "Off"}</TogglePill>}
      </div>

      {sheet && !unav && (
        <div className="hd-extra">
          {e.description && <p className="tw-desc">{e.description}</p>}
          {onTurnOnFor && durations.length > 0 && (
            <ChoiceChips id={`${uid}-d`} label={on ? "Keep on" : "Turn on for"} options={durations} value={on ? e.duration ?? null : null} onChange={onTurnOnFor} />
          )}
        </div>
      )}

      {history && (
        <TodayStrip
          samples={history.samples}
          currentHour={history.currentHour}
          summary={unav ? `Unreachable since ${e.lastSeen ?? "earlier"}` : history.onMinutes > 0 ? `On ${fmtDuration(history.onMinutes)}` : "Not on today"}
        />
      )}

      {sheet && (
        <p className="hd-info">
          <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : e.lastChanged ? `Last changed ${e.lastChanged}` : ""}</span>
          <span>{e.area && unav ? e.area : ""}</span>
        </p>
      )}
    </article>
  );
}

export interface ToggleSheetProps extends Omit<ToggleWidgetProps, "variant" | "density" | "onOpenDetails" | "onClose"> {
  open: boolean;
  onClose: () => void;
}

export function ToggleSheet({ open, onClose, ...props }: ToggleSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} label={`${props.entity.name} details`}>
      <ToggleWidget {...props} variant="sheet" onClose={onClose} />
    </Sheet>
  );
}
