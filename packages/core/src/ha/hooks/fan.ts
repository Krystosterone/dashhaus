import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createFanHandlers } from "../actions/fan";
import type { FanHandlers } from "../actions/fan";
import { fanFromHass } from "../mappers/fan";
import { onOffHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import type { FanEntity, FanHistory } from "../../entities/fan/types";
import type { HaActionError } from "../types";

export interface HaFanOptions {
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: FanHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

export interface HaFanResult {
  entity: FanEntity;
  history: FanHistory;
  actions: FanHandlers;
}

/** One live fan for any UI: the mapped entity, today's on/off history and its five capability-gated service actions. */
export function useHaFan(entityId: string, { name, area, lastSeen, history, loadHistory = true, onActionError }: HaFanOptions = {}): HaFanResult {
  checkEntityId(entityId, ["fan"], "useHaFan");
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => onOffHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => fanFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now }), [raw, entityId, name, area, registryArea, lastSeen, now]);
  const actions = useMemo(() => createFanHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return { entity, history: history ?? parsedHistory, actions };
}
