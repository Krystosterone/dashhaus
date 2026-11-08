import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createVacuumHandlers } from "../actions/vacuum";
import type { VacuumHandlers } from "../actions/vacuum";
import { vacuumFromHass } from "../mappers/vacuum";
import { vacuumHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { useNow } from "../../hooks/useNow";
import { useHourCycle } from "../../hooks/hourCycle";
import type { VacuumEntity, VacuumHistory } from "../../entities/vacuum/types";
import type { HaActionError } from "../types";

export interface HaVacuumOptions {
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: VacuumHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

export interface HaVacuumResult {
  entity: VacuumEntity;
  history: VacuumHistory;
  actions: VacuumHandlers;
}

/**
 * One live robot vacuum for any UI: the mapped entity (its battery is its own attribute, not a companion), today's
 * cleaning, and its service actions.
 */
export function useHaVacuum(entityId: string, { name, area, lastSeen, history, loadHistory = true, onActionError }: HaVacuumOptions = {}): HaVacuumResult {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const hourCycle = useHourCycle();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => vacuumHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => vacuumFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now, hourCycle }), [raw, entityId, name, area, registryArea, lastSeen, now, hourCycle]);
  const actions = useMemo(() => createVacuumHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return { entity, history: history ?? parsedHistory, actions };
}
