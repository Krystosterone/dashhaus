import { useHaSensor } from "@dashhaus/core";
import type { HaSensorOptions } from "@dashhaus/core";
import { LcarsSensorCard } from "../cards/sensor/LcarsSensorCard";
import type { LcarsSensorCardProps } from "../cards/sensor/LcarsSensorCard";

export interface HaLcarsSensorCardProps extends HaSensorOptions, Pick<LcarsSensorCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaSensor hook above Lcars's presentational Card. */
export function HaLcarsSensorCard({ entityId, footprint, defaultOpen, ...options }: HaLcarsSensorCardProps) {
  const result = useHaSensor(entityId, options);
  return <LcarsSensorCard entity={result.entity} history={result.history} footprint={footprint} defaultOpen={defaultOpen} />;
}
