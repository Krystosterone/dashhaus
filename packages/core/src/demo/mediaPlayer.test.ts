import { describe, expect, it } from "vitest";
import { createDemoMediaPlayerHaTransport } from "./mediaPlayer";
import { ARTWORK_SUNDAY, ARTWORK_TIDES } from "../seeds/pictures";
import type { HassEntities } from "../ha/types";

const subscribe = async () => {
  const transport = createDemoMediaPlayerHaTransport();
  const seen: { latest?: HassEntities } = {};
  transport.subscribeEntities((entities) => { seen.latest = entities; });
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  return { transport, seen };
};
const KITCHEN = "media_player.kitchen_speaker";
const TV = "media_player.living_room_tv";

describe("createDemoMediaPlayerHaTransport", () => {
  it("publishes the seeded entities", async () => {
    const { seen } = await subscribe();
    expect(seen.latest).toMatchObject({ [KITCHEN]: { state: "playing" }, [TV]: { state: "off" } });
  });

  it("pauses and plays, keeping where it was", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("media_player", "media_pause", { entity_id: KITCHEN });
    const paused = seen.latest?.[KITCHEN];
    expect(paused?.state).toBe("paused");
    expect(Number(paused?.attributes.media_position)).toBeGreaterThanOrEqual(83);
    await transport.callService("media_player", "media_play", { entity_id: KITCHEN });
    expect(seen.latest?.[KITCHEN].state).toBe("playing");
  });

  it("skips to the next track, with its own artwork, from the start", async () => {
    const { transport, seen } = await subscribe();
    expect(transport.resolveUrl?.(String(seen.latest?.[KITCHEN].attributes.entity_picture))).toBe(ARTWORK_SUNDAY);
    await transport.callService("media_player", "media_next_track", { entity_id: KITCHEN });
    const next = seen.latest?.[KITCHEN];
    expect(next?.attributes).toMatchObject({ media_title: "Tides", media_position: 0 });
    expect(transport.resolveUrl?.(String(next?.attributes.entity_picture))).toBe(ARTWORK_TIDES);
    await transport.callService("media_player", "media_next_track", { entity_id: KITCHEN });
    expect(seen.latest?.[KITCHEN].attributes.entity_picture).toBeUndefined();
  });

  it("sets the volume, mutes and picks a source, refusing what it can't", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("media_player", "volume_set", { entity_id: KITCHEN, volume_level: 0.6 });
    await transport.callService("media_player", "volume_mute", { entity_id: KITCHEN, is_volume_muted: true });
    await transport.callService("media_player", "select_source", { entity_id: KITCHEN, source: "Radio" });
    expect(seen.latest?.[KITCHEN].attributes).toMatchObject({ volume_level: 0.6, is_volume_muted: true, source: "Radio" });
    await expect(transport.callService("media_player", "select_source", { entity_id: KITCHEN, source: "Vinyl" })).rejects.toThrow();
    await expect(transport.callService("media_player", "media_play", { entity_id: TV })).rejects.toThrow();
  });

  it("seeks within the track, its clock as of then, and refuses a player that can't", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("media_player", "media_seek", { entity_id: KITCHEN, seek_position: 151 });
    const seeked = seen.latest?.[KITCHEN].attributes;
    expect(seeked?.media_position).toBe(151);
    expect(Date.parse(String(seeked?.media_position_updated_at))).toBeGreaterThan(Date.parse("2026-10-19T11:20:00Z"));
    await expect(transport.callService("media_player", "media_seek", { entity_id: KITCHEN, seek_position: 999 })).rejects.toThrow();
    await expect(transport.callService("media_player", "media_seek", { entity_id: TV, seek_position: 10 })).rejects.toThrow();
  });

  it("steps the volume ten points where a level is reported, and takes a step it can't report", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("media_player", "volume_up", { entity_id: KITCHEN });
    expect(seen.latest?.[KITCHEN].attributes.volume_level).toBe(0.55);
    await transport.callService("media_player", "volume_down", { entity_id: KITCHEN });
    await transport.callService("media_player", "volume_down", { entity_id: KITCHEN });
    expect(seen.latest?.[KITCHEN].attributes.volume_level).toBe(0.35);
    await transport.callService("media_player", "turn_on", { entity_id: TV });
    await transport.callService("media_player", "volume_up", { entity_id: TV });
    expect(seen.latest?.[TV].attributes.volume_level).toBeUndefined();
  });

  it("turns on and off", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("media_player", "turn_on", { entity_id: TV });
    expect(seen.latest?.[TV].state).toBe("idle");
    await transport.callService("media_player", "turn_off", { entity_id: TV });
    expect(seen.latest?.[TV].state).toBe("off");
  });

  it("rejects other domains, services and unknown entities", async () => {
    const transport = createDemoMediaPlayerHaTransport();
    await expect(transport.callService("other_domain", "toggle", { entity_id: KITCHEN })).rejects.toThrow();
    await expect(transport.callService("media_player", "explode", { entity_id: KITCHEN })).rejects.toThrow();
    await expect(transport.callService("media_player", "media_play", { entity_id: "media_player.missing" })).rejects.toThrow();
  });

  it("answers today's history and the registries", async () => {
    const transport = createDemoMediaPlayerHaTransport();
    const history = await transport.sendMessage?.("history/history_during_period", { entity_ids: [KITCHEN] });
    expect(Object.keys(history as object)).toEqual([KITCHEN]);
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: KITCHEN }));
  });
});
