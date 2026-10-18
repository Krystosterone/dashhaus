import { useId } from "react";
import type { ToggleEntity, ToggleHistory, DurationOption } from "./types";
import { TONES, ToggleIconSvg } from "./icons";
import { Orb, CircleButton, IconOpen, IconClose, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, Sheet, fmtDuration } from "../../shared/ui";
import type { Vars } from "../../shared/ui";
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
  density?: "regular" | "thin";
  /** Sheet: ways to turn it on. Omit `onTurnOnFor` to hide them. */
  durations?: DurationOption[];
  onToggle: () => void;
  /** Sheet: turn on (or keep on) with one of `durations`. */
  onTurnOnFor?: (value: string) => void;
  /** Card only: the arrow, and press and hold on the orb, open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
}

/**
 * A mode you switch on and off: Do Not Disturb, Quiet, Guest. One input_boolean or switch.
 * The orb and the pill both toggle; the pill is hatched when off and filled with the mode's tone when on,
 * and says when it ends. The sheet turns it on for a while. Same sizes and fixed heights as every widget.
 */
export function ToggleWidget({ entity: e, history, variant = "card", density = "regular", durations = DEFAULT_DURATIONS, onToggle, onTurnOnFor, onOpenDetails, onClose }: ToggleWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const thin = !sheet && density === "thin";
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const tone = TONES[e.tone ?? "butter"];
  const style = { "--accent-c": tone.c, "--accent-h": tone.h, "--hd-glow": on ? 0.55 : 0 } as Vars;

  const ends = on ? (e.until ? `Until ${e.until}` : e.lastChanged ? `Since ${e.lastChanged}` : "On") : null;
  // Where it applies; when it ends takes its place at S and in thin rows, where the pill has no room to say so.
  const status = unav ? "Not responding" : on && e.until
    ? <><span className="tw-st-u">{ends}</span><span className="tw-st-a">{e.area ?? "On"}</span></>
    : e.area ?? (on ? "On" : "Off");
  const valueText = unav ? "Unavailable" : on ? (e.until ? `On until ${e.until}` : "On") : "Off";

  return (
    <article className={`hd tw${sheet ? " hd--sheet" : ""}${thin ? " hd--thin" : ""}`} data-state={e.state} style={style} aria-labelledby={`${uid}-n`}>
      <header className="hd-head">
        <Orb label={e.name} pressed={on} unavailable={unav} intensity={0.7} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          <ToggleIconSvg icon={e.icon} />
        </Orb>
        <div className="hd-title">
          <h2 className="hd-name" id={`${uid}-n`} title={e.name}>{e.name}</h2>
          <p className="hd-area">{sheet && e.area ? `${e.area}${on && e.until ? ` · Until ${e.until}` : ""}` : status}</p>
          {thin && <p className="hd-sub" aria-hidden="true">{valueText}</p>}
        </div>
        <p className="hd-num" aria-hidden="true">{unav ? null : on ? "On" : "Off"}</p>
        {sheet
          ? <CircleButton label={`Close ${e.name}`} onClick={onClose} autoFocus><IconClose /></CircleButton>
          : onOpenDetails && <CircleButton label={`${e.name} details`} onClick={onOpenDetails}><IconOpen /></CircleButton>}
      </header>

      <div className="hd-slot">
        {unav
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
