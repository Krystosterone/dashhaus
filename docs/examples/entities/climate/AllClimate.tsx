import { HaClimate, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";

const climateIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => id.startsWith("climate.")).sort().join(" ");

export function AllClimate() {
  const ids = useHaSelector(climateIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaClimate entityId={id} loadHistory={false}>
            {({ entity }) => (
              <>
                {entity.name}: {entity.currentTemperature ?? "—"}
                {entity.unit} ({entity.state})
              </>
            )}
          </HaClimate>
        </li>
      ))}
    </ul>
  );
}
