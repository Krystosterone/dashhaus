import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createLightHandlers } from "../actions/light";
import type { LightHandlers } from "../actions/light";
import { lightFromHass } from "../mappers/light";
import { lightHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import type { LightEntity, LightHistory } from "../../entities/light/types";
import type { HaActionError } from "../types";

export interface HaLightOptions {
  /** Overrides Home Assistant's friendly name. */
  name?: string;
  /** Overrides the area Home Assistant's registries resolve for the entity. */
  area?: string;
  /** Overrides when the entity was last reachable, shown while it is unavailable. */
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: LightHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  /** Called with an HaActionError when an action is refused or fails. */
  onActionError?: (error: HaActionError) => void;
}

export interface HaLightResult {
  entity: LightEntity;
  history: LightHistory;
  actions: LightHandlers;
}

/** One live light for any UI: the mapped entity, today's history and its service actions. */
export function useHaLight(entityId: string, { name, area, lastSeen, history, loadHistory = true, onActionError }: HaLightOptions = {}): HaLightResult {
  checkEntityId(entityId, ["light"], "useHaLight");
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
