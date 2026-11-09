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
   * Per companion, the entity to read in place of the one its integration names beside the fan (`sensor.<fan>_pm_2_5`
   * or `sensor.<fan>_pm2_5`, `climate.<fan>`, `switch.<fan>_night_mode`, `number.<fan>_oscillation_center_angle` …),
   * for a device renamed in Home Assistant. An empty string leaves that companion out.
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
  // Each companion's candidates, the option first: the first that exists is the one read.
  const derived = dysonCompanionIds(entityId);
  const candidates = DYSON_COMPANIONS.map((c) => {
    const given = companions?.[c];
    return given != null ? (given ? [given] : []) : derived?.[c] ?? [];
  });
  const raws = useHaEntities(candidates.flat());
  const found = useMemo(() => {
    let at = 0;
    return candidates.map((ids) => {
      const start = at;
      at += ids.length;
      const i = ids.findIndex((_, k) => raws[start + k] != null);
      return i === -1 ? undefined : { id: ids[i], raw: raws[start + i]! };
    });
    // The candidates follow the ids, which `raws` already follows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raws]);
  const companionStates = useMemo(
    () => Object.fromEntries(DYSON_COMPANIONS.flatMap((c, i) => (found[i] ? [[c, found[i]!.raw]] : []))) as Partial<Record<DysonCompanion, HassEntity>>,
    [found],
  );
  const idOf = (c: DysonCompanion) => found[DYSON_COMPANIONS.indexOf(c)]?.id;
  const nightModeEntityId = idOf("nightMode");
  const heatEntityId = idOf("heat");
  const oscillationModeEntityId = idOf("oscillationMode");
  const angleCenterEntityId = idOf("angleCenter");
  const angleSpanEntityId = idOf("angleSpan");
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
    () => createDysonHandlers(store, entity, { nightModeEntityId, heatEntityId, oscillationModeEntityId, angleCenterEntityId, angleSpanEntityId, onError: onActionError }),
    [store, entity, nightModeEntityId, heatEntityId, oscillationModeEntityId, angleCenterEntityId, angleSpanEntityId, onActionError],
  );
  return { entity, history: history ?? parsedHistory, actions };
}
