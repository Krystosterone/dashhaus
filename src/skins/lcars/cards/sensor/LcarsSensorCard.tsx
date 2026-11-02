import type { ReactNode } from "react";
import type { SensorEntity, SensorHistory } from "@dashhaus/core/entities/sensor/types";
import { LcarsCardFrame } from "../../shared/ui";
import type { LcarsFootprint } from "../../shared/ui";
import { IconSensor } from "./icons";
import "./LcarsSensorCard.css";

export interface LcarsSensorCardProps {
  entity: SensorEntity;
  history?: SensorHistory;
  footprint?: LcarsFootprint;
  defaultOpen?: boolean;
}

/** One room's air, as an LCARS panel: the temperature as the big reading, humidity and battery as readouts. */
export function LcarsSensorCard({ entity: e, history, footprint = "standard", defaultOpen = false }: LcarsSensorCardProps) {
  const summary: ReactNode = e.temperature == null ? "—" : `${e.temperature}${e.unit}`;
  const readouts = (
    <dl className="lcars-sensor-readouts">
      <div><dt>Humidity</dt><dd>{e.humidity == null ? "—" : `${e.humidity}%`}</dd></div>
      {e.battery != null && <div><dt>Power</dt><dd>{e.battery}%</dd></div>}
    </dl>
  );
  return (
    <LcarsCardFrame card="sensor" name={e.name} area={e.area} state={e.state === "ok" ? "nominal" : e.state} summary={summary} icon={<IconSensor />} footprint={footprint} extra={e.state === "unavailable" ? undefined : readouts} defaultOpen={defaultOpen}>
      <dl className="lcars-facts">
        <div><dt>Temperature</dt><dd>{e.temperature == null ? "—" : `${e.temperature}${e.unit}`}</dd></div>
        {e.humidity != null && <div><dt>Humidity</dt><dd>{e.humidity}%</dd></div>}
        {e.battery != null && <div><dt>Power cell</dt><dd>{e.battery}%</dd></div>}
        {e.lastUpdated && <div><dt>Last reading</dt><dd>{e.lastUpdated}</dd></div>}
        {e.lastSeen && <div><dt>Last contact</dt><dd>{e.lastSeen}</dd></div>}
        <div><dt>Designation</dt><dd>{e.entityId}</dd></div>
      </dl>
      {history && <p className="lcars-facts-note">Hourly telemetry logged since 00:00</p>}
    </LcarsCardFrame>
  );
}
