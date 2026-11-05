import { useHaSensor } from "@dashhaus/core";
import type { HaSensorOptions } from "@dashhaus/core";
import { GlasshouseSensorCard } from "../cards/sensor/GlasshouseSensorCard";
import type { GlasshouseSensorCardProps } from "../cards/sensor/GlasshouseSensorCard";

export interface HaGlasshouseSensorCardProps extends HaSensorOptions, Pick<GlasshouseSensorCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaSensor hook above Glasshouse's presentational Card. */
export function HaGlasshouseSensorCard({ entityId, footprint, defaultOpen, ...options }: HaGlasshouseSensorCardProps) {
  const result = useHaSensor(entityId, options);
  return <GlasshouseSensorCard entity={result.entity} history={result.history} footprint={footprint} defaultOpen={defaultOpen} />;
}
