import { useId } from "react";
import type { ToggleEntity, ToggleHistory, DurationOption } from "./types";
import { ToggleIconSvg } from "./icons";
import { Orb, CardTitle, CircleButton, IconClose, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, Sheet, fmtDuration, paint } from "../../shared/ui";
import type { ColorProp, WidgetFootprint } from "../../shared/ui";
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
  /** Shown in the featured footprint and in the sheet. */
  history?: ToggleHistory;
  variant?: "card" | "sheet";
  /** Shared card footprint. */
  footprint?: WidgetFootprint;
  /**
   * Compact only. false removes the inline control, shows the value in its place, and makes the row open
   * the detail sheet. The orb keeps its tap and hold actions. Default true.
   */
  showControl?: boolean;
  /** Sheet: ways to turn it on. Omit `onTurnOnFor` to hide them. */
  durations?: DurationOption[];
  onToggle: () => void;
  /** Sheet: turn on (or keep on) with one of `durations`. */
  onTurnOnFor?: (value: string) => void;
  /** Card only: the name, and press and hold on the orb, open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
  /** Opt-in colour for the orb. Default: the entity's `color`, else none (on is the accent). */
  color?: ColorProp;
}

/**
 * A mode you switch on and off: Do Not Disturb, Quiet, Guest. One input_boolean or switch.
 * It uses the same card anatomy and footprint matrix as every other widget.
 */
export function ToggleWidget({ entity: e, history, variant = "card", footprint = "standard", showControl = true, durations = DEFAULT_DURATIONS, onToggle, onTurnOnFor, onOpenDetails, onClose, color }: ToggleWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const compact = !sheet && footprint === "compact";
  const featured = !sheet && footprint === "featured";
  const bare = compact && !showControl;
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // A mode is a state, not energy: on is the accent, with no bloom and no glow. A colour only if one was chosen.
  const colors = paint("state", 0, null, color ?? e.color);

  const ends = on ? (e.until ? `Until ${e.until}` : e.lastChanged ? `Since ${e.lastChanged}` : "On") : null;
  // Where it applies; when it ends takes its place in compact cards, where the pill has no room to say so.
  // On and Off are the control's words: the status line never repeats them.
  const status = on && e.until && !unav
    ? <><span className="tw-st-u">{ends}</span><span className="tw-st-a">{e.area}</span></>
    : e.area;
  const valueText = unav ? "Unavailable" : on ? (e.until ? `On until ${e.until}` : "On") : "Off";

  // The compact value appears under the name, or in place of a hidden control.
  const subText = valueText;
  // The status line already says until when: the replacement value can stay short.
  const valText = unav ? "Unavailable" : on ? "On" : "Off";
  return (
    <article className={`hd tw${sheet ? " hd--sheet" : ""}${compact ? " hd--compact" : ""}${featured ? " hd--featured" : ""}`} data-control={bare ? "off" : undefined} data-state={e.state} {...colors} aria-labelledby={`${uid}-n`}>
      <header className="hd-head">
        <Orb label={e.name} pressed={on} unavailable={unav} intensity={0.7} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          <ToggleIconSvg icon={e.icon} />
        </Orb>
        <CardTitle id={`${uid}-n`} name={e.name} onOpen={sheet ? undefined : onOpenDetails}>
          <p className="hd-area">{sheet && e.area ? `${e.area}${on && e.until ? ` · Until ${e.until}` : ""}` : status}</p>
          {compact && <p className="hd-sub">{subText}</p>}
        </CardTitle>
        <p className="hd-num" aria-hidden="true">{unav ? null : on ? "On" : "Off"}</p>
        {sheet && <CircleButton
          label={`Close ${e.name}`}
          onClick={onClose}
          // Focus lands on the sheet's close button when it opens: dialog focus management, not page-load focus theft.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        ><IconClose /></CircleButton>}
      </header>

      <div className="hd-slot">
        {bare ? <p className="hd-val">{valText}</p> : unav
          ? <UnavailableSlot lastSeen={e.lastSeen} />
          : <TogglePill label={`${e.name}: ${on ? "On" : "Off"} · ${on ? ends : "Turn on"}`} on={on} onToggle={onToggle} extra={on ? ends : "Turn on"}>{on ? "On" : "Off"}</TogglePill>}
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
          summary={unav ? `Unavailable since ${e.lastSeen ?? "earlier"}` : history.onMinutes > 0 ? `On ${fmtDuration(history.onMinutes)}` : "Not on today"}
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

export interface ToggleSheetProps extends Omit<ToggleWidgetProps, "variant" | "footprint" | "onOpenDetails" | "onClose"> {
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
