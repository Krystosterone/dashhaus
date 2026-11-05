import { useMemo } from "react";
import { useHaEntities, useHaEntity, useHaStore } from "../provider";
import { createOwletHandlers } from "../actions/owlet";
import type { OwletHandlers } from "../actions/owlet";
import { OWLET_ALERT_SUFFIX, owletCompanionIds, owletFromHass } from "../mappers/owlet";
import { owletHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import type { HaActionError, HassEntity } from "../types";
import type { OwletAlert, OwletEntity, OwletHistory } from "../../entities/owlet/types";

const ALERTS = Object.keys(OWLET_ALERT_SUFFIX) as OwletAlert[];

export interface HaOwletOptions {
  /** Default: the integration's `…_heart_rate` beside the sleep state sensor. */
  heartRateEntityId?: string;
  /** Default: the integration's `…_o2_saturation` beside the sleep state sensor. */
  oxygenEntityId?: string;
  /** Default: the integration's `binary_sensor.…_charging`. */
  chargingEntityId?: string;
  /** Default: the integration's `switch.…_base_station_on`, switched from the sheet. */
  baseEntityId?: string;
  /** Per alert, the binary sensor to read. Default: the integration's (`binary_sensor.…_low_oxygen_alert` …). */
  alertEntityIds?: Partial<Record<OwletAlert, string>>;
  /** Usually the baby's name. Default: the sock's device name. */
  name?: string;
  /** Overrides the area Home Assistant's registries resolve for the entity. */
  area?: string;
  /** Overrides when the entity was last reachable, shown while it is unavailable. */
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: OwletHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  /** Minutes without a changed reading before the card warns that readings stopped. Default 3. */
  staleAfterMinutes?: number;
  /** Called with an HaActionError when an action is refused or fails. */
  onActionError?: (error: HaActionError) => void;
}

export interface HaOwletResult {
  entity: OwletEntity;
  history: OwletHistory;
  actions: OwletHandlers;
}

/**
 * One live Owlet sock for any UI: composes the sleep state, readings, charging and alert sensors. Its one action is
 * the base station's switch; the readings are read-only.
 */
export function useHaOwlet(entityId: string, { heartRateEntityId, oxygenEntityId, chargingEntityId, baseEntityId, alertEntityIds, name, area, lastSeen, history, loadHistory = true, staleAfterMinutes, onActionError }: HaOwletOptions = {}): HaOwletResult {
  checkEntityId(entityId, ["sensor"], "useHaOwlet");
  const store = useHaStore();
  const derived = owletCompanionIds(entityId);
  const heartRateId = heartRateEntityId ?? derived?.heartRate;
  const oxygenId = oxygenEntityId ?? derived?.oxygen;
  const raw = useHaEntity(entityId);
  const heartRateEntity = useHaEntity(heartRateId ?? "");
  const oxygenEntity = useHaEntity(oxygenId ?? "");
  const baseId = baseEntityId ?? derived?.base;
  const baseEntity = useHaEntity(baseId ?? "");
  // The charging sensor first, then one per alert; an alert without a sensor reads as silent.
  const chargingId = chargingEntityId ?? derived?.charging;
  const binaryIds = [chargingId, ...ALERTS.map((alert) => alertEntityIds?.[alert] ?? derived?.alerts[alert])].map((id) => id ?? "");
  const binaries = useHaEntities(binaryIds);
  const [chargingEntity, alertEntities] = useMemo(
    () => [binaries[0], Object.fromEntries(ALERTS.map((alert, i) => [alert, binaries[i + 1]])) as Partial<Record<OwletAlert, HassEntity>>] as const,
    [binaries],
  );
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const ids = [entityId, heartRateId, oxygenId].filter((id): id is string => id != null);
  const records = useHaHistory(ids, loadHistory && history === undefined, now);
  const parsedHistory = useMemo(
    () => owletHistoryFromHass(records, { sleep: entityId, heartRate: heartRateId, oxygen: oxygenId }, now),
    [records, entityId, heartRateId, oxygenId, now],
  );
  const entity = useMemo(
    () => owletFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, heartRateEntity, oxygenEntity, chargingEntity, baseEntity, alertEntities, staleAfterMinutes, now }),
    [raw, entityId, name, area, registryArea, lastSeen, heartRateEntity, oxygenEntity, chargingEntity, baseEntity, alertEntities, staleAfterMinutes, now],
  );
  const actions = useMemo(() => createOwletHandlers(store, entity, { baseEntityId: baseId, onError: onActionError }), [store, entity, baseId, onActionError]);
  return { entity, history: history ?? parsedHistory, actions };
}
