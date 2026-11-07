import { useHaNumeric } from "@dashhaus/core";
import { numericToday } from "@dashhaus/core/entities/numeric/readings";

/**
 * Today in one line: a measurement's low and high ("Low 470 ppm · High 940 ppm"), or how far a meter that only climbs
 * rose since the day's first reading ("+8.6 kWh today").
 */
export function EnergyToday() {
  const { entity, history } = useHaNumeric("sensor.house_energy");
  return <p>{entity.name}: {numericToday(entity, history).long}</p>;
}
