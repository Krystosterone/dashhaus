import type { LightEntity, LightHistory } from "./types";
import { kelvinName, K_MIN, K_MAX } from "./kelvin";
import { Orb, CardTitle, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, fmtDuration, paint, SheetClose, useCard, detailsSheet } from "../../shared/ui";
import type { ColorProp, CardProps, SheetProps } from "../../shared/ui";
import { IconBulb, IconBulbOff, BrightnessBar, WarmthRuler, QUICK_LEVELS } from "./parts";
import "./LightWidget.css";

export interface LightWidgetProps extends CardProps {
  entity: LightEntity;
  /** Shown at L size and in the sheet. Omit to hide the Today strip. */
  history?: LightHistory;
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
export function LightWidget({ entity: e, history, variant, footprint, showControl, onToggle, onBrightnessChange, onKelvinChange, onOpenDetails, onClose, color }: LightWidgetProps) {
  const { uid, nameId, sheet, compact, bare, article } = useCard("lw", { variant, footprint, showControl });
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
    <article {...article} data-state={e.state} {...colors}>
      <header className="hd-head">
        <Orb label={e.name} pressed={on} unavailable={unav} intensity={intensity} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          {unav ? <IconBulbOff /> : <IconBulb />}
        </Orb>
        <CardTitle id={nameId} name={e.name} onOpen={sheet ? undefined : onOpenDetails}>
          <p className="hd-area" title={e.area}>{e.area}{warmth && <span className="lw-k">{e.area ? " · " : ""}{warmth}</span>}</p>
          {compact && <p className="hd-sub">{subText}</p>}
        </CardTitle>
        <p className="hd-num" aria-hidden="true">{readout}</p>
        {sheet && <SheetClose label={`Close ${e.name}`} onClick={onClose} />}
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

export type LightSheetProps = SheetProps<LightWidgetProps>;

/** The light's detail view in a modal sheet. */
export const LightSheet = detailsSheet(LightWidget);
