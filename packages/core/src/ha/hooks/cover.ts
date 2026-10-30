import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createCoverHandlers } from "../actions/cover";
import type { CoverHandlers } from "../actions/cover";
import { coverFromHass } from "../mappers/cover";
import { coverHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { useNow } from "../../hooks/useNow";
import type { CoverEntity, CoverHistory } from "../../entities/cover/types";
import type { HaActionError } from "../types";

export interface HaCoverOptions {
  name?: string;
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: CoverHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

export interface HaCoverResult {
  entity: CoverEntity;
  history: CoverHistory;
  actions: CoverHandlers;
}

/** One live cover for any UI: the mapped entity, today's history and its service actions. */
export function useHaCover(entityId: string, { name, area, lastSeen, history, loadHistory = true, onActionError }: HaCoverOptions = {}): HaCoverResult {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => coverHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => coverFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now }), [raw, entityId, area, registryArea, name, lastSeen, now]);
  const actions = useMemo(() => createCoverHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return { entity, history: history ?? parsedHistory, actions };
}
