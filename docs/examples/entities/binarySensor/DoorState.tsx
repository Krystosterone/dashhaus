import { useHaBinarySensor } from "@dashhaus/core";
import { stateWord } from "@dashhaus/core/entities/binarySensor/words";

/** A door in its own words: Open or Closed, since when, and its battery. */
export function PatioDoor() {
  const { entity } = useHaBinarySensor("binary_sensor.patio_door", { batteryEntityId: "sensor.patio_door_battery", loadHistory: false });
  if (entity.state === "unavailable") return <p>{entity.name} is unavailable</p>;
  return (
    <p>
      {entity.name}: {stateWord(entity)}
      {entity.lastChanged ? ` since ${entity.lastChanged}` : ""}
      {entity.battery != null ? ` · battery ${entity.battery}%` : ""}
    </p>
  );
}
