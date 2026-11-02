import { HaLock, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";

const lockIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => id.startsWith("lock.")).sort().join(" ");

/** Every lock in the house and how it was left: a lock has no history read, so a list costs nothing extra. */
export function AllLocks() {
  const ids = useHaSelector(lockIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaLock entityId={id}>
            {({ entity }) => (
              <>
                {entity.name}: {entity.state}
                {entity.changedBy ? ` by ${entity.changedBy}` : ""}
                {entity.lastChanged ? `, ${entity.lastChanged}` : ""}
              </>
            )}
          </HaLock>
        </li>
      ))}
    </ul>
  );
}
