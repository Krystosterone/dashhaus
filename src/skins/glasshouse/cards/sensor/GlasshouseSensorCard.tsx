import type { SensorEntity, SensorHistory } from "@dashhaus/core/entities/sensor/types";
import { normalizeReadings } from "@dashhaus/core/entities/history";
import { fmt1 } from "@dashhaus/core/entities/format";
import { GlasshouseBars, GlasshouseCardFrame, GlasshouseChip, GlasshouseFacts } from "../../shared/ui";
import type { GlasshouseFootprint } from "../../shared/ui";
import { IconDrop, IconSensor } from "./icons";
import "./GlasshouseSensorCard.css";

export interface GlasshouseSensorCardProps {
  entity: SensorEntity;
  history?: SensorHistory;
  footprint?: GlasshouseFootprint;
  defaultOpen?: boolean;
}

/**
 * A room's air, drawn like the reference's energy panel: the temperature big, its humidity as a chip, and today's
 * temperature as 24 glowing bars under it, with the day's low and high. Read-only: no control.
 */
export function GlasshouseSensorCard({ entity: e, history, footprint = "standard", defaultOpen = false }: GlasshouseSensorCardProps) {
  const unavailable = e.state === "unavailable";
  // A humidity-only sensor shows its humidity where the temperature would be, and its history is humidity.
  const humidOnly = e.temperature == null && e.humidity != null;
  const temperature = e.temperature == null ? (humidOnly ? `${e.humidity}` : undefined) : fmt1(e.temperature);
  const unit = humidOnly ? "%" : e.unit;
  const mark = humidOnly ? "%" : "°";
  const summary = temperature == null ? "—" : `${temperature}${unit}`;
  const series = humidOnly ? history?.humidity ?? history?.temperature : history?.temperature;
  const today = history && series ? normalizeReadings(series, humidOnly ? 2 : 0.5) : undefined;
  const range = today && today.min != null && today.max != null ? `Today ${fmt1(today.min)}${mark}–${fmt1(today.max)}${mark}` : undefined;
  const humidity = e.humidity == null || humidOnly ? undefined : <GlasshouseChip tone="accent"><IconDrop />{e.humidity}%</GlasshouseChip>;
  const bars = today && history ? <GlasshouseBars samples={today.samples} current={history.currentHour} label={range ?? "No readings yet today"} /> : null;
  const face = (
    <>
      <div className="glasshouse-figure-row">
        <p className="glasshouse-big">{temperature == null ? <span className="glasshouse-none">—</span> : <>{temperature}<small>{unit}</small></>}</p>
        <p className="glasshouse-caption">{range ?? (e.lastUpdated ? `Updated ${e.lastUpdated}` : "No readings yet today")}</p>
      </div>
      {bars}
    </>
  );
  return (
    <GlasshouseCardFrame card="sensor" name={e.name} entityId={e.entityId} area={e.area} state={e.state} stateLabel={e.outdoor ? "Outdoor" : "Indoor"} summary={summary} icon={<IconSensor />} footprint={footprint} control={unavailable ? undefined : humidity} face={face} defaultOpen={defaultOpen}>
      <div className="glasshouse-sheet-figure">
        <p className="glasshouse-big">{unavailable || temperature == null ? <span className="glasshouse-none">—</span> : <>{temperature}<small>{unit}</small></>}</p>
        {humidity}
      </div>
      {bars && <div className="glasshouse-sheet-chart">{bars}</div>}
      <GlasshouseFacts facts={[
        ["State", unavailable ? "Unavailable" : "Reporting"],
        range && ["Today", range.replace("Today ", "")],
        e.humidity != null && ["Humidity", `${e.humidity}%`],
        e.battery != null && ["Battery", `${e.battery}%`],
        e.lastUpdated && ["Updated", e.lastUpdated],
        unavailable && e.lastSeen && ["Last seen", e.lastSeen],
      ]} />
    </GlasshouseCardFrame>
  );
}
