import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createClimateHandlers } from "../actions/climate";
import type { ClimateHandlers } from "../actions/climate";
import { climateFromHass } from "../mappers/climate";
import { climateHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { useHaRequest } from "../useHaRequest";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import { useHourCycle } from "../../hooks/hourCycle";
import type { ClimateEntity, ClimateHistory } from "../../entities/climate/types";
import type { HaActionError, HaStore } from "../types";

export interface HaClimateOptions {
  /** Overrides Home Assistant's friendly name. */
  name?: string;
  /** Overrides the area Home Assistant's registries resolve for the entity. */
  area?: string;
  /** Overrides when the entity was last reachable, shown while it is unavailable. */
  lastSeen?: string;
  unit?: "°C" | "°F";
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: ClimateHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  /** Called with an HaActionError when an action is refused or fails. */
  onActionError?: (error: HaActionError) => void;
}

export interface HaClimateResult {
  entity: ClimateEntity;
  history: ClimateHistory;
  actions: ClimateHandlers;
}

/** Home Assistant's configuration, read once per connection, for its unit system. */
const fetchConfig = (store: HaStore) => store.callApi("get_config") as Promise<{ unit_system?: { temperature?: unknown } } | undefined>;

/** One live climate entity for any UI: the mapped entity, today's history and its service actions. */
export function useHaClimate(entityId: string, { name, area, lastSeen, unit, history, loadHistory = true, onActionError }: HaClimateOptions = {}): HaClimateResult {
  checkEntityId(entityId, ["climate"], "useHaClimate");
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const hourCycle = useHourCycle();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  // A thermostat's numbers are in the house's unit, which only the configuration says.
  const config = useHaRequest(unit ? undefined : "config", fetchConfig, { cache: true }).value;
  const systemUnit = typeof config?.unit_system?.temperature === "string" ? config.unit_system.temperature : undefined;
  const parsedHistory = useMemo(() => climateHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => climateFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, unit, systemUnit, now, hourCycle }), [raw, entityId, area, registryArea, name, lastSeen, unit, systemUnit, now, hourCycle]);
  const actions = useMemo(() => createClimateHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return { entity, history: history ?? parsedHistory, actions };
}
