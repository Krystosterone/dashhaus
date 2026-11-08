import { describe, expect, it } from "vitest";
import { artworkLabel, isActive, isOff, isPlaying, mediaAbilities, mediaLine, mediaPlayerWord, mediaPress, playingFrom, pressWord, skipSaid, SKIP_WORDS, volumeReason, volumeWord } from "./words";
import { volumeText } from "../volume";

const ALL = { supportsPlay: true, supportsPause: true, supportsTurnOn: true };

describe("media player words", () => {
  it("says each state in its own word, and an integration's in its own", () => {
    expect(mediaPlayerWord({ state: "playing" })).toBe("Playing");
    expect(mediaPlayerWord({ state: "standby" })).toBe("Standby");
    expect(mediaPlayerWord({ state: "buffering" })).toBe("Buffering");
    expect(mediaPlayerWord({ state: "other", stateText: "Connecting" })).toBe("Connecting");
    expect(mediaPlayerWord({ state: "other" })).toBe("Unknown");
    expect(mediaPlayerWord({ state: "unavailable", stateText: "Connecting" })).toBe("Unavailable");
  });

  it("is playing while playing or buffering, and off while off or asleep", () => {
    expect(isPlaying({ state: "buffering" })).toBe(true);
    expect(isPlaying({ state: "paused" })).toBe(false);
    expect(isOff({ state: "standby" })).toBe(true);
    expect(isOff({ state: "idle" })).toBe(false);
  });

  it("is active while playing, buffering or on, and rests otherwise", () => {
    for (const state of ["playing", "buffering", "on"] as const) expect(isActive({ state })).toBe(true);
    for (const state of ["paused", "idle", "standby", "off", "other", "unavailable"] as const) expect(isActive({ state })).toBe(false);
    expect(isPlaying({ state: "on" })).toBe(false);
  });

  it("says what is playing, title first, and nothing while off or unavailable", () => {
    expect(mediaLine({ state: "playing", title: "Sunday Morning", artist: "Maroon 5" })).toBe("Sunday Morning · Maroon 5");
    expect(mediaLine({ state: "paused", title: "Sunday Morning" })).toBe("Sunday Morning");
    expect(mediaLine({ state: "playing", artist: "Maroon 5" })).toBe("Maroon 5");
    expect(mediaLine({ state: "idle", app: "Spotify" })).toBe("Spotify");
    expect(mediaLine({ state: "off", title: "Sunday Morning" })).toBeUndefined();
    expect(mediaLine({ state: "unavailable", title: "Sunday Morning" })).toBeUndefined();
    expect(playingFrom({ state: "playing", source: "TV" })).toBe("TV");
    expect(playingFrom({ state: "playing", app: "Spotify", source: "Spotify Connect" })).toBe("Spotify");
    expect(playingFrom({ state: "standby", source: "TV" })).toBeUndefined();
  });

  it("presses to pause what plays, play what doesn't, and turn on what is off, where it can", () => {
    expect(mediaPress({ state: "playing", ...ALL })).toBe("pause");
    expect(mediaPress({ state: "buffering", ...ALL })).toBe("pause");
    expect(mediaPress({ state: "paused", ...ALL })).toBe("play");
    expect(mediaPress({ state: "idle", ...ALL })).toBe("play");
    expect(mediaPress({ state: "other", ...ALL })).toBe("play");
    expect(mediaPress({ state: "off", ...ALL })).toBe("turnOn");
    expect(mediaPress({ state: "standby", ...ALL })).toBe("turnOn");
    expect(mediaPress({ state: "playing", supportsPlay: true })).toBeNull();
    expect(mediaPress({ state: "paused", supportsPause: true })).toBeNull();
    expect(mediaPress({ state: "off", supportsPlay: true })).toBeNull();
    expect(mediaPress({ state: "unavailable", ...ALL })).toBeNull();
    expect(mediaPress({ state: "on", supportsTurnOff: true })).toBe("turnOff");
    expect(mediaPress({ state: "playing", supportsPlay: true, supportsTurnOff: true })).toBe("turnOff");
    expect(mediaPress({ state: "on", supportsPlay: true, supportsTurnOff: true })).toBe("play");
    expect(pressWord("turnOff")).toBe("Turn off");
    expect(pressWord("turnOn")).toBe("Turn on");
  });

  it("says the volume, or that it is muted", () => {
    expect(volumeWord({ state: "playing", volume: 45 })).toBe("Volume 45%");
    expect(volumeWord({ state: "playing", volume: 45, muted: true })).toBe("Muted");
    expect(volumeWord({ state: "off", volume: 45 })).toBeUndefined();
  });

  it("gives the reason its volume doesn't sound before the value, and none while it is active (spec/cards.md)", () => {
    for (const state of ["playing", "buffering", "on"] as const) expect(volumeReason({ state })).toBeUndefined();
    expect(volumeText(30, volumeReason({ state: "paused" }))).toBe("Paused · 30%");
    expect(volumeText(25, volumeReason({ state: "idle" }))).toBe("Idle · 25%");
    expect(volumeText(45, volumeReason({ state: "playing", muted: true }))).toBe("Muted · 45%");
    expect(volumeText(45, volumeReason({ state: "off", muted: true }))).toBe("Off · 45%");
    expect(volumeReason({ state: "other", stateText: "Connecting" })).toBe("Connecting");
  });

  it("says its skips and its artwork the same in every skin", () => {
    expect(SKIP_WORDS).toEqual({ previous: "Previous", next: "Next" });
    expect(skipSaid("Kitchen speaker", "next")).toBe("Kitchen speaker: next track");
    expect(artworkLabel({ state: "playing", name: "Kitchen speaker", title: "Sunday Morning" })).toBe("Artwork for Sunday Morning");
    expect(artworkLabel({ state: "playing", name: "Kitchen speaker" })).toBe("Kitchen speaker artwork");
    expect(artworkLabel({ state: "off", name: "Kitchen speaker", title: "Sunday Morning" })).toBe("Kitchen speaker artwork");
  });

  it("says what it can do, or that it is view only", () => {
    expect(mediaAbilities({ supportsNext: true, supportsVolume: true, supportsMute: true, supportsSource: true, sources: ["a", "b", "c", "d"] })).toBe("Skip, volume, mute, 4 sources");
    expect(mediaAbilities({ supportsNext: true, supportsSeek: true, supportsVolume: true })).toBe("Skip, seek, volume");
    expect(mediaAbilities({ supportsSeek: true })).toBe("Seek");
    expect(mediaAbilities({ supportsSource: true, sources: ["TV"] })).toBe("1 source");
    expect(mediaAbilities({ supportsPlay: true })).toBe("Play and pause");
    expect(mediaAbilities({ supportsTurnOff: true })).toBe("On and off");
    expect(mediaAbilities({})).toBe("View only");
  });
});
