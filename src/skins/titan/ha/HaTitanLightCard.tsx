import { useHaLight } from "@dashhaus/core";
import type { HaLightOptions } from "@dashhaus/core";
import { TitanLightCard } from "../cards/light/TitanLightCard";
import type { TitanLightCardProps } from "../cards/light/TitanLightCard";

export interface HaTitanLightCardProps extends HaLightOptions, Pick<TitanLightCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaLight hook above Titan's presentational Card: power, and the brightness fader. */
export function HaTitanLightCard({ entityId, footprint, defaultOpen, ...options }: HaTitanLightCardProps) {
  const result = useHaLight(entityId, options);
  return <TitanLightCard entity={result.entity} history={result.history} onToggle={result.actions.onToggle} onBrightnessChange={result.entity.supportsBrightness ? result.actions.onBrightnessChange : undefined} footprint={footprint} defaultOpen={defaultOpen} />;
}
