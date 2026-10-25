import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createLightHandlers } from "../actions/light";
import type { LightHandlers } from "../actions/light";
import { lightFromHass } from "../mappers/light";
import { lightHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { useNow } from "../../hooks/useNow";
import type { LightEntity, LightHistory } from "../../domains/light/types";
import type { HaActionError } from "../types";

export interface HaLightOptions {
  name?: string;
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: LightHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

export interface HaLight {
  entity: LightEntity;
  history: LightHistory;
  actions: LightHandlers;
}

/** One live light for any UI: the mapped entity, today's history and its service actions. */
export function useHaLight(entityId: string, { name, area, lastSeen, history, loadHistory = true, onActionError }: HaLightOptions = {}): HaLight {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => lightHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => lightFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now }), [raw, entityId, area, registryArea, name, lastSeen, now]);
  const actions = useMemo(() => createLightHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return { entity, history: history ?? parsedHistory, actions };
}
