import { useHaOwlet } from "../../../ha/hooks/owlet";
import type { HaOwletOptions } from "../../../ha/hooks/owlet";
import type { OwletHandlers } from "../../../ha/actions/owlet";
import { OwletTile } from "../widgets/owlet/OwletTile";
import type { OwletTileProps } from "../widgets/owlet/OwletTile";

export interface HaOwletTileProps extends HaOwletOptions, Omit<OwletTileProps, "entity" | "history" | keyof OwletHandlers> {
  /** The sock's sleep state sensor, `sensor.owlet_sock_<serial>_sleep_state` (custom `owlet` integration). */
  entityId: string;
}

/** A live Owlet sock tile: the useHaOwlet hook above the presentational tile. */
export function HaOwletTile({ entityId, heartRateEntityId, oxygenEntityId, chargingEntityId, baseEntityId, alertEntityIds, name, area, lastSeen, history, loadHistory, staleAfterMinutes, onActionError, ...props }: HaOwletTileProps) {
  const owlet = useHaOwlet(entityId, { heartRateEntityId, oxygenEntityId, chargingEntityId, baseEntityId, alertEntityIds, name, area, lastSeen, history, loadHistory, staleAfterMinutes, onActionError });
  return <OwletTile {...props} entity={owlet.entity} history={owlet.history} {...owlet.actions} />;
}
