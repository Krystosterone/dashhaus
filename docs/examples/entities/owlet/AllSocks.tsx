import { HaOwlet, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";

/** Every sock, by its sleep state sensor, the way the Lovelace cards find them. */
const sockIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => /^sensor\.\w+_sleep_state$/.test(id)).sort().join(" ");

export function AllSocks() {
  const ids = useHaSelector(sockIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaOwlet entityId={id} loadHistory={false}>
            {({ entity }) => (
              <>
                {entity.name}: {entity.alerts?.length ? "alert" : entity.state.replace("_", " ")}
              </>
            )}
          </HaOwlet>
        </li>
      ))}
    </ul>
  );
}
