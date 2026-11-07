import { HaMediaPlayerTile } from "@dashhaus/orb";
import { HaMediaPlayerModule } from "@dashhaus/field";

/** The hero of a kitchen panel: the artwork, what is playing and how far in. */
export function OrbMediaPlayer() {
  return <HaMediaPlayerTile entityId="media_player.kitchen" footprint="featured" />;
}

/** A row for a phone's column: the first key, the name and what is playing, and the screen. */
export function FieldMediaPlayer() {
  return <HaMediaPlayerModule entityId="media_player.living_room_tv" footprint="compact" />;
}
