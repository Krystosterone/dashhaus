import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createClimateHandlers } from "../actions/climate";
import type { ClimateHandlers } from "../actions/climate";
import { climateFromHass } from "../mappers/climate";
import { climateHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { useNow } from "../../hooks/useNow";
import type { ClimateEntity, ClimateHistory } from "../../domains/climate/types";
import type { HaActionError } from "../types";

export interface HaClimateOptions {
  name?: string;
  area?: string;
  lastSeen?: string;
  unit?: "°C" | "°F";
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: ClimateHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

export interface HaClimateResult {
  entity: ClimateEntity;
  history: ClimateHistory;
  actions: ClimateHandlers;
}

/** One live climate entity for any UI: the mapped entity, today's history and its service actions. */
export function useHaClimate(entityId: string, { name, area, lastSeen, unit, history, loadHistory = true, onActionError }: HaClimateOptions = {}): HaClimateResult {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => climateHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => climateFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, unit, now }), [raw, entityId, area, registryArea, name, lastSeen, unit, now]);
  const actions = useMemo(() => createClimateHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return { entity, history: history ?? parsedHistory, actions };
}
