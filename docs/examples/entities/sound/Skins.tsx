import { HaSoundTile } from "@dashhaus/orb";
import { HaSoundModule } from "@dashhaus/field";

export function OrbSound() {
  return <HaSoundTile entityId="switch.nursery_music" footprint="compact" />;
}

export function FieldSound() {
  return <HaSoundModule entityId="switch.nursery_music" volumeEntityId="number.nursery_volume" />;
}
