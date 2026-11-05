import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createToggleHandlers } from "../actions/toggle";
import type { ToggleHandlers } from "../actions/toggle";
import { toggleFromHass } from "../mappers/toggle";
import { toggleHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import type { ToggleEntity, ToggleIcon, ToggleHistory } from "../../entities/toggle/types";
import type { HaActionError } from "../types";

export interface HaToggleOptions {
  /** Overrides Home Assistant's friendly name. */
  name?: string;
  /** Overrides the area Home Assistant's registries resolve for the entity. */
  area?: string;
  /** Overrides when the entity was last reachable, shown while it is unavailable. */
  lastSeen?: string;
  icon?: ToggleIcon;
  description?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: ToggleHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  /** Called with an HaActionError when an action is refused or fails. */
  onActionError?: (error: HaActionError) => void;
}

export interface HaToggleResult {
  entity: ToggleEntity;
  history: ToggleHistory;
  actions: ToggleHandlers;
}

/** One live input_boolean or switch for any UI: the mapped entity, today's history and its toggle. */
export function useHaToggle(entityId: string, { name, area, lastSeen, icon, description, history, loadHistory = true, onActionError }: HaToggleOptions = {}): HaToggleResult {
  checkEntityId(entityId, ["input_boolean", "switch"], "useHaToggle");
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => toggleHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => toggleFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, icon, description, now }), [raw, entityId, area, registryArea, name, lastSeen, icon, description, now]);
  const actions = useMemo(() => createToggleHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return { entity, history: history ?? parsedHistory, actions };
}
