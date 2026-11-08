import { HaVacuum, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";
import { vacuumWarning, vacuumWord } from "@dashhaus/core/entities/vacuum/words";

const vacuumIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => id.startsWith("vacuum.")).sort().join(" ");

/** Every robot vacuum in the house, what it is doing, and its warning: an error, or a low battery away from its dock. */
export function AllVacuums() {
  const ids = useHaSelector(vacuumIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaVacuum entityId={id} loadHistory={false}>
            {({ entity }) => (
              <>
                {entity.name}: {vacuumWord(entity)}
                {vacuumWarning(entity) ? ` (${vacuumWarning(entity)})` : ""}
              </>
            )}
          </HaVacuum>
        </li>
      ))}
    </ul>
  );
}
