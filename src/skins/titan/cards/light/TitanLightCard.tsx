import type { LightEntity, LightHistory } from "@dashhaus/core/entities/light/types";
import { todaySummary } from "@dashhaus/core/entities/today";
import { kelvinName } from "@dashhaus/core/entities/light/kelvin";
import { lastSeenFact, sinceFact, unavailableSince } from "@dashhaus/core/entities/facts";
import { TitanAction, TitanCardFrame, TitanFader, TitanGauge } from "../../shared/ui";
import type { TitanFootprint } from "../../shared/ui";
import "./TitanLightCard.css";

export interface TitanLightCardProps {
  entity: LightEntity;
  history?: LightHistory;
  footprint?: TitanFootprint;
  defaultOpen?: boolean;
  onToggle?: () => void;
  /** Sets the brightness, 1–100; a light that is off turns on at it. */
  onBrightnessChange?: (percent: number) => void;
}

/**
 * A light on the console: salmon elbow while it is on, slate while off; its brightness as a big figure and on the
 * ruled fader (a tap on the fader of a light that is off turns it on there); POWER latches it on and off. Today's
 * hours on are the dot strip in its bar.
 */
export function TitanLightCard({ entity: e, history, footprint = "standard", defaultOpen = false, onToggle, onBrightnessChange }: TitanLightCardProps) {
  const unavailable = e.state === "unavailable";
  const on = e.state === "on";
  const dims = e.supportsBrightness;
  const summary = on ? (dims && e.brightness != null ? String(e.brightness) : "ON") : "OFF";
  const unit = on && dims && e.brightness != null ? "%" : undefined;
  const status = unavailable ? "" : on ? `On${e.lastChanged ? ` since ${e.lastChanged}` : ""}` : `Off${e.lastChanged ? ` since ${e.lastChanged}` : ""}`;
  const today = history && { samples: history.samples, currentHour: history.currentHour, summary: unavailable ? unavailableSince(e.lastSeen) : todaySummary("on", history.onMinutes) };
  const level = e.brightness ?? 0;
  const gauge = !dims ? undefined : onBrightnessChange && !unavailable
    ? <TitanFader label="BRT" name="Brightness" value={on ? Math.max(level, 1) : Math.max(level, 1)} min={1} max={100} format={(v) => on ? `${Math.round(v)}%` : "OFF"} valueText={(v) => on ? `${Math.round(v)} percent` : `Off. Turns on at ${Math.round(v)} percent`} onChange={onBrightnessChange} tone="on" resting={!on} reportUnchanged />
    : <TitanGauge label="BRT" name="Brightness" fraction={on ? level / 100 : 0} text={on ? `${level}%` : "OFF"} tone="on" empty={unavailable} />;
  const actions = onToggle ? <TitanAction label="Power" pressed={on} unavailable={unavailable} onPress={onToggle} /> : undefined;
  return (
    <TitanCardFrame
      card="light" code="LT" entityId={e.entityId} name={e.name} area={e.area} state={e.state}
      status={status} summary={summary} unit={unit} tone={on ? "on" : "idle"} today={today || undefined}
      gauge={gauge} actions={actions} footprint={footprint} defaultOpen={defaultOpen}
      facts={[
        ["State", unavailable ? "Unavailable" : on ? "On" : "Off"],
        dims && ["Brightness", on && e.brightness != null ? `${e.brightness}%` : "—"],
        e.supportsColorTemp && e.kelvin != null && ["Colour", `${kelvinName(e.kelvin)} · ${e.kelvin} K`],
        e.supportsColor && e.hs && ["Hue", `${Math.round(e.hs[0])}° · ${Math.round(e.hs[1])}%`],
        !unavailable && ["Since", sinceFact(e.lastChanged)?.replace(/^Since /, "")],
        unavailable && ["Last seen", lastSeenFact(e.lastSeen).replace(/^Last seen /, "")],
      ]}
    />
  );
}
