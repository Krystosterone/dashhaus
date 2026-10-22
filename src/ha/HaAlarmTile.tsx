import { useMemo } from "react";
import { useHaEntity, useHaStore } from "./provider";
import { createAlarmHandlers } from "./actions/alarm";
import { alarmFromHass } from "./mappers/alarm";
import { alarmHistoryFromHass } from "./history";
import { useHaArea } from "./registry";
import { useHaHistory } from "./useHaHistory";
import { useNow } from "../shared/useNow";
import { AlarmTile } from "../widgets/alarm/AlarmTile";
import type { AlarmTileProps } from "../widgets/alarm/AlarmTile";
import type { AlarmHistory } from "../widgets/alarm/types";
import type { HaActionError } from "./types";

export interface HaAlarmTileProps extends Omit<AlarmTileProps, "entity" | "onArm" | "onDisarm"> {
  entityId: string;
  name?: string;
  area?: string;
  lastSeen?: string;
  exitDelay?: number;
  entryDelay?: number;
  openSensors?: string[];
  /** What set off a pending/triggered state; Home Assistant has no such attribute, so the host composes it. */
  triggeredBy?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: AlarmHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

/** A live alarm tile: raw state is selected and mapped above the existing presentational tile. */
export function HaAlarmTile({ entityId, name, area, lastSeen, exitDelay, entryDelay, openSensors, triggeredBy, history, loadHistory = true, onActionError, ...props }: HaAlarmTileProps) {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => alarmHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => alarmFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, exitDelay, entryDelay, openSensors, triggeredBy, now }), [raw, entityId, area, registryArea, name, lastSeen, exitDelay, entryDelay, openSensors, triggeredBy, now]);
  const handlers = useMemo(() => createAlarmHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return <AlarmTile {...props} entity={entity} history={history ?? parsedHistory} {...handlers} />;
}
