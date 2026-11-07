import type { MediaPlayerEntity } from "../../entities/mediaPlayer/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";
import type { ActionKinds } from "./kinds";

export interface MediaPlayerHandlers {
  /** Calls `media_player.media_play`. A player without `PLAY` reports `unsupported`. */
  onPlay: () => void;
  /** Calls `media_player.media_pause`. A player without `PAUSE` reports `unsupported`. */
  onPause: () => void;
  /** Calls `media_player.media_previous_track`. A player without `PREVIOUS_TRACK` reports `unsupported`. */
  onPrevious: () => void;
  /** Calls `media_player.media_next_track`. A player without `NEXT_TRACK` reports `unsupported`. */
  onNext: () => void;
  /** Calls `media_player.turn_on`. A player without `TURN_ON` reports `unsupported`. */
  onTurnOn: () => void;
  /** Calls `media_player.turn_off`. A player without `TURN_OFF` reports `unsupported`. */
  onTurnOff: () => void;
  /**
   * Calls `media_player.volume_set` with the percent as a level from 0 to 1. A player without `VOLUME_SET` reports
   * `unsupported`; a percent that isn't a number, `invalid_input`. It never unmutes or turns the player on.
   */
  onVolumeChange: (percent: number) => void;
  /** Calls `media_player.volume_mute`. A player without `VOLUME_MUTE` reports `unsupported`. */
  onMuteChange: (muted: boolean) => void;
  /**
   * Calls `media_player.select_source`. A player without `SELECT_SOURCE` reports `unsupported`; a source it doesn't
   * list, `invalid_input`.
   */
  onSourceChange: (source: string) => void;
}

/** What each handler is, for a card drawing a media player without knowing it (`ActionKind`). */
export const MEDIA_PLAYER_ACTIONS = {
  onPlay: { takes: "nothing" },
  onPause: { takes: "nothing" },
  onPrevious: { takes: "nothing" },
  onNext: { takes: "nothing" },
  onTurnOn: { takes: "nothing" },
  onTurnOff: { takes: "nothing" },
  onVolumeChange: { takes: "level", field: "volume" },
  onMuteChange: { takes: "switch", field: "muted" },
  onSourceChange: { takes: "choice", field: "source", options: "sources" },
} as const satisfies ActionKinds<MediaPlayerHandlers, MediaPlayerEntity>;

export interface MediaPlayerHandlerOptions {
  onError?: (error: HaActionError) => void;
}

/**
 * Create safe callback handlers for the MediaPlayerTile contract. Each handler builds one native `media_player.*`
 * service call, gated on what the entity declares in `supported_features`: what it can't do is reported as
 * unsupported, never sent.
 */
export function createMediaPlayerHandlers(caller: Pick<HaStore, "callService">, entity: MediaPlayerEntity, options: MediaPlayerHandlerOptions = {}): MediaPlayerHandlers {
  const { run, actionable, unsupported, invalidInput } = serviceRunner(caller, "media_player", entity, options.onError);
  const id = entity.entityId;
  /** Available and declaring the feature, or reported. */
  const can = (supported: boolean | undefined, what: string) => {
    if (!actionable()) return false;
    if (supported) return true;
    unsupported(`${id} does not support ${what}`);
    return false;
  };
  return {
    onPlay: () => {
      if (can(entity.supportsPlay, "play")) run("media_play");
    },
    onPause: () => {
      if (can(entity.supportsPause, "pause")) run("media_pause");
    },
    onPrevious: () => {
      if (can(entity.supportsPrevious, "previous track")) run("media_previous_track");
    },
    onNext: () => {
      if (can(entity.supportsNext, "next track")) run("media_next_track");
    },
    onTurnOn: () => {
      if (can(entity.supportsTurnOn, "turn on")) run("turn_on");
    },
    onTurnOff: () => {
      if (can(entity.supportsTurnOff, "turn off")) run("turn_off");
    },
    onVolumeChange: (percent) => {
      if (!can(entity.supportsVolume, "volume")) return;
      if (!Number.isFinite(percent)) {
        invalidInput(`${id} volume must be finite`);
        return;
      }
      run("volume_set", { volume_level: Math.round(Math.min(100, Math.max(0, percent))) / 100 });
    },
    onMuteChange: (muted) => {
      if (can(entity.supportsMute, "mute")) run("volume_mute", { is_volume_muted: muted });
    },
    onSourceChange: (source) => {
      if (!can(entity.supportsSource, "sources")) return;
      if (!entity.sources?.includes(source)) {
        invalidInput(`${id} has no source "${source}"`);
        return;
      }
      run("select_source", { source });
    },
  };
}
