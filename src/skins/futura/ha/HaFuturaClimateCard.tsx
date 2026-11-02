import { useHaClimate } from "@dashhaus/core";
import type { HaClimateOptions } from "@dashhaus/core";
import { FuturaClimateCard } from "../cards/climate/FuturaClimateCard";
import type { FuturaClimateCardProps } from "../cards/climate/FuturaClimateCard";

export interface HaFuturaClimateCardProps extends HaClimateOptions, Pick<FuturaClimateCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaClimate hook above Futura's presentational Card. */
export function HaFuturaClimateCard({ entityId, footprint, defaultOpen, ...options }: HaFuturaClimateCardProps) {
  const result = useHaClimate(entityId, options);
  return <FuturaClimateCard entity={result.entity} history={result.history} onToggle={result.actions.onToggle} onTargetChange={result.actions.onTargetChange} onRangeChange={result.actions.onRangeChange} onModeChange={result.actions.onModeChange} footprint={footprint} defaultOpen={defaultOpen} />;
}
