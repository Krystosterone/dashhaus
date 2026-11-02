import { useHaLight } from "@dashhaus/core";
import type { HaLightOptions } from "@dashhaus/core";
import { LcarsLightCard } from "../cards/light/LcarsLightCard";
import type { LcarsLightCardProps } from "../cards/light/LcarsLightCard";

export interface HaLcarsLightCardProps extends HaLightOptions, Pick<LcarsLightCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaLight hook above Lcars's presentational Card. */
export function HaLcarsLightCard({ entityId, footprint, defaultOpen, ...options }: HaLcarsLightCardProps) {
  const result = useHaLight(entityId, options);
  return <LcarsLightCard entity={result.entity} history={result.history} onToggle={result.actions.onToggle} footprint={footprint} defaultOpen={defaultOpen} />;
}
