import { useMemo } from "react";
import { useHaEntities, useHaEntity, useHaStore } from "../provider";
import { createDysonHandlers } from "../actions/dyson";
import type { DysonHandlers } from "../actions/dyson";
import { DYSON_COMPANIONS, dysonCompanionIds, dysonFromHass } from "../mappers/dyson";
import type { DysonCompanion } from "../mappers/dyson";
import { onOffHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import { useHourCycle } from "../../hooks/hourCycle";
import type { DysonEntity, DysonHistory } from "../../entities/dyson/types";
import type { HaActionError, HassEntity } from "../types";

export interface HaDysonOptions {
  /**
   * Per companion, the entity to read in place of the one `dyson_local` names beside the fan (`sensor.<fan>_pm_2_5`,
   * `climate.<fan>`, `switch.<fan>_night_mode` …), for a device renamed in Home Assistant. An empty string leaves that
   * companion out.
   */
  companions?: Partial<Record<DysonCompanion, string>>;
  /** Overrides Home Assistant's friendly name. */
  name?: string;
  /** Overrides the area Home Assistant's registries resolve for the entity. */
  area?: string;
  /** Overrides when the entity was last reachable, shown while it is unavailable. */
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: DysonHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  /** Called with an HaActionError when an action is refused or fails. */
  onActionError?: (error: HaActionError) => void;
}

export interface HaDysonResult {
  entity: DysonEntity;
  history: DysonHistory;
  actions: DysonHandlers;
}

/**
 * One live Dyson for any UI: its fan composed with the companions on its device (air quality, filters, night mode,
 * heat and oscillation range), today's on/off history, and its service actions on the fan and each companion.
 */
export function useHaDyson(entityId: string, { companions, name, area, lastSeen, history, loadHistory = true, onActionError }: HaDysonOptions = {}): HaDysonResult {
  checkEntityId(entityId, ["fan"], "useHaDyson");
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const derived = dysonCompanionIds(entityId);
  const ids = DYSON_COMPANIONS.map((c) => companions?.[c] ?? derived?.[c] ?? "");
  const raws = useHaEntities(ids);
  const companionStates = useMemo(
    () => Object.fromEntries(DYSON_COMPANIONS.flatMap((c, i) => (raws[i] ? [[c, raws[i]]] : []))) as Partial<Record<DysonCompanion, HassEntity>>,
    [raws],
  );
  const idOf = (c: DysonCompanion) => (companionStates[c] ? ids[DYSON_COMPANIONS.indexOf(c)] : undefined);
  const nightModeEntityId = idOf("nightMode");
  const heatEntityId = idOf("heat");
  const oscillationModeEntityId = idOf("oscillationMode");
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const hourCycle = useHourCycle();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => onOffHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(
    () => dysonFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now, hourCycle, companions: companionStates }),
    [raw, entityId, name, area, registryArea, lastSeen, now, hourCycle, companionStates],
  );
  const actions = useMemo(
    () => createDysonHandlers(store, entity, { nightModeEntityId, heatEntityId, oscillationModeEntityId, onError: onActionError }),
    [store, entity, nightModeEntityId, heatEntityId, oscillationModeEntityId, onActionError],
  );
  return { entity, history: history ?? parsedHistory, actions };
}
