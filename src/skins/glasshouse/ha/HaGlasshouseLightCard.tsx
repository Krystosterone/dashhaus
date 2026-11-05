import { useHaLight } from "@dashhaus/core";
import type { HaLightOptions } from "@dashhaus/core";
import { GlasshouseLightCard } from "../cards/light/GlasshouseLightCard";
import type { GlasshouseLightCardProps } from "../cards/light/GlasshouseLightCard";

export interface HaGlasshouseLightCardProps extends HaLightOptions, Pick<GlasshouseLightCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaLight hook above Glasshouse's presentational Card. */
export function HaGlasshouseLightCard({ entityId, footprint, defaultOpen, ...options }: HaGlasshouseLightCardProps) {
  const result = useHaLight(entityId, options);
  return <GlasshouseLightCard entity={result.entity} history={result.history} onToggle={result.actions.onToggle} onBrightnessChange={result.actions.onBrightnessChange} footprint={footprint} defaultOpen={defaultOpen} />;
}
