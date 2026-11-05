import type { SensorEntity, SensorHistory } from "@dashhaus/core/entities/sensor/types";
import { comfortLabel, fmtTemp, lowBattery, normalize, TREND_WORD, trendOf } from "@dashhaus/core/entities/sensor/readings";
import { lastSeenFact, unavailableSince, updatedFact } from "@dashhaus/core/entities/facts";
import { TitanCardFrame, TitanDatum, TitanGauge } from "../../shared/ui";
import type { TitanFootprint } from "../../shared/ui";
import "./TitanSensorCard.css";

export interface TitanSensorCardProps {
  entity: SensorEntity;
  history?: SensorHistory;
  footprint?: TitanFootprint;
  defaultOpen?: boolean;
}

/**
 * A room's air as a reading: a teal elbow, the temperature as the big figure, comfort in words, humidity on the ruled
 * gauge, and the trend and battery as deep-blue data blocks where the keys would be. Today's temperature curve is
 * the dot strip, brighter where it was warmer.
 */
export function TitanSensorCard({ entity: e, history, footprint = "standard", defaultOpen = false }: TitanSensorCardProps) {
  const unavailable = e.state === "unavailable";
  const t = e.temperature;
  const comfort = comfortLabel(t, e.humidity, e.outdoor);
  const trend = trendOf(history?.temperature, history?.currentHour ?? 0);
  const curve = history ? normalize(history.temperature) : undefined;
  const range = curve && curve.min != null && curve.max != null ? `${fmtTemp(curve.min)}–${fmtTemp(curve.max)}${e.unit}` : undefined;
  const today = history && curve && {
    samples: curve.samples,
    currentHour: history.currentHour,
    summary: unavailable ? unavailableSince(e.lastSeen) : range ? `Today ${range}` : "No readings yet today",
  };
  const battery = lowBattery(e);
  const status = t == null ? "No reading" : comfort || (e.outdoor ? "Outdoors" : "Reading");
  const gauge = e.humidity != null || !unavailable
    ? <TitanGauge label="HUM" name="Humidity" fraction={(e.humidity ?? 0) / 100} text={e.humidity != null ? `${Math.round(e.humidity)}%` : "—"} tone="read" empty={unavailable || e.humidity == null} />
    : undefined;
  const data = (
    <>
      <TitanDatum label="Trend" value={unavailable || !trend ? "—" : TREND_WORD[trend]} tone="read" />
      {e.battery != null && <TitanDatum label="Battery" value={unavailable ? "—" : `${Math.round(e.battery)}%`} tone={battery ? "alert" : "idle"} />}
    </>
  );
  return (
    <TitanCardFrame
      card="sensor" code="SN" entityId={e.entityId} name={e.name} area={e.area} state={e.state}
      status={status} summary={t == null ? "—" : fmtTemp(t)} unit={t == null ? undefined : e.unit} tone="read"
      warning={battery ? "Battery low" : undefined} today={today || undefined}
      gauge={gauge} actions={data} footprint={footprint} defaultOpen={defaultOpen}
      facts={[
        ["Temperature", t == null || unavailable ? "—" : `${fmtTemp(t)}${e.unit}`],
        e.humidity != null && ["Humidity", unavailable ? "—" : `${Math.round(e.humidity)}%`],
        !unavailable && comfort && ["Comfort", comfort],
        range && ["Today", range],
        e.battery != null && ["Battery", `${Math.round(e.battery)}%${battery ? " · replace soon" : ""}`],
        !unavailable && ["Updated", updatedFact(e.lastUpdated).replace(/^Updated /, "")],
        unavailable && ["Last seen", lastSeenFact(e.lastSeen).replace(/^Last seen /, "")],
      ]}
    />
  );
}
