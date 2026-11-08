import type { HourSample } from "../history";

/**
 * What a media player is doing, in Home Assistant's own states: `playing`, `paused`, `buffering`, `idle`, `on` (on,
 * with nothing loaded), `standby` and `off`. The names integrations give the same ones (`stopped`, `loading`) are
 * mapped onto them. A state Home Assistant doesn't name but an integration reports (`connecting`) is `other`, said in
 * its own words (`stateText`), never guessed onto one of these. `unknown`, `unavailable` and a missing entity are
 * `unavailable`.
 */
export type MediaPlayerState = "playing" | "paused" | "buffering" | "idle" | "on" | "standby" | "off" | "other" | "unavailable";

/**
 * Mirrors one Home Assistant `media_player.*` entity: what it is doing, what is playing and how far in, its volume and
 * source, and what it can do (`supported_features`).
 */
export interface MediaPlayerEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Its name: the `name` option, else Home Assistant's friendly name, else its entity id. */
  name: string;
  /** Where it is: "Kitchen". */
  area?: string;
  state: MediaPlayerState;
  /** An `other` state in words, as the integration names it: `connecting` → "Connecting". */
  stateText?: string;
  /** What is playing (HA `media_title`, else `media_channel`): "Sunday Morning". */
  title?: string;
  /** Who it is by, or what it is from (HA `media_artist`, else `media_album_artist`, else `media_series_title`). */
  artist?: string;
  /** The album (HA `media_album_name`). */
  album?: string;
  /** The app playing it, where the player says (HA `app_name`): "Spotify". */
  app?: string;
  /** How long it is, in seconds (HA `media_duration`). Absent for a stream, which has no end. */
  duration?: number;
  /** How far in it was, in seconds (HA `media_position`), at `positionAt`. */
  position?: number;
  /**
   * When `position` was read (HA `media_position_updated_at`), in ms since the epoch. Absent, it is as of when the card
   * draws it (seeds), so a story's clock starts where its seed says.
   */
  positionAt?: number;
  /** Its volume, 0–100 (HA `volume_level`, 0–1). */
  volume?: number;
  /** Its sound is muted (HA `is_volume_muted`). */
  muted?: boolean;
  /** The source it plays from (HA `source`): "Spotify", "TV". */
  source?: string;
  /** The sources it can play from (HA `source_list`). */
  sources?: string[];
  /**
   * Its artwork, a URL this page can load: the hook adds it from Home Assistant's `entity_picture` (`useHaPicture`);
   * seeds give a local `data:` URI. Never read by the mapper.
   */
  picture?: string;
  /** It plays (`MediaPlayerEntityFeature.PLAY`). */
  supportsPlay?: boolean;
  /** It pauses (`PAUSE`). */
  supportsPause?: boolean;
  /** It skips back (`PREVIOUS_TRACK`). */
  supportsPrevious?: boolean;
  /** It skips on (`NEXT_TRACK`). */
  supportsNext?: boolean;
  /** It moves to a position in what it plays (`SEEK`). */
  supportsSeek?: boolean;
  /** Its volume can be set (`VOLUME_SET`). */
  supportsVolume?: boolean;
  /** Its volume steps up and down (`VOLUME_STEP`), often with no level reported (an IR or CEC TV, a receiver's zone). */
  supportsVolumeStep?: boolean;
  /** It mutes (`VOLUME_MUTE`). */
  supportsMute?: boolean;
  /** It picks a source (`SELECT_SOURCE`) and lists at least one. */
  supportsSource?: boolean;
  /** It turns on (`TURN_ON`). */
  supportsTurnOn?: boolean;
  /** It turns off (`TURN_OFF`). */
  supportsTurnOff?: boolean;
  /** When it last changed state (HA `last_changed`), formatted. */
  lastChanged?: string;
  /** The same, in ms since the epoch. */
  changedAt?: number;
  /** While it is unavailable, when it was last reachable: the `lastSeen` option, else what Home Assistant reports. */
  lastSeen?: string;
}

export interface MediaPlayerHistory {
  /** 1 for hours it was playing, 0 for hours it wasn't, "unavailable", null for hours ahead. Fractions for part of an hour. */
  samples: HourSample[];
  currentHour: number;
  /** Minutes playing today, including the current hour. */
  playingMinutes: number;
}
