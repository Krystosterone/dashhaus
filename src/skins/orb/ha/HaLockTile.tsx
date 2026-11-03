import { useHaLock } from "@dashhaus/core";
import type { HaLockOptions } from "@dashhaus/core";
import { LockTile } from "../cards/lock/LockTile";
import type { LockTileProps } from "../cards/lock/LockTile";

export interface HaLockTileProps extends HaLockOptions, Omit<LockTileProps, "entity" | "onLock" | "onUnlock" | "onOpenDoor"> {
  entityId: string;
}

/** A live lock tile: the useHaLock hook, with its device's battery, above the presentational tile. */
export function HaLockTile({ entityId, batteryEntityId, name, area, lastSeen, onActionError, ...props }: HaLockTileProps) {
  const { entity, actions } = useHaLock(entityId, { batteryEntityId, name, area, lastSeen, onActionError });
  return <LockTile {...props} entity={entity} onLock={actions.onLock} onUnlock={actions.onUnlock} onOpenDoor={actions.onOpen} />;
}
