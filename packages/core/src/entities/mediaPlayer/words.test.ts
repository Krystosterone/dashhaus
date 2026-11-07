import { describe, expect, it } from "vitest";
import { isOff, isPlaying, mediaAbilities, mediaLine, mediaPlayerWord, mediaPress, playingFrom, pressWord, volumeWord } from "./words";

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

  it("says what it can do, or that it is view only", () => {
    expect(mediaAbilities({ supportsNext: true, supportsVolume: true, supportsMute: true, supportsSource: true, sources: ["a", "b", "c", "d"] })).toBe("Skip, volume, mute, 4 sources");
    expect(mediaAbilities({ supportsSource: true, sources: ["TV"] })).toBe("1 source");
    expect(mediaAbilities({ supportsPlay: true })).toBe("Play and pause");
    expect(mediaAbilities({ supportsTurnOff: true })).toBe("On and off");
    expect(mediaAbilities({})).toBe("View only");
  });
});
