import { HaFanTile } from "@dashhaus/orb";
import { HaFanModule } from "@dashhaus/field";

export function OrbFan() {
  return <HaFanTile entityId="fan.bedroom" />;
}

export function FieldFan() {
  return <HaFanModule entityId="fan.living_room_ceiling" footprint="compact" />;
}
