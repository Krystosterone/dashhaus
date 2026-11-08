import { HaNumericTile } from "@dashhaus/orb";
import { HaNumericModule } from "@dashhaus/field";

/** The living room's CO₂: the cloud icon, the figure in ppm, today's low and high, and a warning over 1200 ppm. */
export function OrbCo2() {
  return <HaNumericTile entityId="sensor.living_room_co2" warnAbove={1200} />;
}

/** The house's energy meter as a compact row, its unit given where the entity doesn't say it. */
export function FieldEnergy() {
  return <HaNumericModule entityId="sensor.house_energy" unit="kWh" footprint="compact" />;
}
