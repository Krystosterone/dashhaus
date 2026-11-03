import { HaFan, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";

const fanIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => id.startsWith("fan.")).sort().join(" ");

export function AllFans() {
  const ids = useHaSelector(fanIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaFan entityId={id} loadHistory={false}>
            {({ entity }) => (
              <>
                {entity.name}: {entity.state === "on" && entity.percentage != null ? `${entity.percentage}%` : entity.state}
              </>
            )}
          </HaFan>
        </li>
      ))}
    </ul>
  );
}
