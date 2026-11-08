import { HaSunTile } from "@dashhaus/orb";
import { HaSunModule } from "@dashhaus/field";

/** The sun with today's path, from Home Assistant's own location. */
export function OrbSun() {
  return <HaSunTile entityId="sun.sun" footprint="featured" />;
}

/** The same as a compact row: the countdown on the row's line, the time on the screen. */
export function FieldSun() {
  return <HaSunModule entityId="sun.sun" footprint="compact" />;
}
