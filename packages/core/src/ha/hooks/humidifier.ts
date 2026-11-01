import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createHumidifierHandlers } from "../actions/humidifier";
import type { HumidifierHandlers } from "../actions/humidifier";
import { humidifierFromHass } from "../mappers/humidifier";
import { onOffHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import type { HumidifierEntity, HumidifierHistory } from "../../entities/humidifier/types";
import type { HaActionError } from "../types";

export interface HaHumidifierOptions {
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: HumidifierHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

export interface HaHumidifierResult {
  entity: HumidifierEntity;
  history: HumidifierHistory;
  actions: HumidifierHandlers;
}

/** One live humidifier for any UI: the mapped entity, today's history and its service actions. */
export function useHaHumidifier(entityId: string, { name, area, lastSeen, history, loadHistory = true, onActionError }: HaHumidifierOptions = {}): HaHumidifierResult {
  checkEntityId(entityId, ["humidifier"], "useHaHumidifier");
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => onOffHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => humidifierFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now }), [raw, entityId, name, area, registryArea, lastSeen, now]);
  const actions = useMemo(() => createHumidifierHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return { entity, history: history ?? parsedHistory, actions };
}
