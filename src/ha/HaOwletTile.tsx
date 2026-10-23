import { useMemo } from "react";
import { useHaEntity } from "./provider";
import { owletCompanionIds, owletFromHass } from "./mappers/owlet";
import { owletHistoryFromHass } from "./history";
import { useHaArea } from "./registry";
import { useHaHistory } from "./useHaHistory";
import { useNow } from "../shared/useNow";
import { OwletTile } from "../widgets/owlet/OwletTile";
import type { OwletTileProps } from "../widgets/owlet/OwletTile";
import type { OwletHistory } from "../widgets/owlet/types";

export interface HaOwletTileProps extends Omit<OwletTileProps, "entity"> {
  /** The sock's sleep state sensor, `sensor.owlet_sock_<serial>_sleep_state` (custom `owlet` integration). */
  entityId: string;
  /** Default: the integration's `…_heart_rate` beside `entityId`. */
  heartRateEntityId?: string;
  /** Default: the integration's `…_o2_saturation` beside `entityId`. */
  oxygenEntityId?: string;
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
}

/** A live, read-only Owlet sock tile: composes the sleep state, heart rate and oxygen sensors above the tile. */
export function HaOwletTile({ entityId, heartRateEntityId, oxygenEntityId, name, area, lastSeen, history, loadHistory = true, staleAfterMinutes, ...props }: HaOwletTileProps) {
  const derived = owletCompanionIds(entityId);
  const heartRateId = heartRateEntityId ?? derived?.heartRate;
  const oxygenId = oxygenEntityId ?? derived?.oxygen;
  const raw = useHaEntity(entityId);
  const heartRateEntity = useHaEntity(heartRateId ?? "");
  const oxygenEntity = useHaEntity(oxygenId ?? "");
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const ids = [entityId, heartRateId, oxygenId].filter((id): id is string => id != null);
  const records = useHaHistory(ids, loadHistory && history === undefined, now);
  const parsedHistory = useMemo(
    () => owletHistoryFromHass(records, { sleep: entityId, heartRate: heartRateId, oxygen: oxygenId }, now),
    [records, entityId, heartRateId, oxygenId, now],
  );
  const entity = useMemo(
    () => owletFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, heartRateEntity, oxygenEntity, staleAfterMinutes, now }),
    [raw, entityId, name, area, registryArea, lastSeen, heartRateEntity, oxygenEntity, staleAfterMinutes, now],
  );
  return <OwletTile {...props} entity={entity} history={history ?? parsedHistory} />;
}
