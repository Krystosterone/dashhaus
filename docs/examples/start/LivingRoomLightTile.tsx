import { HaLightTile } from "@dashhaus/orb";

/** The same light as Orb draws it: the round button, the brightness track and its details sheet. */
export function LivingRoomLightTile() {
  return <HaLightTile entityId="light.living_room" />;
}
