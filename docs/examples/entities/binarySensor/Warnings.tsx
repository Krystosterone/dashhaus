import { HaBinarySensor, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";
import { alertWord } from "@dashhaus/core/entities/binarySensor/words";
import { binarySensorSeverity } from "@dashhaus/core/entities/binarySensor/severity";

const sensorIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => id.startsWith("binary_sensor.")).sort().join(" ");

/**
 * Every binary sensor that needs looking at, most urgent first in your own markup: smoke, gas and carbon monoxide are
 * an alarm, a leak urgent, a low battery advisory. An open door is a state, so it never lists.
 */
export function Warnings() {
  const ids = useHaSelector(sensorIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <HaBinarySensor key={id} entityId={id} loadHistory={false}>
          {({ entity }) => {
            const severity = binarySensorSeverity(entity);
            if (!severity) return null;
            return <li data-severity={severity}>{entity.name}: {alertWord(entity) ?? `battery ${entity.battery}%`}</li>;
          }}
        </HaBinarySensor>
      ))}
    </ul>
  );
}
