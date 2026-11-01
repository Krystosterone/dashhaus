import { HaClimateTile } from "@dashhaus/orb";
import { HaClimateModule } from "@dashhaus/field";

export function OrbClimate() {
  return <HaClimateTile entityId="climate.living_room" unit="°C" />;
}

export function FieldClimate() {
  return <HaClimateModule entityId="climate.living_room" name="Thermostat" />;
}
