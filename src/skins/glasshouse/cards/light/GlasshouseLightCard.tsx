import type { LightEntity, LightHistory } from "@dashhaus/core/entities/light/types";
import { fmtDuration } from "@dashhaus/core/entities/format";
import { GlasshouseBars, GlasshouseCardFrame, GlasshouseFacts, GlasshouseSlider, GlasshouseSwitch, glasshouseWords } from "../../shared/ui";
import type { GlasshouseFootprint } from "../../shared/ui";
import { IconLight } from "./icons";
import "./GlasshouseLightCard.css";

export interface GlasshouseLightCardProps {
  entity: LightEntity;
  history?: LightHistory;
  footprint?: GlasshouseFootprint;
  defaultOpen?: boolean;
  onToggle?: () => void;
  /** Its brightness, 1–100: the slider in its details. */
  onBrightnessChange?: (percent: number) => void;
}

/**
 * A light: its switch at the head, its brightness big on the face over a glowing level line, and today's hours on
 * as bars in its details, with the brightness slider. On, the card's corner and glyph glow cyan.
 */
export function GlasshouseLightCard({ entity: e, history, footprint = "standard", defaultOpen = false, onToggle, onBrightnessChange }: GlasshouseLightCardProps) {
  const unavailable = e.state === "unavailable";
  const on = e.state === "on";
  const level = on ? e.brightness ?? (e.supportsBrightness ? undefined : 100) : 0;
  const summary = on && e.supportsBrightness && e.brightness != null ? `${e.brightness}%` : glasshouseWords(e.state);
  const control = onToggle ? <GlasshouseSwitch label={`${e.name}`} on={on} unavailable={unavailable} onPress={onToggle} /> : undefined;
  const face = (
    <>
      <p className="glasshouse-big">{on ? (e.supportsBrightness && e.brightness != null ? <>{e.brightness}<small>%</small></> : "On") : "Off"}</p>
      <div className="glasshouse-light-level" aria-hidden="true"><span style={{ transform: `scaleX(${(level ?? 0) / 100})` }} /></div>
      <p className="glasshouse-caption">{on ? (e.lastChanged ? `On since ${e.lastChanged}` : "On") : e.lastChanged ? `Off since ${e.lastChanged}` : "Off"}{history ? ` · ${fmtDuration(history.onMinutes)} today` : ""}</p>
    </>
  );
  return (
    <GlasshouseCardFrame card="light" name={e.name} entityId={e.entityId} area={e.area} state={e.state} summary={summary} icon={<IconLight />} footprint={footprint} lit={on} control={control} face={face} defaultOpen={defaultOpen}>
      {e.supportsBrightness && onBrightnessChange && (
        <GlasshouseSlider label="Brightness" value={on ? e.brightness ?? 100 : 0} min={0} max={100} unavailable={unavailable} valueText={(v) => v === 0 ? "Off" : `${v}%`} onChange={(v) => { if (v === 0) { if (on) onToggle?.(); } else onBrightnessChange(v); }} />
      )}
      {history && <div className="glasshouse-sheet-chart"><GlasshouseBars samples={history.samples} current={history.currentHour} label={`On ${fmtDuration(history.onMinutes)} today`} /></div>}
      <GlasshouseFacts facts={[
        ["State", unavailable ? "Unavailable" : glasshouseWords(e.state)],
        e.supportsBrightness && on && e.brightness != null && ["Brightness", `${e.brightness}%`],
        e.kelvin != null && on && ["Colour temperature", `${e.kelvin} K`],
        history && ["On today", fmtDuration(history.onMinutes)],
        e.lastChanged && ["Last changed", e.lastChanged],
        unavailable && e.lastSeen && ["Last seen", e.lastSeen],
      ]} />
    </GlasshouseCardFrame>
  );
}
