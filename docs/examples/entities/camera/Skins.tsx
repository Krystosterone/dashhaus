import { HaCameraTile } from "@dashhaus/orb";
import { HaCameraModule } from "@dashhaus/field";

/** The front door, its still refreshed every 5 seconds while it is on screen. */
export function OrbDoorbell() {
  return <HaCameraTile entityId="camera.front_door" refresh={5} />;
}

/** The nursery on a panel at night: the still holds until the panel wakes, and says when it is from. */
export function FieldNursery() {
  return <HaCameraModule entityId="camera.nursery" paused />;
}
