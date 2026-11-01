import { HaCover, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";

const coverIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => id.startsWith("cover.")).sort().join(" ");

/** Every cover, and a button that closes whichever are open. */
export function AllCovers() {
  const ids = useHaSelector(coverIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaCover entityId={id} loadHistory={false}>
            {({ entity, actions }) => (
              <>
                {entity.name} ({entity.deviceClass}): {entity.state}
                {entity.state === "open" && (
                  <button type="button" onClick={actions.onCloseCover}>
                    Close
                  </button>
                )}
              </>
            )}
          </HaCover>
        </li>
      ))}
    </ul>
  );
}
