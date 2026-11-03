import { HaLockTile } from "@dashhaus/orb";
import { HaLockModule } from "@dashhaus/field";

/** The front door with the battery sensor on its device. */
export function OrbLock() {
  return <HaLockTile entityId="lock.front_door" batteryEntityId="sensor.front_door_battery" />;
}

/** A lock Home Assistant can read but you shouldn't press from this panel: its state and last change, nothing to unlock. */
export function FieldLock() {
  return <HaLockModule entityId="lock.back_door" readOnly />;
}
