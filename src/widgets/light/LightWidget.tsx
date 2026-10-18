import { useId } from "react";
import type { LightEntity, LightHistory } from "./types";
import { kelvinToLch, K_DEFAULT, K_MIN, K_MAX } from "./kelvin";
import { Orb, CircleButton, IconOpen, IconClose, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, Sheet, fmtDuration } from "../../shared/ui";
import type { Vars } from "../../shared/ui";
import { IconBulb, IconBulbOff, BrightnessBar, WarmthRuler, QUICK_LEVELS } from "./parts";
import "./LightWidget.css";

export interface LightWidgetProps {
  entity: LightEntity;
  /** Shown at L size and in the sheet. Omit to hide the Today strip. */
  history?: LightHistory;
  /** "card" sits on the dashboard; "sheet" is the detail view with everything visible. */
  variant?: "card" | "sheet";
  /**
   * Card only. "regular" stacks the header over the control strip.
   * "thin" puts everything in one 56px pill-shaped row; below 240px the control strip
   * gives way to a text readout and the bulb and details sheet remain.
   */
  density?: "regular" | "thin";
  onToggle: () => void;
  onBrightnessChange: (percent: number) => void;
  onKelvinChange?: (kelvin: number) => void;
  /** Card only: the arrow button and press-and-hold on the bulb call this. */
  onOpenDetails?: () => void;
  /** Sheet only: the close button calls this. */
  onClose?: () => void;
}

/**
 * One light entity. Its height depends only on the container width, never on state or entity type:
 * S under 260px, M 260-439px, L 440px and up (adds a large readout and today's history).
 */
export function LightWidget({ entity: e, history, variant = "card", density = "regular", onToggle, onBrightnessChange, onKelvinChange, onOpenDetails, onClose }: LightWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const thin = !sheet && density === "thin";
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const { c, h } = kelvinToLch(e.supportsColorTemp && e.kelvin ? e.kelvin : K_DEFAULT);
  // HA reports brightness 0-255; integrations can hand over a raw float. Show whole percent, 1-100.
  const pct = Math.min(100, Math.max(1, Math.round(e.brightness)));
  const glow = on ? (e.supportsBrightness ? pct / 100 : 0.85) : 0;
  const intensity = e.supportsBrightness ? pct / 100 : 0.85;
  const style = { "--accent-c": c, "--accent-h": h, "--hd-glow": glow.toFixed(3) } as Vars;

  const readout = unav ? null : !on ? "Off" : e.supportsBrightness ? <>{pct}<span>%</span></> : "On";
  const valueText = unav ? "Unavailable" : !on ? "Off" : e.supportsBrightness ? `${pct}%` : "On";

  return (
    <article className={`hd lw${sheet ? " hd--sheet" : ""}${thin ? " hd--thin" : ""}`} data-state={e.state} style={style} aria-labelledby={`${uid}-n`}>
      <header className="hd-head">
        <Orb label={e.name} pressed={on} unavailable={unav} intensity={intensity} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          {unav ? <IconBulbOff /> : <IconBulb />}
        </Orb>
        <div className="hd-title">
          <h2 className="hd-name" id={`${uid}-n`} title={e.name}>{e.name}</h2>
          <p className="hd-area" title={e.area}>{e.area}</p>
          {thin && <p className="hd-sub" aria-hidden="true">{valueText}</p>}
        </div>
        <p className="hd-num" aria-hidden="true">{readout}</p>
        {sheet
          ? <CircleButton label={`Close ${e.name}`} onClick={onClose} autoFocus><IconClose /></CircleButton>
          : onOpenDetails && <CircleButton label={`${e.name} details`} onClick={onOpenDetails}><IconOpen /></CircleButton>}
      </header>

      <div className="hd-slot">
        {unav ? <UnavailableSlot lastSeen={e.lastSeen} />
          : e.supportsBrightness ? <BrightnessBar id={`${uid}-dim`} label={`${e.name} brightness`} value={e.brightness} on={on} onChange={onBrightnessChange} />
          : <TogglePill label={e.name} on={on} onToggle={onToggle}>{on ? "On" : "Off"}</TogglePill>}
      </div>

      {sheet && !unav && (e.supportsBrightness || e.supportsColorTemp) && (
        <div className="hd-extra">
          {e.supportsBrightness && (
            <ChoiceChips id={`${uid}-lv`} label="Quick levels" options={QUICK_LEVELS} value={on ? pct : null} onChange={onBrightnessChange} />
          )}
          {e.supportsColorTemp && e.kelvin != null && onKelvinChange && (
            <WarmthRuler id={`${uid}-k`} kelvin={e.kelvin} min={e.minKelvin ?? K_MIN} max={e.maxKelvin ?? K_MAX} disabled={!on} onChange={onKelvinChange} />
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
          <span>{e.supportsBrightness ? (e.supportsColorTemp ? "Dimmable, warmth" : "Dimmable") : "On / off"}</span>
        </p>
      )}
    </article>
  );
}

export interface LightSheetProps extends Omit<LightWidgetProps, "variant" | "density" | "onOpenDetails" | "onClose"> {
  open: boolean;
  onClose: () => void;
}

/** The light's detail view in a modal sheet. */
export function LightSheet({ open, onClose, ...props }: LightSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} label={`${props.entity.name} details`}>
      <LightWidget {...props} variant="sheet" onClose={onClose} />
    </Sheet>
  );
}
