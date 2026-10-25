import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createToggleHandlers } from "../actions/toggle";
import type { ToggleDomain, ToggleHandlers } from "../actions/toggle";
import { toggleFromHass } from "../mappers/toggle";
import { toggleHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { useNow } from "../../hooks/useNow";
import type { ToggleEntity, ToggleIcon, ToggleHistory } from "../../domains/toggle/types";
import type { ColorName } from "../../domains/color";
import type { HaActionError } from "../types";

export interface HaToggleOptions {
  /** Required: the native domain ("input_boolean" | "switch"). */
  domain: ToggleDomain;
  name?: string;
  area?: string;
  lastSeen?: string;
  icon?: ToggleIcon;
  color?: ColorName;
  description?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: ToggleHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

export interface HaToggle {
  entity: ToggleEntity;
  history: ToggleHistory;
  actions: ToggleHandlers;
}

/** One live input_boolean or switch for any UI: the mapped entity, today's history and its toggle. */
export function useHaToggle(entityId: string, { domain, name, area, lastSeen, icon, color, description, history, loadHistory = true, onActionError }: HaToggleOptions): HaToggle {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => toggleHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => toggleFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, icon, color, description, now }), [raw, entityId, area, registryArea, name, lastSeen, icon, color, description, now]);
  const actions = useMemo(() => createToggleHandlers(store, entity, { domain, onError: onActionError }), [store, entity, domain, onActionError]);
  return { entity, history: history ?? parsedHistory, actions };
}
