import { useHaNumeric } from "@dashhaus/core";
import { numericFigure, withUnit } from "@dashhaus/core/entities/numeric/readings";
import { numericWords } from "@dashhaus/core/entities/numeric/words";

/** A room's CO₂ in its own words: what it measures, and the figure in its unit. */
export function LivingRoomCo2() {
  const { entity } = useHaNumeric("sensor.living_room_co2", { loadHistory: false });
  if (entity.state === "unavailable") return <p>{entity.name} is unavailable</p>;
  if (entity.value == null) return <p>{entity.name}: no reading yet</p>;
  const { label } = numericWords(entity.deviceClass);
  return <p>{entity.name}{label && ` (${label})`}: {withUnit(numericFigure(entity.value), entity.unit)}</p>;
}
