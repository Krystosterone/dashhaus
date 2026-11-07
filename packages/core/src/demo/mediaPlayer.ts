import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import { ARTWORK_SUNDAY, ARTWORK_TIDES } from "../seeds/pictures";
import { createDemoTransport } from "./transport";
import type { DemoChange, DemoServices } from "./transport";

const stamp = "2026-10-19T11:20:00Z";
/**
 * `MediaPlayerEntityFeature`: pause 1, volume set 4, volume mute 8, previous 16, next 32, turn on 128, turn off 256,
 * select source 2048, play 16384.
 */
const ALL = 1 | 4 | 8 | 16 | 32 | 128 | 256 | 2048 | 16384;

/** The tracks the demo plays, each with its artwork's path as Home Assistant's proxy gives it (a hash per track). */
const TRACKS = [
  { media_title: "Sunday Morning", media_artist: "Maroon 5", media_album_name: "Songs About Jane", media_duration: 245, art: "sunday" },
  { media_title: "Tides", media_artist: "Ólafur Arnalds", media_album_name: "Some Kind of Peace", media_duration: 312, art: "tides" },
  { media_title: "Holocene", media_artist: "Bon Iver", media_album_name: "Bon Iver, Bon Iver", media_duration: 337, art: undefined },
];
const proxy = (entityId: string, art?: string) => (art ? `/api/media_player_proxy/${entityId}?token=demo&cache=${art}` : undefined);
const track = (entityId: string, index: number) => {
  const { art, ...attributes } = TRACKS[index];
  return { ...attributes, entity_picture: proxy(entityId, art) };
};

const initial: HassEntities = {
  "media_player.kitchen_speaker": {
    entity_id: "media_player.kitchen_speaker",
    state: "playing",
    attributes: {
      friendly_name: "Kitchen speaker", ...track("media_player.kitchen_speaker", 0), media_position: 83, media_position_updated_at: stamp,
      volume_level: 0.45, is_volume_muted: false, source: "Spotify", source_list: ["Spotify", "Radio", "TV"], app_name: "Spotify", supported_features: ALL,
    },
    last_changed: stamp,
    last_updated: stamp,
  },
  "media_player.living_room_tv": {
    entity_id: "media_player.living_room_tv",
    state: "off",
    attributes: { friendly_name: "Living room TV", source_list: ["HDMI 1", "HDMI 2", "Live TV", "Netflix"], supported_features: 4 | 8 | 128 | 256 | 2048 },
    last_changed: stamp,
    last_updated: stamp,
  },
};

/** The artwork the demo serves, by the path Home Assistant's proxy gives it: one per track, by its cache hash. */
export const DEMO_MEDIA_PLAYER_PICTURES: Record<string, string> = {
  "/api/media_player_proxy/media_player.kitchen_speaker?token=demo&cache=sunday": ARTWORK_SUNDAY,
  "/api/media_player_proxy/media_player.kitchen_speaker?token=demo&cache=tides": ARTWORK_TIDES,
};

/** Where it is now, from its last position and how long it has played since. */
function positionNow({ state, attributes }: HassEntity, at: number) {
  const position = Number(attributes.media_position);
  if (!Number.isFinite(position)) return undefined;
  const read = Date.parse(String(attributes.media_position_updated_at));
  const since = state === "playing" && Number.isFinite(read) ? Math.max(0, (at - read) / 1000) : 0;
  const duration = Number(attributes.media_duration);
  return Math.min(Number.isFinite(duration) ? duration : Infinity, position + since);
}

/** What a media player's services do, as most integrations answer: what it doesn't support, or can't do now, throws. */
export function mediaPlayerServices(): DemoServices {
  const live = (state: string) => {
    if (state === "unavailable" || state === "unknown") throw new Error("Demo media player is unavailable");
  };
  const supports = (features: unknown, bit: number, what: string) => {
    if ((Number(features) & bit) === 0) throw new Error(`Demo media player doesn't ${what}`);
  };
  /** A playing state, its position read now so the clock carries on from where it was. */
  const settle = (entity: HassEntity, state: string): DemoChange => {
    const now = Date.now();
    const position = positionNow(entity, now);
    return { state, attributes: position == null ? {} : { media_position: position, media_position_updated_at: new Date(now).toISOString() } };
  };
  const skip = (entity: HassEntity, by: number): DemoChange => {
    const index = TRACKS.findIndex((t) => t.media_title === entity.attributes.media_title);
    const next = (index + by + TRACKS.length) % TRACKS.length;
    return { state: "playing", attributes: { ...track(entity.entity_id, next), media_position: 0, media_position_updated_at: new Date().toISOString() } };
  };
  return {
    "media_player.media_play": ({ entity }) => {
      live(entity.state);
      supports(entity.attributes.supported_features, 16384, "play");
      return settle(entity, "playing");
    },
    "media_player.media_pause": ({ entity }) => {
      live(entity.state);
      supports(entity.attributes.supported_features, 1, "pause");
      return settle(entity, "paused");
    },
    "media_player.media_previous_track": ({ entity }) => {
      live(entity.state);
      supports(entity.attributes.supported_features, 16, "skip back");
      return skip(entity, -1);
    },
    "media_player.media_next_track": ({ entity }) => {
      live(entity.state);
      supports(entity.attributes.supported_features, 32, "skip on");
      return skip(entity, 1);
    },
    "media_player.turn_on": ({ entity }) => {
      live(entity.state);
      supports(entity.attributes.supported_features, 128, "turn on");
      return { state: "idle", attributes: { volume_level: entity.attributes.volume_level ?? 0.2, is_volume_muted: false, source: entity.attributes.source ?? (entity.attributes.source_list as string[] | undefined)?.[0] } };
    },
    "media_player.turn_off": ({ entity }) => {
      live(entity.state);
      supports(entity.attributes.supported_features, 256, "turn off");
      return { state: "off" };
    },
    "media_player.volume_set": ({ entity, data }) => {
      live(entity.state);
      supports(entity.attributes.supported_features, 4, "set its volume");
      const level = Number(data.volume_level);
      if (!Number.isFinite(level) || level < 0 || level > 1) throw new Error("volume_level must be 0 to 1");
      return { attributes: { volume_level: level } };
    },
    "media_player.volume_mute": ({ entity, data }) => {
      live(entity.state);
      supports(entity.attributes.supported_features, 8, "mute");
      if (typeof data.is_volume_muted !== "boolean") throw new Error("is_volume_muted must be true or false");
      return { attributes: { is_volume_muted: data.is_volume_muted } };
    },
    "media_player.select_source": ({ entity, data }) => {
      live(entity.state);
      supports(entity.attributes.supported_features, 2048, "pick a source");
      const sources = Array.isArray(entity.attributes.source_list) ? entity.attributes.source_list : [];
      if (typeof data.source !== "string" || !sources.includes(data.source)) throw new Error("source is not one of the player's sources");
      return { attributes: { source: data.source } };
    },
  };
}

/** Storybook-only `media_player` transport: the same store and service path as a host transport, answered locally. */
export function createDemoMediaPlayerHaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({ seed, services: mediaPlayerServices(), pictures: DEMO_MEDIA_PLAYER_PICTURES });
}
