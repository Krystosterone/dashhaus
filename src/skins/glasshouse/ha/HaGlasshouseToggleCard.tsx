import { useHaToggle } from "@dashhaus/core";
import type { HaToggleOptions } from "@dashhaus/core";
import { GlasshouseToggleCard } from "../cards/toggle/GlasshouseToggleCard";
import type { GlasshouseToggleCardProps } from "../cards/toggle/GlasshouseToggleCard";

export interface HaGlasshouseToggleCardProps extends HaToggleOptions, Pick<GlasshouseToggleCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaToggle hook above Glasshouse's presentational Card. */
export function HaGlasshouseToggleCard({ entityId, footprint, defaultOpen, ...options }: HaGlasshouseToggleCardProps) {
  const result = useHaToggle(entityId, options);
  return <GlasshouseToggleCard entity={result.entity} history={result.history} onToggle={result.actions.onToggle} footprint={footprint} defaultOpen={defaultOpen} />;
}
