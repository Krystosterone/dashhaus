import { HaDysonTile } from "@dashhaus/orb";
import { HaDysonModule } from "@dashhaus/field";

export function OrbDyson() {
  return <HaDysonTile entityId="fan.bedroom_purifier" />;
}

export function FieldDyson() {
  return <HaDysonModule entityId="fan.living_room_hot_cool" footprint="compact" />;
}
