import { useHaLight } from "@dashhaus/core";
import type { HaLightOptions } from "@dashhaus/core";
import { FuturaLightCard } from "../cards/light/FuturaLightCard";
import type { FuturaLightCardProps } from "../cards/light/FuturaLightCard";

export interface HaFuturaLightCardProps extends HaLightOptions, Pick<FuturaLightCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaLight hook above Futura's presentational Card. */
export function HaFuturaLightCard({ entityId, footprint, defaultOpen, ...options }: HaFuturaLightCardProps) {
  const result = useHaLight(entityId, options);
  return <FuturaLightCard entity={result.entity} history={result.history} onToggle={result.actions.onToggle} onBrightnessChange={result.actions.onBrightnessChange} footprint={footprint} defaultOpen={defaultOpen} />;
}
