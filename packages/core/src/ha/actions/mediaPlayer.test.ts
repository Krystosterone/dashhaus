import { describe, expect, it, vi } from "vitest";
import { MEDIA_PLAYER_ACTIONS, createMediaPlayerHandlers } from "./mediaPlayer";
import type { MediaPlayerEntity } from "../../entities/mediaPlayer/types";

const entity: MediaPlayerEntity = {
  entityId: "media_player.kitchen", name: "Kitchen speaker", state: "playing", sources: ["Spotify", "Radio"],
  supportsPlay: true, supportsPause: true, supportsPrevious: true, supportsNext: true, supportsVolume: true,
  supportsMute: true, supportsSource: true, supportsTurnOn: true, supportsTurnOff: true,
};
const id = { entity_id: "media_player.kitchen" };

describe("createMediaPlayerHandlers", () => {
  it("calls the native service for each action", () => {
    const callService = vi.fn(async () => undefined);
    const h = createMediaPlayerHandlers({ callService }, entity);
    h.onPlay();
    h.onPause();
    h.onPrevious();
    h.onNext();
    h.onTurnOn();
    h.onTurnOff();
    h.onVolumeChange(45);
    h.onMuteChange(true);
    h.onSourceChange("Radio");
    expect(callService.mock.calls).toEqual([
      ["media_player", "media_play", id],
      ["media_player", "media_pause", id],
      ["media_player", "media_previous_track", id],
      ["media_player", "media_next_track", id],
      ["media_player", "turn_on", id],
      ["media_player", "turn_off", id],
      ["media_player", "volume_set", { ...id, volume_level: 0.45 }],
      ["media_player", "volume_mute", { ...id, is_volume_muted: true }],
      ["media_player", "select_source", { ...id, source: "Radio" }],
    ]);
  });

  it("sets the volume as a level within 0-1, and refuses one that isn't a number", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const h = createMediaPlayerHandlers({ callService }, entity, { onError });
    h.onVolumeChange(140);
    h.onVolumeChange(-3);
    h.onVolumeChange(Number.NaN);
    expect(callService.mock.calls.map((c) => (c as unknown[])[2])).toEqual([{ ...id, volume_level: 1 }, { ...id, volume_level: 0 }]);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "invalid_input" }));
  });

  it("reports what the player doesn't declare as unsupported, and sends nothing", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const none: MediaPlayerEntity = { entityId: entity.entityId, name: entity.name, state: "playing" };
    const h = createMediaPlayerHandlers({ callService }, none, { onError });
    for (const name of Object.keys(MEDIA_PLAYER_ACTIONS) as (keyof typeof MEDIA_PLAYER_ACTIONS)[]) {
      const handler = h[name] as (value?: unknown) => void;
      handler(name === "onVolumeChange" || name === "onSeek" ? 10 : name === "onMuteChange" ? true : name === "onSourceChange" ? "Radio" : undefined);
    }
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(Object.keys(MEDIA_PLAYER_ACTIONS).length);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported", domain: "media_player" }));
  });

  it("refuses a source the player doesn't list", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    createMediaPlayerHandlers({ callService }, entity, { onError }).onSourceChange("Vinyl");
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "invalid_input" }));
  });

  it("does not call the service for an unavailable entity and reports unsupported", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    createMediaPlayerHandlers({ callService }, { ...entity, state: "unavailable" }, { onError }).onPlay();
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported", domain: "media_player", entityId: "media_player.kitchen" }));
  });

  it("reports rejected actions", async () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw new Error("denied"); });
    createMediaPlayerHandlers({ callService }, entity, { onError }).onPause();
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed", domain: "media_player", service: "media_pause" })));
  });
});

describe("onVolumeUp and onVolumeDown", () => {
  it("step the volume with volume_up and volume_down, for a player that steps or sets it, and nothing else", () => {
    const callService = vi.fn(async () => undefined);
    const steps: MediaPlayerEntity = { entityId: entity.entityId, name: entity.name, state: "playing", muted: true, supportsVolumeStep: true };
    const h = createMediaPlayerHandlers({ callService }, steps);
    h.onVolumeUp();
    h.onVolumeDown();
    createMediaPlayerHandlers({ callService }, entity).onVolumeUp();
    // Muted, it still only steps: never an unmute, never a turn on.
    expect(callService.mock.calls).toEqual([
      ["media_player", "volume_up", id],
      ["media_player", "volume_down", id],
      ["media_player", "volume_up", id],
    ]);
  });

  it("report a player with neither as unsupported", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    createMediaPlayerHandlers({ callService }, { entityId: entity.entityId, name: entity.name, state: "playing" }, { onError }).onVolumeDown();
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported" }));
  });
});

describe("onSeek", () => {
  const seekable: MediaPlayerEntity = { ...entity, supportsSeek: true, duration: 245, position: 83 };

  it("calls media_seek with the seconds, kept within the track, and answers true once Home Assistant takes it", async () => {
    const callService = vi.fn(async () => undefined);
    const h = createMediaPlayerHandlers({ callService }, seekable);
    await expect(h.onSeek(151)).resolves.toBe(true);
    await expect(h.onSeek(400)).resolves.toBe(true);
    await expect(h.onSeek(-5)).resolves.toBe(true);
    expect(callService.mock.calls).toEqual([
      ["media_player", "media_seek", { ...id, seek_position: 151 }],
      ["media_player", "media_seek", { ...id, seek_position: 245 }],
      ["media_player", "media_seek", { ...id, seek_position: 0 }],
    ]);
  });

  it("answers false, reporting why, for a player without SEEK, seconds that aren't a number, or a refused call", async () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => undefined);
    await expect(createMediaPlayerHandlers({ callService }, entity, { onError }).onSeek(10)).resolves.toBe(false);
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({ code: "unsupported" }));
    await expect(createMediaPlayerHandlers({ callService }, seekable, { onError }).onSeek(Number.NaN)).resolves.toBe(false);
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({ code: "invalid_input" }));
    expect(callService).not.toHaveBeenCalled();

    const refused = vi.fn(async () => { throw new Error("denied"); });
    await expect(createMediaPlayerHandlers({ callService: refused }, seekable, { onError }).onSeek(10)).resolves.toBe(false);
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({ code: "service_failed", service: "media_seek" }));
  });

  it("declares the seek a level over the track that runs on by itself", () => {
    expect(MEDIA_PLAYER_ACTIONS.onSeek).toEqual({ takes: "level", field: "position", min: 0, max: "duration", runs: true });
  });
});
