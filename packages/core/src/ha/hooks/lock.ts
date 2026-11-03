import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createLockHandlers } from "../actions/lock";
import type { LockHandlers } from "../actions/lock";
import { lockFromHass } from "../mappers/lock";
import { useHaArea } from "../registry";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import type { LockEntity } from "../../entities/lock/types";
import type { HaActionError } from "../types";

export interface HaLockOptions {
  /** Optional companion on the same device, `device_class: battery` (the automatic layout finds it). */
  batteryEntityId?: string;
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  lastSeen?: string;
  onActionError?: (error: HaActionError) => void;
}

export interface HaLockResult {
  entity: LockEntity;
  actions: LockHandlers;
}

/**
 * One live lock for any UI: the mapped entity composed with its device's battery, and its lock, unlock and open
 * actions. A lock shows its last change only, so there is no history read.
 */
export function useHaLock(entityId: string, { batteryEntityId, name, area, lastSeen, onActionError }: HaLockOptions = {}): HaLockResult {
  checkEntityId(entityId, ["lock"], "useHaLock");
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const batteryEntity = useHaEntity(batteryEntityId ?? "");
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const entity = useMemo(
    () => lockFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, batteryEntity, now }),
    [raw, entityId, name, area, registryArea, lastSeen, batteryEntity, now],
  );
  const actions = useMemo(() => createLockHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return { entity, actions };
}
