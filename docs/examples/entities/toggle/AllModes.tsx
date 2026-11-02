import { HaToggle, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";

/** Every input_boolean: the house's modes. Switches are often devices, so this list leaves them out. */
const modeIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => id.startsWith("input_boolean.")).sort().join(" ");

export function AllModes() {
  const ids = useHaSelector(modeIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaToggle entityId={id} loadHistory={false}>
            {({ entity, actions }) => (
              <button type="button" role="switch" aria-checked={entity.state === "on"} onClick={actions.onToggle}>
                {entity.name}
              </button>
            )}
          </HaToggle>
        </li>
      ))}
    </ul>
  );
}
