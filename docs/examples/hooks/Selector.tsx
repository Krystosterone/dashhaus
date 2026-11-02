import { useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";

/** A number re-renders only when it changes, so this badge ignores every other change in the house. */
const lightsOn = (snapshot: HaSnapshot) =>
  Object.values(snapshot.entities).filter((entity) => entity.entity_id.startsWith("light.") && entity.state === "on").length;

export function LightsOnBadge() {
  const count = useHaSelector(lightsOn);
  return <span>{count === 1 ? "1 light on" : `${count} lights on`}</span>;
}
