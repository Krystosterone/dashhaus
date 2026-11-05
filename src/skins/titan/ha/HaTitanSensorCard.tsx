import { useHaSensor } from "@dashhaus/core";
import type { HaSensorOptions } from "@dashhaus/core";
import { TitanSensorCard } from "../cards/sensor/TitanSensorCard";
import type { TitanSensorCardProps } from "../cards/sensor/TitanSensorCard";

export interface HaTitanSensorCardProps extends HaSensorOptions, Pick<TitanSensorCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaSensor hook above Titan's presentational Card. */
export function HaTitanSensorCard({ entityId, footprint, defaultOpen, ...options }: HaTitanSensorCardProps) {
  const result = useHaSensor(entityId, options);
  return <TitanSensorCard entity={result.entity} history={result.history} footprint={footprint} defaultOpen={defaultOpen} />;
}
