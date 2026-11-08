import { describe, expect, it } from "vitest";
import { daylightSummary, degrees, isActive, positionFact, scheduleTime, sunAfter, sunAllDay, sunIn, sunNext, sunSaid, sunSchedule, sunTime, sunWhen } from "./words";
import type { SunEntity } from "./types";

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();
const now = at(19, 15, 55);
const up: SunEntity = {
  entityId: "sun.sun", name: "Sun", state: "ok", up: true, now,
  nextSetting: at(19, 20, 30), nextDusk: at(19, 21, 4), nextDawn: at(20, 4, 25), nextRising: at(20, 5, 1), nextNoon: at(20, 12, 46),
};

describe("sun words", () => {
  it("leads with the sunset while it is up, and the sunrise while it is down", () => {
    expect(sunNext(up)).toEqual({ kind: "setting", at: at(19, 20, 30) });
    expect(sunAfter(up)).toEqual({ kind: "rising", at: at(20, 5, 1) });
    const down = { ...up, up: false };
    expect(sunNext(down)?.kind).toBe("rising");
    expect(sunAfter(down)?.kind).toBe("setting");
  });

  it("says when on 24 hours, and how long until it", () => {
    const next = sunNext(up)!;
    expect(sunTime(next, "h23")).toBe("20:30");
    expect(sunWhen(next, now)).toBe("Sets in 4h 35m");
    expect(sunWhen({ kind: "rising", at: at(20, 5, 1) }, at(19, 20, 49))).toBe("Rises in 8h 12m");
    expect(sunSaid(next, now, "h23")).toBe("Sunset at 20:30, sets in 4h 35m");
  });

  it("never counts down to zero: a few seconds off is in 1m", () => {
    expect(sunWhen({ kind: "setting", at: now + 5_000 }, now)).toBe("Sets in 1m");
  });

  it("names the day for an event more than a day off", () => {
    expect(sunWhen({ kind: "rising", at: at(22, 11, 0) }, now)).toBe("Rises Thu");
    expect(sunIn({ kind: "rising", at: at(22, 11, 0) }, now)).toBe("Thu");
    expect(sunIn(sunNext(up)!, now)).toBe("In 4h 35m");
  });

  it("says up or down all day where neither comes, and nothing while it isn't known", () => {
    expect(sunAllDay({ ...up, nextSetting: undefined })).toBe("Up all day");
    expect(sunAllDay({ ...up, up: false, nextRising: undefined })).toBe("Down all day");
    expect(sunAllDay(up)).toBeUndefined();
    expect(sunAllDay({ ...up, up: undefined })).toBeUndefined();
    expect(sunNext({ ...up, up: undefined })).toBeUndefined();
  });

  it("is active while it is up, and never while unavailable", () => {
    expect(isActive(up)).toBe(true);
    expect(isActive({ ...up, up: false })).toBe(false);
    expect(isActive({ ...up, state: "unavailable" })).toBe(false);
  });

  it("lists every event in the order they come, the day before a time that isn't today's", () => {
    const list = sunSchedule(up);
    expect(list.map((e) => e.kind)).toEqual(["setting", "dusk", "dawn", "rising", "noon"]);
    expect(list.map((e) => scheduleTime(e, now, "h23"))).toEqual(["20:30", "21:04", "Tomorrow 04:25", "Tomorrow 05:01", "Tomorrow 12:46"]);
    expect(sunSchedule({ ...up, state: "unavailable" })).toEqual([]);
  });

  it("says where it is in whole degrees, and the day's daylight", () => {
    expect(degrees(37.6)).toBe("38°");
    expect(degrees(-0.2)).toBe("0°");
    expect(positionFact({ elevation: 37.6, azimuth: 241.2 })).toBe("Elevation 38° · Azimuth 241°");
    expect(positionFact({})).toBeUndefined();
    expect(daylightSummary({ daylightMinutes: 929 })).toBe("Daylight 15h 29m");
    expect(daylightSummary({ daylightMinutes: 0 })).toBe("No daylight today");
  });
});

describe("sun words on a 12-hour clock", () => {
  const pm = (time: string) => `${time}\u00a0PM`;
  const am = (time: string) => `${time}\u00a0AM`;

  it("says when with its period, the hour unpadded, and counts down as on 24 hours", () => {
    const next = sunNext(up)!;
    expect(sunTime(next, "h12")).toBe(pm("8:30"));
    expect(sunTime({ kind: "rising", at: at(20, 5, 1) }, "h12")).toBe(am("5:01"));
    expect(sunSaid(next, now, "h12")).toBe(`Sunset at ${pm("8:30")}, sets in 4h 35m`);
  });

  it("lists every event with its period, the day before a time that isn't today's", () => {
    expect(sunSchedule(up).map((e) => scheduleTime(e, now, "h12"))).toEqual([
      pm("8:30"), pm("9:04"), `Tomorrow ${am("4:25")}`, `Tomorrow ${am("5:01")}`, `Tomorrow ${pm("12:46")}`,
    ]);
  });
});
