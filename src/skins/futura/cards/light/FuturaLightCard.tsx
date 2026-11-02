import type { LightEntity, LightHistory } from "@dashhaus/core/entities/light/types";
import { fmtDuration } from "@dashhaus/core/entities/format";
import { FuturaCardFrame, FuturaDialKey, FuturaLevel, FuturaReadout, FuturaStats } from "../../shared/ui";
import type { FuturaFootprint, FuturaStat } from "../../shared/ui";
import { IconLight } from "./icons";
import "./FuturaLightCard.css";

export interface FuturaLightCardProps {
  entity: LightEntity;
  history?: LightHistory;
  footprint?: FuturaFootprint;
  defaultOpen?: boolean;
  onToggle?: () => void;
  /** 1-100; drawn as the level when the light dims. */
  onBrightnessChange?: (percent: number) => void;
}

const percent = (value: number) => Math.round(value);

/**
 * A light on Futura's console: an amber dial that switches it (its arc is the brightness), the level groove that
 * dims it, and today's meter of when it was lit. Amber because a lamp gives off light.
 */
export function FuturaLightCard({ entity: e, history, footprint = "standard", defaultOpen = false, onToggle, onBrightnessChange }: FuturaLightCardProps) {
  const unavailable = e.state === "unavailable";
  const on = e.state === "on";
  const dims = e.supportsBrightness && e.brightness != null;
  const level = on ? (dims ? (e.brightness ?? 0) / 100 : 1) : 0;
  const warmth = e.supportsColorTemp && e.kelvin != null ? `${Math.round(e.kelvin)} K` : e.supportsColor && e.hs ? "Colour" : undefined;
  const status = on ? (warmth ? `On · ${warmth}` : "On") : dims ? `Off · last ${percent(e.brightness ?? 0)}%` : "Off";
  const summary = on && dims ? <FuturaReadout value={percent(e.brightness ?? 0)} unit="%" /> : <FuturaReadout value={on ? "ON" : "OFF"} />;
  const lead = onToggle ? <FuturaDialKey label={`Power, ${e.name}`} pressed={on} onPress={onToggle} unavailable={unavailable} level={level} tone="amber"><IconLight /></FuturaDialKey> : undefined;
  // The card's level and the details' are never on screen together: the modal details make the page inert.
  const brightness = () => onBrightnessChange && e.supportsBrightness
    ? <FuturaLevel label={`Brightness, ${e.name}`} value={e.brightness ?? 1} min={1} max={100} tone="amber" lit={on} unavailable={unavailable} valueText={(v) => on ? `${percent(v)} percent` : `Off. Last set to ${percent(v)} percent`} onChange={onBrightnessChange} />
    : undefined;
  const changed: FuturaStat = e.lastSeen ? { label: "Last seen", value: e.lastSeen } : { label: "Changed", value: e.lastChanged ?? "—" };
  const stats: FuturaStat[] = [...(warmth ? [{ label: "Warmth", value: warmth }] : []), ...(history ? [{ label: "Today", value: fmtDuration(history.onMinutes) }] : []), changed];
  const meter = history ? { samples: history.samples, currentHour: history.currentHour, caption: history.onMinutes > 0 ? `Lit ${fmtDuration(history.onMinutes)}` : "Dark all day", tone: "amber" as const } : undefined;
  const sheetLevel = brightness();
  return (
    <FuturaCardFrame name={e.name} area={e.area} state={e.state} summary={summary} icon={<IconLight />} level={level} tone="amber" lit={on} lead={lead} status={status} meter={meter} footprint={footprint} actions={brightness()} stats={stats} defaultOpen={defaultOpen}>
      {sheetLevel && <div className="futura-controls"><div className="futura-control"><span>Brightness</span><span className="light-value">{on ? `${percent(e.brightness ?? 0)}%` : "Off"}</span>{sheetLevel}</div></div>}
      <FuturaStats facts items={[
        { label: "Brightness", value: dims ? `${percent(e.brightness ?? 0)}%` : e.supportsBrightness ? "—" : "On/off only" },
        ...(e.supportsColorTemp ? [{ label: "Warmth", value: e.kelvin != null ? `${Math.round(e.kelvin)} K` : "—" }] : []),
        ...(e.minKelvin != null && e.maxKelvin != null ? [{ label: "Warmth range", value: `${e.minKelvin}–${e.maxKelvin} K` }] : []),
        ...(e.supportsColor && e.hs ? [{ label: "Colour", value: `${Math.round(e.hs[0])}° · ${Math.round(e.hs[1])}%` }] : []),
        ...(history ? [{ label: "Lit today", value: fmtDuration(history.onMinutes) }] : []),
        changed,
        { label: "Entity", value: e.entityId },
      ]} />
    </FuturaCardFrame>
  );
}
