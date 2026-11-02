import { useHaToggle } from "@dashhaus/core";
import type { HaToggleOptions } from "@dashhaus/core";
import { FuturaToggleCard } from "../cards/toggle/FuturaToggleCard";
import type { FuturaToggleCardProps } from "../cards/toggle/FuturaToggleCard";

export interface HaFuturaToggleCardProps extends HaToggleOptions, Pick<FuturaToggleCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaToggle hook above Futura's presentational Card. */
export function HaFuturaToggleCard({ entityId, footprint, defaultOpen, ...options }: HaFuturaToggleCardProps) {
  const result = useHaToggle(entityId, options);
  return <FuturaToggleCard entity={result.entity} history={result.history} onToggle={result.actions.onToggle} footprint={footprint} defaultOpen={defaultOpen} />;
}
