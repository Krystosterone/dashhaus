import { useMemo } from "react";
import { useHaEntity } from "../provider";
import { sensorFromHass } from "../mappers/sensor";
import { sensorHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import { useHourCycle } from "../../hooks/hourCycle";
import type { SensorEntity, SensorHistory } from "../../entities/sensor/types";

export interface HaSensorOptions {
  /** Optional companion entity with `device_class: humidity`. */
  humidityEntityId?: string;
  /** Optional companion entity with `device_class: battery`. */
  batteryEntityId?: string;
  /** Overrides Home Assistant's friendly name. */
  name?: string;
  /** Overrides the area Home Assistant's registries resolve for the entity. */
  area?: string;
  outdoor?: boolean;
  /** Overrides when the entity was last reachable, shown while it is unavailable. */
  lastSeen?: string;
  unit?: "°C" | "°F";
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: SensorHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
}

export interface HaSensorResult {
  entity: SensorEntity;
  history: SensorHistory;
}

/** One live, read-only sensor for any UI: the primary sensor composed with its humidity and battery companions. */
export function useHaSensor(entityId: string, { humidityEntityId, batteryEntityId, name, area, outdoor, lastSeen, unit, history, loadHistory = true }: HaSensorOptions = {}): HaSensorResult {
  checkEntityId(entityId, ["sensor"], "useHaSensor");
  const raw = useHaEntity(entityId);
  const humidityEntity = useHaEntity(humidityEntityId ?? "");
  const batteryEntity = useHaEntity(batteryEntityId ?? "");
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const hourCycle = useHourCycle();
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
    hourCycle,
  }), [raw, entityId, name, area, registryArea, outdoor, lastSeen, unit, humidityEntity, batteryEntity, now, hourCycle]);
  return { entity, history: history ?? parsedHistory };
}
