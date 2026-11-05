import { useHaLock } from "@dashhaus/core";
import type { HaLockOptions } from "@dashhaus/core";
import { TitanLockCard } from "../cards/lock/TitanLockCard";
import type { TitanLockCardProps } from "../cards/lock/TitanLockCard";

export interface HaTitanLockCardProps extends HaLockOptions, Pick<TitanLockCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaLock hook above Titan's presentational Card. */
export function HaTitanLockCard({ entityId, footprint, defaultOpen, ...options }: HaTitanLockCardProps) {
  const result = useHaLock(entityId, options);
  return <TitanLockCard entity={result.entity} onLock={result.actions.onLock} onUnlock={result.actions.onUnlock} onOpen={result.actions.onOpen} footprint={footprint} defaultOpen={defaultOpen} />;
}
