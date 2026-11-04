import { HaLightModule } from "@dashhaus/field";

/** The same light as Field draws it: a key, a fader and a screen, with its detail panel. */
export function LivingRoomLightModule() {
  return <HaLightModule entityId="light.living_room" />;
}
