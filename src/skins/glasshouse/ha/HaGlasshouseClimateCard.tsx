import { useHaClimate } from "@dashhaus/core";
import type { HaClimateOptions } from "@dashhaus/core";
import { GlasshouseClimateCard } from "../cards/climate/GlasshouseClimateCard";
import type { GlasshouseClimateCardProps } from "../cards/climate/GlasshouseClimateCard";

export interface HaGlasshouseClimateCardProps extends HaClimateOptions, Pick<GlasshouseClimateCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaClimate hook above Glasshouse's presentational Card. */
export function HaGlasshouseClimateCard({ entityId, footprint, defaultOpen, ...options }: HaGlasshouseClimateCardProps) {
  const result = useHaClimate(entityId, options);
  return <GlasshouseClimateCard entity={result.entity} history={result.history} onToggle={result.actions.onToggle} onTargetChange={result.actions.onTargetChange} onModeChange={result.actions.onModeChange} footprint={footprint} defaultOpen={defaultOpen} />;
}
