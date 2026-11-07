import { describe, expect, it } from "vitest";
import { clockPlaces, playTimeSpoken, playedShare, playhead } from "./position";
import type { ClockPlace } from "./position";

const T = Date.UTC(2026, 9, 19, 11, 54);

describe("playhead", () => {
  it("moves on from the reported position by the time since it was read, while playing", () => {
    expect(playhead({ state: "playing", duration: 240, position: 60, positionAt: T - 30_000 }, T)).toEqual({ at: 90, duration: 240, running: true });
  });

  it("stays where it was while paused or buffering, and never runs past the end or before the start", () => {
    expect(playhead({ state: "paused", duration: 240, position: 60, positionAt: T - 30_000 }, T)).toEqual({ at: 60, duration: 240, running: false });
    expect(playhead({ state: "buffering", duration: 240, position: 60, positionAt: T - 30_000 }, T)?.running).toBe(false);
    expect(playhead({ state: "playing", duration: 240, position: 200, positionAt: T - 120_000 }, T)?.at).toBe(240);
    expect(playhead({ state: "playing", duration: 240, position: -5 }, T)?.at).toBe(0);
    expect(playhead({ state: "playing", duration: 240, position: 60, positionAt: T + 10_000 }, T)?.at).toBe(60);
  });

  it("takes a position with no time as of now", () => {
    expect(playhead({ state: "playing", duration: 240, position: 83 }, T)?.at).toBe(83);
  });

  it("is nothing for a stream with no duration, no position, or a player off, asleep or unavailable", () => {
    expect(playhead({ state: "playing", position: 600 }, T)).toBeUndefined();
    expect(playhead({ state: "playing", duration: 0, position: 0 }, T)).toBeUndefined();
    expect(playhead({ state: "playing", duration: 240 }, T)).toBeUndefined();
    for (const state of ["off", "standby", "unavailable"] as const) expect(playhead({ state, duration: 240, position: 60 }, T)).toBeUndefined();
  });

  it("gives the share played for a fill", () => {
    expect(playedShare({ at: 60, duration: 240, running: true })).toBe(0.25);
  });
});

describe("clockPlaces", () => {
  const digits = (parts: ReturnType<typeof clockPlaces>) => parts.map((p) => (p.kind === "colon" ? ":" : String(p.digit))).join("");

  it("keeps the same places from the start to the end of a track", () => {
    expect(digits(clockPlaces(83, 225))).toBe("1:23");
    expect(digits(clockPlaces(0, 225))).toBe("0:00");
    expect(digits(clockPlaces(83, 725))).toBe("01:23");
    expect(digits(clockPlaces(3723, 5400))).toBe("1:02:03");
    expect(digits(clockPlaces(83, 5400))).toBe("0:01:23");
  });

  it("starts each place part way into its turn, so a stepped animation keeps time", () => {
    const [minutes, , tens, ones] = clockPlaces(83, 225) as ClockPlace[];
    expect(minutes).toMatchObject({ base: 10, period: 60, cycle: 600, offset: 83, digit: 1 });
    expect(tens).toMatchObject({ base: 6, period: 10, cycle: 60, offset: 23, digit: 2 });
    expect(ones).toMatchObject({ base: 10, period: 1, cycle: 10, offset: 3, digit: 3 });
  });

  it("never counts past the end", () => {
    expect(digits(clockPlaces(999, 225))).toBe("3:45");
  });
});

describe("playTimeSpoken", () => {
  it("says a playing time in words", () => {
    expect(playTimeSpoken(83)).toBe("1 minute 23 seconds");
    expect(playTimeSpoken(3720)).toBe("1 hour 2 minutes");
    expect(playTimeSpoken(0)).toBe("0 seconds");
    expect(playTimeSpoken(1)).toBe("1 second");
  });
});
