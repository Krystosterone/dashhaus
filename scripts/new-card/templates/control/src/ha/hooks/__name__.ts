import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { create__Name__Handlers } from "../actions/__name__";
import type { __Name__Handlers } from "../actions/__name__";
import { __name__FromHass } from "../mappers/__name__";
import { onOffHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { useNow } from "../../hooks/useNow";
import type { __Name__Entity, __Name__History } from "../../domains/__name__/types";
import type { HaActionError } from "../types";

export interface Ha__Name__Options {
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: __Name__History;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

export interface Ha__Name__Result {
  entity: __Name__Entity;
  history: __Name__History;
  actions: __Name__Handlers;
}

/** One live __label__ for any UI: the mapped entity, today's history and its service actions. */
export function useHa__Name__(entityId: string, { name, area, lastSeen, history, loadHistory = true, onActionError }: Ha__Name__Options = {}): Ha__Name__Result {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => onOffHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => __name__FromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now }), [raw, entityId, name, area, registryArea, lastSeen, now]);
  const actions = useMemo(() => create__Name__Handlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return { entity, history: history ?? parsedHistory, actions };
}
