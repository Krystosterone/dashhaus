import { useHaEntity } from "@dashhaus/core";

/** Any entity, raw: Home Assistant's state and attributes as they arrive, for a domain with no model yet. */
export function MediaTitle() {
  const player = useHaEntity("media_player.living_room");
  if (!player || player.state === "unavailable") return null;
  const title = player.attributes.media_title;
  return <p>Now playing: {typeof title === "string" ? title : player.state}</p>;
}
