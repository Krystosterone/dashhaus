import type { SensorEntity, SensorHistory } from "@dashhaus/core/entities/sensor/types";
import { TREND_WORD, comfortLabel, lowBattery, toCelsius, trendOf } from "@dashhaus/core/entities/sensor/readings";
import { normalizeReadings } from "@dashhaus/core/entities/history";
import type { Reading } from "@dashhaus/core/entities/history";
import { fmt1 } from "@dashhaus/core/entities/format";
import { FuturaCardFrame, FuturaMeter, FuturaReadout, FuturaStats } from "../../shared/ui";
import type { FuturaFootprint, FuturaMeterProps, FuturaStat } from "../../shared/ui";
import { IconSensor } from "./icons";
import "./FuturaSensorCard.css";

export interface FuturaSensorCardProps {
  entity: SensorEntity;
  history?: SensorHistory;
  footprint?: FuturaFootprint;
  defaultOpen?: boolean;
}

/** Today's readings as a meter: each hour scaled between the day's low and high, the caption saying both. */
function readingsMeter(series: Reading[], currentHour: number, unit: string, label: string, minSpan: number): FuturaMeterProps & { now: number | null } {
  const { samples, min, max } = normalizeReadings(series, minSpan);
  const caption = min == null || max == null ? "No readings yet" : `Low ${fmt1(min)}${unit} · high ${fmt1(max)}${unit}`;
  const at = samples[currentHour];
  // Where this hour sits between the day's low and high, 0-1, for the dial's arc; normalizeReadings maps to 0.12-1.
  const now = typeof at === "number" ? (at - 0.12) / 0.88 : null;
  return { samples, currentHour, caption, label, draw: "trace", now };
}

/**
 * A room reading on Futura's console: the readout is the temperature, and the dial's arc is where it sits between
 * today's low and high, as the trace beneath draws the day. A reading has nothing to switch, so it never glows: its
 * arc stays at half strength in cyan, and a low battery is said in words.
 */
export function FuturaSensorCard({ entity: e, history, footprint = "standard", defaultOpen = false }: FuturaSensorCardProps) {
  const unavailable = e.state === "unavailable";
  const humidity = e.humidity != null ? `${Math.round(e.humidity)}%` : null;
  const summary = e.temperature != null
    ? <FuturaReadout value={fmt1(e.temperature)} unit={e.unit} />
    : <FuturaReadout value={humidity ?? "—"} unit={humidity ? "RH" : e.unit} />;
  const trend = history ? trendOf(history.temperature, history.currentHour) : null;
  const comfort = comfortLabel(e.temperature != null ? toCelsius(e.temperature, e.unit) : undefined, e.humidity, e.outdoor);
  const status = [trend && TREND_WORD[trend], comfort || (e.outdoor ? "Outdoor" : null)].filter(Boolean).join(" · ") || (e.lastUpdated ? `Updated ${e.lastUpdated}` : "No reading yet");
  const battery: FuturaStat[] = e.battery != null ? [{ label: "Battery", value: lowBattery(e) ? `${Math.round(e.battery)}% · low` : `${Math.round(e.battery)}%`, alert: lowBattery(e) }] : [];
  const updated: FuturaStat = e.lastSeen ? { label: "Last seen", value: e.lastSeen } : { label: "Updated", value: e.lastUpdated ?? "—" };
  const stats: FuturaStat[] = [...(humidity ? [{ label: "Humidity", value: humidity }] : []), ...battery, updated];
  const day = history ? readingsMeter(history.temperature, history.currentHour, "°", "Today", 0.5) : undefined;
  const meter = day && { samples: day.samples, currentHour: day.currentHour, caption: day.caption, label: day.label, draw: day.draw };
  const humidityMeter = history?.humidity ? readingsMeter(history.humidity, history.currentHour, "%", "Humidity today", 2) : undefined;
  return (
    <FuturaCardFrame name={e.name} area={e.area} state={e.state} summary={summary} icon={<IconSensor />} level={unavailable ? null : day?.now ?? null} tone="cyan" status={status} meter={meter} footprint={footprint} stats={stats} defaultOpen={defaultOpen}>
      {humidityMeter && <FuturaMeter {...humidityMeter} />}
      <FuturaStats facts items={[
        { label: "Temperature", value: e.temperature != null ? `${fmt1(e.temperature)}${e.unit}` : "—" },
        { label: "Humidity", value: humidity ?? "—" },
        ...battery,
        { label: "Placement", value: e.outdoor ? "Outdoor" : "Indoor" },
        updated,
        { label: "Entity", value: e.entityId },
      ]} />
    </FuturaCardFrame>
  );
}
