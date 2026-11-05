import { useHaToggle } from "@dashhaus/core";
import type { HaToggleOptions } from "@dashhaus/core";
import { TitanToggleCard } from "../cards/toggle/TitanToggleCard";
import type { TitanToggleCardProps } from "../cards/toggle/TitanToggleCard";

export interface HaTitanToggleCardProps extends HaToggleOptions, Pick<TitanToggleCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaToggle hook above Titan's presentational Card. */
export function HaTitanToggleCard({ entityId, footprint, defaultOpen, ...options }: HaTitanToggleCardProps) {
  const result = useHaToggle(entityId, options);
  return <TitanToggleCard entity={result.entity} history={result.history} onToggle={result.actions.onToggle} footprint={footprint} defaultOpen={defaultOpen} />;
}
