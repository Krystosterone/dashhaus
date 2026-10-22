import { useId } from "react";
import type { LightEntity, LightHistory } from "./types";
import { kelvinName, K_MIN, K_MAX } from "./kelvin";
import { Orb, CardTitle, CircleButton, IconClose, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, Sheet, fmtDuration, paint } from "../../shared/ui";
import type { ColorProp, WidgetFootprint } from "../../shared/ui";
import { IconBulb, IconBulbOff, BrightnessBar, WarmthRuler, QUICK_LEVELS } from "./parts";
import "./LightWidget.css";

export interface LightWidgetProps {
  entity: LightEntity;
  /** Shown at L size and in the sheet. Omit to hide the Today strip. */
  history?: LightHistory;
  /** "card" sits on the dashboard; "sheet" is the detail view with everything visible. */
  variant?: "card" | "sheet";
  /** Card footprint. Standard is 128px; compact is 60px; featured is 264px at every width. */
  footprint?: WidgetFootprint;
  /**
   * Compact only. false removes the inline control, shows the value in its place, and makes the row open
   * the detail sheet. The orb keeps its tap and hold actions. Default true.
   */
  showControl?: boolean;
  onToggle: () => void;
  onBrightnessChange: (percent: number) => void;
  onKelvinChange?: (kelvin: number) => void;
  /** Card only: the name and press-and-hold on the bulb call this. */
  onOpenDetails?: () => void;
  /** Sheet only: the close button calls this. */
  onClose?: () => void;
  /** Opt-in colour for the orb (standard, featured and sheet only). Default: the accent; warmth is named on the status line. */
  color?: ColorProp;
}

/**
 * One light entity. The shared footprint matrix fixes its height independently of state and entity type.
 */
export function LightWidget({ entity: e, history, variant = "card", footprint = "standard", showControl = true, onToggle, onBrightnessChange, onKelvinChange, onOpenDetails, onClose, color }: LightWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const compact = !sheet && footprint === "compact";
  const featured = !sheet && footprint === "featured";
  const bare = compact && !showControl;
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const hasBrightness = e.supportsBrightness && e.brightness != null;
  // Adapters hand over normalized percent; keep an absent reading out of controls and readouts.
  const pct = e.brightness == null ? 100 : Math.min(100, Math.max(1, Math.round(e.brightness)));
  const glow = on ? (hasBrightness ? pct / 100 : 0.85) : 0;
  const intensity = hasBrightness ? pct / 100 : 0.85;
  // Lit is energy: the orb and the bar fill with the accent. Warmth is told in words, not by colouring the orb.
  const colors = paint("energy", glow, null, color);

  const readout = unav ? null : !on ? "Off" : hasBrightness ? <>{pct}<span>%</span></> : "On";
  const valueText = unav ? "Unavailable" : !on ? "Off" : hasBrightness ? `${pct}%` : "On";

  // The warmth in words, for the status line of a lit lamp.
  const warmth = on && e.supportsColorTemp && e.kelvin != null ? kelvinName(e.kelvin) : null;

  // The compact value appears under the name, or in place of a hidden control.
  const subText = valueText;
  return (
    <article className={`hd lw${sheet ? " hd--sheet" : ""}${compact ? " hd--compact" : ""}${featured ? " hd--featured" : ""}`} data-control={bare ? "off" : undefined} data-state={e.state} {...colors} aria-labelledby={`${uid}-n`}>
      <header className="hd-head">
        <Orb label={e.name} pressed={on} unavailable={unav} intensity={intensity} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          {unav ? <IconBulbOff /> : <IconBulb />}
        </Orb>
        <CardTitle id={`${uid}-n`} name={e.name} onOpen={sheet ? undefined : onOpenDetails}>
          <p className="hd-area" title={e.area}>{e.area}{warmth && <span className="lw-k">{e.area ? " · " : ""}{warmth}</span>}</p>
          {compact && <p className="hd-sub">{subText}</p>}
        </CardTitle>
        <p className="hd-num" aria-hidden="true">{readout}</p>
        {sheet && <CircleButton
          label={`Close ${e.name}`}
          onClick={onClose}
          // Focus lands on the sheet's close button when it opens: dialog focus management, not page-load focus theft.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        ><IconClose /></CircleButton>}
      </header>

      <div className="hd-slot">
        {bare ? <p className="hd-val">{subText}</p> : unav ? <UnavailableSlot lastSeen={e.lastSeen} />
          : hasBrightness ? <BrightnessBar id={`${uid}-dim`} label={`${e.name} brightness`} value={pct} on={on} onChange={onBrightnessChange} />
          : <TogglePill label={`${e.name}: ${on ? "On" : "Off"}`} on={on} onToggle={onToggle}>{on ? "On" : "Off"}</TogglePill>}
      </div>

      {sheet && !unav && (hasBrightness || (e.supportsColorTemp && e.kelvin != null && onKelvinChange)) && (
        <div className="hd-extra">
          {hasBrightness && (
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
          summary={unav ? `Unavailable since ${e.lastSeen ?? "earlier"}` : history.onMinutes > 0 ? `On ${fmtDuration(history.onMinutes)}` : "Not on today"}
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

export interface LightSheetProps extends Omit<LightWidgetProps, "variant" | "footprint" | "onOpenDetails" | "onClose"> {
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
