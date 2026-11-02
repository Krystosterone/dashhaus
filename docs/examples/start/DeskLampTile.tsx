import { HaLightTile } from "@dashhaus/orb";

/** The same light as Orb draws it: the round button, the brightness track and its details sheet. */
export function DeskLampTile() {
  return <HaLightTile entityId="light.desk" />;
}
