import { HaSensorTile } from "@dashhaus/orb";
import { HaSensorModule } from "@dashhaus/field";

export function OrbRoom() {
  return <HaSensorTile entityId="sensor.living_room_temperature" humidityEntityId="sensor.living_room_humidity" />;
}

export function FieldOutside() {
  return <HaSensorModule entityId="sensor.outside_temperature" outdoor footprint="compact" />;
}
