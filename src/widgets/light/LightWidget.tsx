import { useId } from "react";
import type { LightEntity, LightHistory } from "./types";
import { kelvinToLch, K_MIN, K_MAX } from "./kelvin";
import { Orb, CircleButton, IconOpen, IconClose, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, Sheet, fmtDuration, paint } from "../../shared/ui";
import type { ColorProp } from "../../shared/ui";
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
   * "thin" puts everything in one 56px pill-shaped row; below 320px the control strip
   * gives way to a text readout and the bulb and details sheet remain.
   */
  density?: "regular" | "thin";
  /**
   * Thin only. false: no control in the row (no pill, bar, stepper or switch); the value shows as text in
   * its place and tapping the row opens the details sheet, where every control is. The orb still switches
   * and holds as usual. Default true.
   */
  showControl?: boolean;
  onToggle: () => void;
  onBrightnessChange: (percent: number) => void;
  onKelvinChange?: (kelvin: number) => void;
  /** Card only: the arrow button and press-and-hold on the bulb call this. */
  onOpenDetails?: () => void;
  /** Sheet only: the close button calls this. */
  onClose?: () => void;
  /** The orb's colour. Default: the lamp's colour temperature, when it has one. "none" keeps it the accent. */
  color?: ColorProp;
}

/**
 * One light entity. Its height depends only on the container width, never on state or entity type:
 * S under 260px, M 260-439px, L 440px and up (adds a large readout and today's history).
 */
export function LightWidget({ entity: e, history, variant = "card", density = "regular", showControl = true, onToggle, onBrightnessChange, onKelvinChange, onOpenDetails, onClose, color }: LightWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const thin = !sheet && density === "thin";
  const bare = thin && !showControl;
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // HA reports brightness 0-255; integrations can hand over a raw float. Show whole percent, 1-100.
  const pct = Math.min(100, Math.max(1, Math.round(e.brightness)));
  const glow = on ? (e.supportsBrightness ? pct / 100 : 0.85) : 0;
  const intensity = e.supportsBrightness ? pct / 100 : 0.85;
  // Lit is energy: the bar fills with the accent. The lamp's own colour goes in the orb.
  const colors = paint("energy", glow, e.supportsColorTemp && e.kelvin ? kelvinToLch(e.kelvin) : null, color);

  const readout = unav ? null : !on ? "Off" : e.supportsBrightness ? <>{pct}<span>%</span></> : "On";
  const valueText = unav ? "Unavailable" : !on ? "Off" : e.supportsBrightness ? `${pct}%` : "On";

  // The value in words: under the name in narrow thin rows, and in place of the control when it's hidden.
  const subText = valueText;
  return (
    <article className={`hd lw${sheet ? " hd--sheet" : ""}${thin ? " hd--thin" : ""}`} data-control={bare ? "off" : undefined} data-state={e.state} {...colors} aria-labelledby={`${uid}-n`}>
      <header className="hd-head">
        <Orb label={e.name} pressed={on} unavailable={unav} intensity={intensity} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          {unav ? <IconBulbOff /> : <IconBulb />}
        </Orb>
        <div className="hd-title">
          <h2 className="hd-name" id={`${uid}-n`} title={e.name}>{e.name}</h2>
          <p className="hd-area" title={e.area}>{e.area}</p>
          {thin && <p className="hd-sub">{subText}</p>}
        </div>
        <p className="hd-num" aria-hidden="true">{readout}</p>
        {sheet
          ? <CircleButton
            label={`Close ${e.name}`}
            onClick={onClose}
            // Focus lands on the sheet's close button when it opens: dialog focus management, not page-load focus theft.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          ><IconClose /></CircleButton>
          : onOpenDetails && <CircleButton label={`${e.name} details`} onClick={onOpenDetails}><IconOpen /></CircleButton>}
      </header>

      <div className="hd-slot">
        {bare ? <p className="hd-val">{subText}</p> : unav ? <UnavailableSlot lastSeen={e.lastSeen} />
          : e.supportsBrightness ? <BrightnessBar id={`${uid}-dim`} label={`${e.name} brightness`} value={e.brightness} on={on} onChange={onBrightnessChange} />
          : <TogglePill label={`${e.name}: ${on ? "On" : "Off"}`} on={on} onToggle={onToggle}>{on ? "On" : "Off"}</TogglePill>}
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
