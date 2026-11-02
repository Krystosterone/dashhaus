import { HaLightTile } from "@dashhaus/orb";
import { HaLightModule } from "@dashhaus/field";

export function OrbLight() {
  return <HaLightTile entityId="light.living_room" footprint="featured" />;
}

export function FieldLight() {
  return <HaLightModule entityId="light.living_room" footprint="compact" />;
}
