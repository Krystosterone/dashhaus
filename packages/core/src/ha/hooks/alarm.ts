import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createAlarmHandlers } from "../actions/alarm";
import type { AlarmHandlers } from "../actions/alarm";
import { alarmFromHass } from "../mappers/alarm";
import { alarmHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import type { AlarmEntity, AlarmHistory } from "../../entities/alarm/types";
import type { HaActionError } from "../types";

export interface HaAlarmOptions {
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

export interface HaAlarmResult {
  entity: AlarmEntity;
  history: AlarmHistory;
  actions: AlarmHandlers;
}

/** One live alarm panel for any UI: the mapped entity, today's history and its arm and disarm actions. */
export function useHaAlarm(entityId: string, { name, area, lastSeen, exitDelay, entryDelay, openSensors, triggeredBy, history, loadHistory = true, onActionError }: HaAlarmOptions = {}): HaAlarmResult {
  checkEntityId(entityId, ["alarm_control_panel"], "useHaAlarm");
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => alarmHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => alarmFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, exitDelay, entryDelay, openSensors, triggeredBy, now }), [raw, entityId, area, registryArea, name, lastSeen, exitDelay, entryDelay, openSensors, triggeredBy, now]);
  const actions = useMemo(() => createAlarmHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return { entity, history: history ?? parsedHistory, actions };
}
