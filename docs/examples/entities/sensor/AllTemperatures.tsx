import { HaSensor, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";
import { fmt1 } from "@dashhaus/core/entities";

/** Every temperature sensor: a sensor's domain says nothing of what it measures, so read its device class. */
const temperatureIds = (snapshot: HaSnapshot) =>
  Object.values(snapshot.entities)
    .filter((entity) => entity.entity_id.startsWith("sensor.") && entity.attributes.device_class === "temperature")
    .map((entity) => entity.entity_id)
    .sort()
    .join(" ");

export function AllTemperatures() {
  const ids = useHaSelector(temperatureIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaSensor entityId={id} loadHistory={false}>
            {({ entity }) => (
              <>
                {entity.name}: {entity.temperature == null ? "—" : `${fmt1(entity.temperature)}${entity.unit}`}
              </>
            )}
          </HaSensor>
        </li>
      ))}
    </ul>
  );
}
