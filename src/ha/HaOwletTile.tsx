import { useMemo } from "react";
import { useHaEntities, useHaEntity, useHaStore } from "./provider";
import { createOwletHandlers } from "./actions/owlet";
import { OWLET_ALERT_SUFFIX, owletCompanionIds, owletFromHass } from "./mappers/owlet";
import { owletHistoryFromHass } from "./history";
import { useHaArea } from "./registry";
import { useHaHistory } from "./useHaHistory";
import { useNow } from "../shared/useNow";
import { OwletTile } from "../widgets/owlet/OwletTile";
import type { OwletTileProps } from "../widgets/owlet/OwletTile";
import type { HaActionError, HassEntity } from "./types";
import type { OwletAlert, OwletHistory } from "../domains/owlet/types";

const ALERTS = Object.keys(OWLET_ALERT_SUFFIX) as OwletAlert[];

export interface HaOwletTileProps extends Omit<OwletTileProps, "entity" | "onBaseToggle"> {
  /** The sock's sleep state sensor, `sensor.owlet_sock_<serial>_sleep_state` (custom `owlet` integration). */
  entityId: string;
  /** Default: the integration's `…_heart_rate` beside `entityId`. */
  heartRateEntityId?: string;
  /** Default: the integration's `…_o2_saturation` beside `entityId`. */
  oxygenEntityId?: string;
  /** Default: the integration's `binary_sensor.…_charging`. */
  chargingEntityId?: string;
  /** Default: the integration's `switch.…_base_station_on`, switched from the sheet. */
  baseEntityId?: string;
  /** Per alert, the binary sensor to read. Default: the integration's (`binary_sensor.…_low_oxygen_alert` …). */
  alertEntityIds?: Partial<Record<OwletAlert, string>>;
  /** Usually the baby's name. Default: the sock's device name. */
  name?: string;
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: OwletHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  /** Minutes without a changed reading before the card warns that readings stopped. Default 3. */
  staleAfterMinutes?: number;
  onActionError?: (error: HaActionError) => void;
}

/**
 * A live Owlet sock tile: composes the sleep state, readings, charging and alert sensors above the tile. Its one
 * action is the base station's switch, in the sheet; the readings are read-only.
 */
export function HaOwletTile({ entityId, heartRateEntityId, oxygenEntityId, chargingEntityId, baseEntityId, alertEntityIds, name, area, lastSeen, history, loadHistory = true, staleAfterMinutes, onActionError, ...props }: HaOwletTileProps) {
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
  const handlers = useMemo(() => createOwletHandlers(store, entity, { baseEntityId: baseId, onError: onActionError }), [store, entity, baseId, onActionError]);
  return <OwletTile {...props} entity={entity} history={history ?? parsedHistory} {...handlers} />;
}
