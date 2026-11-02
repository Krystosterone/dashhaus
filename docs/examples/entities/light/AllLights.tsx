import { HaLight, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";

/** Every light in the house, as one string, so the selector's value only changes when a light comes or goes. */
const lightIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => id.startsWith("light.")).sort().join(" ");

export function AllLights() {
  const ids = useHaSelector(lightIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaLight entityId={id} loadHistory={false}>
            {({ entity, actions }) => (
              <button type="button" aria-pressed={entity.state === "on"} onClick={actions.onToggle}>
                {entity.name}
              </button>
            )}
          </HaLight>
        </li>
      ))}
    </ul>
  );
}
