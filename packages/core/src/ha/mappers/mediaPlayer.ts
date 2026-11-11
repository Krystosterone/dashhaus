import type { HassEntity } from "../types";
import { formatHaTime, parseHaTime } from "../time";
import type { HourCycle } from "../../entities/clock";
import { finiteNumber, isRecord, stringList, stringValue } from "../util";
import { inWords } from "../../entities/format";
import type { MediaPlayerEntity, MediaPlayerState } from "../../entities/mediaPlayer/types";

export interface MediaPlayerMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  /** The dashboard's hour cycle its times are said on (`useHourCycle`); the browser locale's when left out. */
  hourCycle?: HourCycle;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
}

/** Home Assistant's `MediaPlayerEntityFeature` bits the card reads. */
export const MEDIA_PLAYER_FEATURES = {
  PAUSE: 1, SEEK: 2, VOLUME_SET: 4, VOLUME_MUTE: 8, PREVIOUS_TRACK: 16, NEXT_TRACK: 32, TURN_ON: 128, TURN_OFF: 256,
  VOLUME_STEP: 1024, SELECT_SOURCE: 2048, STOP: 4096, PLAY: 16384,
} as const;

/** Home Assistant's states, and the names older or custom integrations give the same ones. */
const STATES: Record<string, Exclude<MediaPlayerState, "other" | "unavailable">> = {
  playing: "playing",
  play: "playing",
  paused: "paused",
  pause: "paused",
  buffering: "buffering",
  loading: "buffering",
  idle: "idle",
  stopped: "idle",
  stop: "idle",
  on: "on",
  standby: "standby",
  sleep: "standby",
  sleeping: "standby",
  off: "off",
};

const UNAVAILABLE = new Set(["unknown", "unavailable", ""]);

/** A state: Home Assistant's, an integration's name for one, or its own words. */
export function mediaPlayerStateOf(raw: string | undefined): Pick<MediaPlayerEntity, "state" | "stateText"> {
  const key = raw?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key == null || UNAVAILABLE.has(key)) return { state: "unavailable" };
  const known = STATES[key];
  return known ? { state: known } : { state: "other", stateText: inWords(raw!) };
}

/** A non-empty trimmed string attribute. */
const text = (value: unknown) => stringValue(value)?.trim() || undefined;

/**
 * Map one raw Home Assistant `media_player.*` state to the card model. Home Assistant's states, and the names
 * integrations give them, are states; any other name an integration reports is `other`, said in its own words, never a
 * guessed state; `unknown`, `unavailable` and a missing entity are unavailable, and say nothing of what was playing.
 * What it can do is what `supported_features` declares. Its artwork is not read here: the hook adds it.
 */
export function mediaPlayerFromHass(raw: HassEntity | undefined, entityId: string, options: MediaPlayerMapOptions = {}): MediaPlayerEntity {
  const attributes = isRecord(raw?.attributes) ? raw.attributes : {};
  const { state, stateText } = raw == null ? { state: "unavailable" as const, stateText: undefined } : mediaPlayerStateOf(typeof raw.state === "string" ? raw.state : undefined);
  const unav = state === "unavailable";
  const features = finiteNumber(attributes.supported_features) ?? 0;
  const has = (bit: number) => (features & bit) !== 0;
  const sources = stringList(attributes.source_list);
  const level = finiteNumber(attributes.volume_level);
  const duration = finiteNumber(attributes.media_duration);
  const position = finiteNumber(attributes.media_position);
  const muted = attributes.is_volume_muted;
  const media = unav ? {} : {
    title: text(attributes.media_title) ?? text(attributes.media_channel),
    artist: text(attributes.media_artist) ?? text(attributes.media_album_artist) ?? text(attributes.media_series_title),
    album: text(attributes.media_album_name),
    app: text(attributes.app_name),
    duration: duration != null && duration > 0 ? duration : undefined,
    position: position != null && position >= 0 ? position : undefined,
    positionAt: position != null ? parseHaTime(stringValue(attributes.media_position_updated_at))?.getTime() : undefined,
    volume: level != null ? Math.round(Math.min(1, Math.max(0, level)) * 100) : undefined,
    muted: typeof muted === "boolean" ? muted : undefined,
    source: text(attributes.source),
  };

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    ...(stateText && { stateText }),
    ...Object.fromEntries(Object.entries(media).filter(([, v]) => v !== undefined)),
    ...(sources.length > 0 && { sources }),
    supportsPlay: has(MEDIA_PLAYER_FEATURES.PLAY),
    supportsPause: has(MEDIA_PLAYER_FEATURES.PAUSE),
    supportsStop: has(MEDIA_PLAYER_FEATURES.STOP),
    supportsPrevious: has(MEDIA_PLAYER_FEATURES.PREVIOUS_TRACK),
    supportsNext: has(MEDIA_PLAYER_FEATURES.NEXT_TRACK),
    supportsSeek: has(MEDIA_PLAYER_FEATURES.SEEK),
    supportsVolume: has(MEDIA_PLAYER_FEATURES.VOLUME_SET),
    supportsVolumeStep: has(MEDIA_PLAYER_FEATURES.VOLUME_STEP),
    supportsMute: has(MEDIA_PLAYER_FEATURES.VOLUME_MUTE),
    supportsSource: has(MEDIA_PLAYER_FEATURES.SELECT_SOURCE) && sources.length > 0,
    supportsTurnOn: has(MEDIA_PLAYER_FEATURES.TURN_ON),
    supportsTurnOff: has(MEDIA_PLAYER_FEATURES.TURN_OFF),
    lastChanged: formatHaTime(raw?.last_changed, options.now, options.hourCycle),
    changedAt: parseHaTime(raw?.last_changed)?.getTime(),
    lastSeen: unav ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now, options.hourCycle) : undefined,
  };
}
