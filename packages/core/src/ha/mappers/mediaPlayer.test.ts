import { describe, expect, it } from "vitest";
import { MEDIA_PLAYER_FEATURES as F, mediaPlayerFromHass, mediaPlayerStateOf } from "./mediaPlayer";

const raw = {
  entity_id: "media_player.kitchen",
  state: "playing",
  attributes: {
    friendly_name: "Kitchen speaker",
    media_title: "Sunday Morning",
    media_artist: "Maroon 5",
    media_album_name: "Songs About Jane",
    media_duration: 245,
    media_position: 83,
    media_position_updated_at: "2026-10-19T11:53:30Z",
    volume_level: 0.45,
    is_volume_muted: false,
    source: "Spotify",
    source_list: ["Spotify", "Radio", "TV"],
    app_name: "Spotify",
    entity_picture: "/api/media_player_proxy/media_player.kitchen?token=abc&cache=1",
    supported_features: F.PLAY | F.PAUSE | F.NEXT_TRACK | F.PREVIOUS_TRACK | F.VOLUME_SET | F.VOLUME_MUTE | F.SELECT_SOURCE | F.TURN_ON | F.TURN_OFF,
  },
  last_changed: "2026-10-19T11:40:00Z",
  last_updated: "2026-10-19T11:53:30Z",
};

describe("mediaPlayerFromHass", () => {
  it("maps what is playing, how far in, the volume, the source and what it can do", () => {
    expect(mediaPlayerFromHass(raw, raw.entity_id, { area: "Kitchen" })).toMatchObject({
      entityId: "media_player.kitchen",
      name: "Kitchen speaker",
      area: "Kitchen",
      state: "playing",
      title: "Sunday Morning",
      artist: "Maroon 5",
      album: "Songs About Jane",
      app: "Spotify",
      duration: 245,
      position: 83,
      positionAt: Date.parse("2026-10-19T11:53:30Z"),
      volume: 45,
      muted: false,
      source: "Spotify",
      sources: ["Spotify", "Radio", "TV"],
      supportsPlay: true,
      supportsPause: true,
      supportsPrevious: true,
      supportsNext: true,
      supportsVolume: true,
      supportsMute: true,
      supportsSource: true,
      supportsTurnOn: true,
      supportsTurnOff: true,
      changedAt: Date.parse("2026-10-19T11:40:00Z"),
    });
  });

  it("never reads the artwork: the hook adds it", () => {
    expect(mediaPlayerFromHass(raw, raw.entity_id).picture).toBeUndefined();
  });

  it("supports nothing it doesn't declare, and no source without a list", () => {
    const bare = mediaPlayerFromHass({ ...raw, attributes: { ...raw.attributes, supported_features: 0 } }, raw.entity_id);
    expect(bare).toMatchObject({ supportsPlay: false, supportsPause: false, supportsPrevious: false, supportsNext: false, supportsVolume: false, supportsMute: false, supportsSource: false, supportsTurnOn: false, supportsTurnOff: false });
    expect(mediaPlayerFromHass({ ...raw, attributes: { ...raw.attributes, source_list: [] } }, raw.entity_id).supportsSource).toBe(false);
  });

  it("falls back to the album artist, the series and the channel", () => {
    const tv = { ...raw, attributes: { media_series_title: "Bluey", media_channel: "ABC Kids", supported_features: 0 } };
    expect(mediaPlayerFromHass(tv, raw.entity_id)).toMatchObject({ title: "ABC Kids", artist: "Bluey" });
    const album = { ...raw, attributes: { media_title: "Track 1", media_album_artist: "Various Artists" } };
    expect(mediaPlayerFromHass(album, raw.entity_id).artist).toBe("Various Artists");
  });

  it("gives a stream no duration, and drops a position with no number", () => {
    const stream = mediaPlayerFromHass({ ...raw, attributes: { media_title: "Radio 1", media_duration: 0, media_position: null } }, raw.entity_id);
    expect(stream.duration).toBeUndefined();
    expect(stream.position).toBeUndefined();
    expect(stream.positionAt).toBeUndefined();
  });

  it("clamps the volume to 0-100", () => {
    expect(mediaPlayerFromHass({ ...raw, attributes: { volume_level: 1.4 } }, raw.entity_id).volume).toBe(100);
    expect(mediaPlayerFromHass({ ...raw, attributes: { volume_level: -0.1 } }, raw.entity_id).volume).toBe(0);
  });

  it("folds the names integrations give Home Assistant's states into them", () => {
    expect(mediaPlayerStateOf("stopped")).toEqual({ state: "idle" });
    expect(mediaPlayerStateOf("Loading")).toEqual({ state: "buffering" });
    expect(mediaPlayerStateOf("sleeping")).toEqual({ state: "standby" });
    expect(mediaPlayerStateOf("standby")).toEqual({ state: "standby" });
    expect(mediaPlayerStateOf("on")).toEqual({ state: "on" });
  });

  it("says a state Home Assistant doesn't name in its own words, never a guessed one", () => {
    expect(mediaPlayerStateOf("connecting")).toEqual({ state: "other", stateText: "Connecting" });
    expect(mediaPlayerFromHass({ ...raw, state: "updating_firmware" }, raw.entity_id)).toMatchObject({ state: "other", stateText: "Updating firmware" });
  });

  it("keeps unknown, unavailable and missing entities unavailable, saying nothing of what was playing", () => {
    const unknown = mediaPlayerFromHass({ ...raw, state: "unknown" }, raw.entity_id);
    expect(unknown.state).toBe("unavailable");
    expect(unknown.title).toBeUndefined();
    expect(unknown.volume).toBeUndefined();
    expect(mediaPlayerFromHass({ ...raw, state: "unavailable" }, raw.entity_id).state).toBe("unavailable");
    const missing = mediaPlayerFromHass(undefined, "media_player.missing");
    expect(missing).toMatchObject({ entityId: "media_player.missing", name: "media_player.missing", state: "unavailable" });
    expect(missing.lastSeen).toBeUndefined();
  });

  it("falls back from an empty friendly name to the entity id", () => {
    expect(mediaPlayerFromHass({ ...raw, attributes: { friendly_name: "" } }, raw.entity_id).name).toBe("media_player.kitchen");
  });

  it("sets lastSeen only when unavailable, preferring the explicit option", () => {
    const attributes = { ...raw.attributes, last_seen: "2026-10-19T08:20:00Z" };
    expect(mediaPlayerFromHass({ ...raw, attributes }, raw.entity_id).lastSeen).toBeUndefined();
    expect(mediaPlayerFromHass({ ...raw, state: "unavailable", attributes }, raw.entity_id).lastSeen).toBeDefined();
    expect(mediaPlayerFromHass({ ...raw, state: "unavailable", attributes }, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBe("07:00");
  });

  it("rejects impossible state timestamps", () => {
    expect(mediaPlayerFromHass({ ...raw, last_changed: "2026-02-31T10:00:00Z" }, raw.entity_id).lastChanged).toBeUndefined();
  });
});
