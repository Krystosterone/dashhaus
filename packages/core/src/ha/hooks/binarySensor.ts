import { useMemo } from "react";
import { useHaEntity } from "../provider";
import { binarySensorFromHass } from "../mappers/binarySensor";
import { onOffHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import type { BinarySensorEntity, BinarySensorHistory } from "../../entities/binarySensor/types";

export interface HaBinarySensorOptions {
  /** Optional companion on the same device, `device_class: battery` (the automatic layout finds it). */
  batteryEntityId?: string;
  /** Overrides Home Assistant's friendly name. */
  name?: string;
  /** Overrides the area Home Assistant's registries resolve for the entity. */
  area?: string;
  /** Overrides when the entity was last reachable, shown while it is unavailable. */
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: BinarySensorHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
}

export interface HaBinarySensorResult {
  entity: BinarySensorEntity;
  history: BinarySensorHistory;
}

/**
 * One live, read-only binary sensor for any UI (a door, a window, a leak, smoke): the mapped entity composed with its
 * device's battery, and today's on/off history (how long it was open, wet or detecting). It sends no services.
 */
export function useHaBinarySensor(entityId: string, { batteryEntityId, name, area, lastSeen, history, loadHistory = true }: HaBinarySensorOptions = {}): HaBinarySensorResult {
  checkEntityId(entityId, ["binary_sensor"], "useHaBinarySensor");
  const raw = useHaEntity(entityId);
  const batteryEntity = useHaEntity(batteryEntityId ?? "");
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => onOffHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(
    () => binarySensorFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, batteryEntity, now }),
    [raw, entityId, name, area, registryArea, lastSeen, batteryEntity, now],
  );
  return { entity, history: history ?? parsedHistory };
}
