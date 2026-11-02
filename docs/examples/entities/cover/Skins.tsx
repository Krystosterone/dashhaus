import { HaCoverTile } from "@dashhaus/orb";
import { HaCoverModule } from "@dashhaus/field";

export function OrbCover() {
  return <HaCoverTile entityId="cover.living_room" footprint="compact" />;
}

export function FieldCover() {
  return <HaCoverModule entityId="cover.living_room" />;
}
