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
      handler(name === "onVolumeChange" ? 10 : name === "onMuteChange" ? true : name === "onSourceChange" ? "Radio" : undefined);
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
