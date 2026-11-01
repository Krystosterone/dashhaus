import { HaHumidifierTile } from "@dashhaus/orb";
import { HaHumidifierModule } from "@dashhaus/field";

export function OrbHumidifier() {
  return <HaHumidifierTile entityId="humidifier.nursery" />;
}

export function FieldHumidifier() {
  return <HaHumidifierModule entityId="humidifier.nursery" footprint="compact" />;
}
