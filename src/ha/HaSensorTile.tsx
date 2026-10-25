import { useMemo } from "react";
import { useHaEntity } from "./provider";
import { sensorFromHass } from "./mappers/sensor";
import { sensorHistoryFromHass } from "./history";
import { useHaArea } from "./registry";
import { useHaHistory } from "./useHaHistory";
import { useNow } from "../shared/useNow";
import { SensorTile } from "../widgets/sensor/SensorTile";
import type { SensorTileProps } from "../widgets/sensor/SensorTile";
import type { SensorHistory } from "../domains/sensor/types";

export interface HaSensorTileProps extends Omit<SensorTileProps, "entity"> {
  /** Primary sensor, normally the temperature entity for this device. */
  entityId: string;
  /** Optional companion entity with `device_class: humidity`. */
  humidityEntityId?: string;
  /** Optional companion entity with `device_class: battery`. */
  batteryEntityId?: string;
  name?: string;
  area?: string;
  outdoor?: boolean;
  lastSeen?: string;
  unit?: "°C" | "°F";
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: SensorHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
}

/** A live read-only sensor tile: compose raw companion entities above the existing presentational tile. */
export function HaSensorTile({
  entityId,
  humidityEntityId,
  batteryEntityId,
  name,
  area,
  outdoor,
  lastSeen,
  unit,
  history,
  loadHistory = true,
  ...props
}: HaSensorTileProps) {
  const raw = useHaEntity(entityId);
  const humidityEntity = useHaEntity(humidityEntityId ?? "");
  const batteryEntity = useHaEntity(batteryEntityId ?? "");
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const historyIds = humidityEntityId ? [entityId, humidityEntityId] : [entityId];
  const records = useHaHistory(historyIds, loadHistory && history === undefined, now);
  const parsedHistory = useMemo(
    () => sensorHistoryFromHass(records, { temperature: entityId, humidity: humidityEntityId }, now),
    [records, entityId, humidityEntityId, now],
  );
  const entity = useMemo(() => sensorFromHass(raw, entityId, {
    name,
    area: area ?? registryArea,
    outdoor,
    lastSeen,
    unit,
    humidityEntity,
    batteryEntity,
    now,
  }), [raw, entityId, name, area, registryArea, outdoor, lastSeen, unit, humidityEntity, batteryEntity, now]);
  return <SensorTile {...props} entity={entity} history={history ?? parsedHistory} />;
}
