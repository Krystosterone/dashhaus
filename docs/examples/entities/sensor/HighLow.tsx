import { useHaSensor } from "@dashhaus/core";
import { fmt1 } from "@dashhaus/core/entities";

/** Today's high and low so far, from the hourly readings the hook reads from Home Assistant's recorder. */
export function HighLow({ entityId }: { entityId: string }) {
  const { entity, history } = useHaSensor(entityId);
  const readings = history.temperature.filter((reading): reading is number => typeof reading === "number");
  if (readings.length === 0) return <p>{entity.name}: no readings yet today</p>;
  return (
    <p>
      {entity.name} today: {fmt1(Math.min(...readings))} to {fmt1(Math.max(...readings))}
      {entity.unit}
    </p>
  );
}
