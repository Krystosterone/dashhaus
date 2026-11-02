import { useHaSensor } from "@dashhaus/core";
import type { HaSensorOptions } from "@dashhaus/core";
import { FuturaSensorCard } from "../cards/sensor/FuturaSensorCard";
import type { FuturaSensorCardProps } from "../cards/sensor/FuturaSensorCard";

export interface HaFuturaSensorCardProps extends HaSensorOptions, Pick<FuturaSensorCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaSensor hook above Futura's presentational Card. */
export function HaFuturaSensorCard({ entityId, footprint, defaultOpen, ...options }: HaFuturaSensorCardProps) {
  const result = useHaSensor(entityId, options);
  return <FuturaSensorCard entity={result.entity} history={result.history} footprint={footprint} defaultOpen={defaultOpen} />;
}
