import { describe, expect, it } from "vitest";
import { OPEN_IN_HOME_ASSISTANT, VOLUME_STEP_WORDS, artworkLabel, isActive, isOff, isPlaying, mediaAbilities, mediaLine, mediaPlayerWord, mediaPress, openInHomeAssistantSaid, playingFrom, pressWord, skipSaid, SKIP_WORDS, volumeBySteps, volumeReason, volumeStepSaid, volumeStepValue, volumeWord } from "./words";
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
    // A player that stops but can't pause stops, never turns off, while it plays.
    expect(mediaPress({ state: "playing", ...ALL, supportsPause: false, supportsStop: true })).toBe("stop");
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

  it("says the way to Home Assistant's own player the same in every skin, whole where it is heard", () => {
    expect(OPEN_IN_HOME_ASSISTANT).toBe("Open in Home Assistant");
    expect(openInHomeAssistantSaid("Kitchen speaker")).toBe("Open Kitchen speaker in Home Assistant");
  });

  it("says what it can do, or that it is view only", () => {
    expect(mediaAbilities({ supportsNext: true, supportsVolume: true, supportsMute: true, supportsSource: true, sources: ["a", "b", "c", "d"] })).toBe("Skip, volume, mute, 4 sources");
    expect(mediaAbilities({ supportsNext: true, supportsSeek: true, supportsVolume: true })).toBe("Skip, seek, volume");
    expect(mediaAbilities({ supportsSeek: true })).toBe("Seek");
    expect(mediaAbilities({ supportsVolumeStep: true, supportsMute: true })).toBe("Volume steps, mute");
    expect(mediaAbilities({ supportsVolume: true, supportsVolumeStep: true })).toBe("Volume");
    expect(mediaAbilities({ supportsSource: true, sources: ["TV"] })).toBe("1 source");
    expect(mediaAbilities({ supportsPlay: true })).toBe("Play and pause");
    expect(mediaAbilities({ supportsTurnOff: true })).toBe("On and off");
    expect(mediaAbilities({})).toBe("View only");
  });
});

describe("volume steps", () => {
  const tv = { state: "on" as const, supportsVolumeStep: true };

  it("step a player that can't set its volume, or reports no level", () => {
    expect(volumeBySteps(tv)).toBe(true);
    expect(volumeBySteps({ ...tv, supportsVolume: true })).toBe(true);
    expect(volumeBySteps({ ...tv, supportsVolume: true, volume: 40 })).toBe(false);
    expect(volumeBySteps({ supportsVolume: true })).toBe(false);
    expect(volumeBySteps({})).toBe(false);
  });

  it("say the level with why it doesn't sound, Muted with no level, and never invent one", () => {
    expect(volumeStepValue({ state: "playing", volume: 45 })).toBe("45%");
    expect(volumeStepValue({ state: "playing", volume: 45, muted: true })).toBe("Muted · 45%");
    expect(volumeStepValue({ state: "paused", volume: 30 })).toBe("Paused · 30%");
    expect(volumeStepValue({ state: "on", muted: true })).toBe("Muted");
    expect(volumeStepValue({ state: "on" })).toBeUndefined();
  });

  it("are said in full", () => {
    expect(VOLUME_STEP_WORDS).toEqual({ down: "Down", up: "Up" });
    expect(volumeStepSaid("Living room TV", "down")).toBe("Living room TV: volume down");
  });
});
