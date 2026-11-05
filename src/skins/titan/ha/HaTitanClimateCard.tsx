import { useHaClimate } from "@dashhaus/core";
import type { HaClimateOptions } from "@dashhaus/core";
import { TitanClimateCard } from "../cards/climate/TitanClimateCard";
import type { TitanClimateCardProps } from "../cards/climate/TitanClimateCard";

export interface HaTitanClimateCardProps extends HaClimateOptions, Pick<TitanClimateCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaClimate hook above Titan's presentational Card: power, the setpoint fader and the mode keys. */
export function HaTitanClimateCard({ entityId, footprint, defaultOpen, ...options }: HaTitanClimateCardProps) {
  const result = useHaClimate(entityId, options);
  const { onToggle, onTargetChange, onModeChange } = result.actions;
  return <TitanClimateCard entity={result.entity} history={result.history} onToggle={onToggle} onTargetChange={onTargetChange} onModeChange={onModeChange} footprint={footprint} defaultOpen={defaultOpen} />;
}
