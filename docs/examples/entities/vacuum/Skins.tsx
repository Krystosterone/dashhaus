import { HaVacuumTile } from "@dashhaus/orb";
import { HaVacuumModule } from "@dashhaus/field";

export function OrbVacuum() {
  return <HaVacuumTile entityId="vacuum.robot_vacuum" />;
}

/** A row for a phone's column: the first key, the name, and the screen. */
export function FieldVacuum() {
  return <HaVacuumModule entityId="vacuum.upstairs_vacuum" footprint="compact" />;
}
