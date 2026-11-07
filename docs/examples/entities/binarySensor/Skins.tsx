import { HaBinarySensorTile } from "@dashhaus/orb";
import { HaBinarySensorModule } from "@dashhaus/field";

/** The patio door, with the battery sensor on its device. */
export function OrbDoor() {
  return <HaBinarySensorTile entityId="binary_sensor.patio_door" batteryEntityId="sensor.patio_door_battery" />;
}

/** A leak sensor under the sink as a compact row: Wet is urgent, an inverted block and the alert line. */
export function FieldLeak() {
  return <HaBinarySensorModule entityId="binary_sensor.kitchen_leak" footprint="compact" />;
}
