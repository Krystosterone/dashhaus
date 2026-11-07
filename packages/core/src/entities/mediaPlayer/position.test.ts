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

  it("starts from the fractional position, so the clock turns with the fill", () => {
    const [minutes, , tens, ones] = clockPlaces(83.6, 225) as ClockPlace[];
    expect(ones.offset).toBeCloseTo(3.6);
    expect(tens.offset).toBeCloseTo(23.6);
    expect(minutes.offset).toBeCloseTo(83.6);
    expect(ones.digit).toBe(3);
  });

  it("runs each place to the end of the track and stops there, showing the length", () => {
    // Where each place's last turn leaves it: the digit `turns` of the current one reaches, as fill forwards holds it.
    const ends = (at: number, duration: number) => (clockPlaces(at, duration) as ReturnType<typeof clockPlaces>)
      .map((p) => (p.kind === "colon" ? ":" : String(Math.floor(((p.turns % 1) * p.cycle) / p.period))))
      .join("");
    const [minutes, , tens, ones] = clockPlaces(83, 225) as ClockPlace[];
    // 142 s to go: the ones turn 14.2 times from 3 s in, the tens 2.75 from 23 s, the minutes 0.375 from 83 s.
    expect(ones.turns).toBeCloseTo((3 + 142) / 10, 3);
    expect(tens.turns).toBeCloseTo((23 + 142) / 60, 3);
    expect(minutes.turns).toBeCloseTo((83 + 142) / 600, 3);
    expect(ends(83, 225)).toBe("3:45");
    // A length that ends on a turn shows its first digit, not the last one before it.
    expect(ends(83, 240)).toBe("4:00");
    expect(ends(83.4, 240)).toBe("4:00");
    expect(ends(3723, 5400)).toBe("1:30:00");
    // At the end already: nothing left to turn.
    expect(ends(225, 225)).toBe("3:45");
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
