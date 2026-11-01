import { HaHumidifier, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";

const humidifierIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => id.startsWith("humidifier.")).sort().join(" ");

export function AllHumidifiers() {
  const ids = useHaSelector(humidifierIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaHumidifier entityId={id} loadHistory={false}>
            {({ entity }) => (
              <>
                {entity.name}: {entity.action ?? entity.state}, {entity.currentHumidity ?? "—"}%
              </>
            )}
          </HaHumidifier>
        </li>
      ))}
    </ul>
  );
}
