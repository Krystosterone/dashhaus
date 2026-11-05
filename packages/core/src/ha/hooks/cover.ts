import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createCoverHandlers } from "../actions/cover";
import type { CoverHandlers } from "../actions/cover";
import { coverFromHass } from "../mappers/cover";
import { coverHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import type { CoverEntity, CoverHistory } from "../../entities/cover/types";
import type { HaActionError } from "../types";

export interface HaCoverOptions {
  /** Overrides Home Assistant's friendly name. */
  name?: string;
  /** Overrides the area Home Assistant's registries resolve for the entity. */
  area?: string;
  /** Overrides when the entity was last reachable, shown while it is unavailable. */
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: CoverHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  /** Called with an HaActionError when an action is refused or fails. */
  onActionError?: (error: HaActionError) => void;
}

export interface HaCoverResult {
  entity: CoverEntity;
  history: CoverHistory;
  actions: CoverHandlers;
}

/** One live cover for any UI: the mapped entity, today's history and its service actions. */
export function useHaCover(entityId: string, { name, area, lastSeen, history, loadHistory = true, onActionError }: HaCoverOptions = {}): HaCoverResult {
  checkEntityId(entityId, ["cover"], "useHaCover");
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
