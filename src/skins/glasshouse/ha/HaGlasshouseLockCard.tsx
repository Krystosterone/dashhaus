import { useHaLock } from "@dashhaus/core";
import type { HaLockOptions } from "@dashhaus/core";
import { GlasshouseLockCard } from "../cards/lock/GlasshouseLockCard";
import type { GlasshouseLockCardProps } from "../cards/lock/GlasshouseLockCard";

export interface HaGlasshouseLockCardProps extends HaLockOptions, Pick<GlasshouseLockCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaLock hook above Glasshouse's presentational Card. */
export function HaGlasshouseLockCard({ entityId, footprint, defaultOpen, ...options }: HaGlasshouseLockCardProps) {
  const result = useHaLock(entityId, options);
  return <GlasshouseLockCard entity={result.entity} onLock={result.actions.onLock} onUnlock={result.actions.onUnlock} onOpen={result.actions.onOpen} footprint={footprint} defaultOpen={defaultOpen} />;
}
