import { describe, expect, it } from "vitest";
import { formatHaTime, parseHaTime } from "./time";

const now = new Date(2026, 9, 21, 9, 15); // Wednesday
const local = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
const clock = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const weekday = (day: number) => new Date(2026, 9, day).toLocaleDateString([], { weekday: "short" });

describe("formatHaTime", () => {
  it("shows only the time for today", () => {
    expect(formatHaTime(local(21, 8, 5), now)).toBe(clock(21, 8, 5));
  });

  it("names the weekday within the last week", () => {
    expect(formatHaTime(local(20, 23, 59), now)).toBe(`${weekday(20)} ${clock(20, 23, 59)}`);
    expect(formatHaTime(local(15, 7), now)).toBe(`${weekday(15)} ${clock(15, 7)}`);
  });

  it("falls back to the date for anything older", () => {
    expect(formatHaTime(local(14, 7), now)).toBe(new Date(2026, 9, 14).toLocaleDateString([], { day: "numeric", month: "short" }));
  });

  it("rejects what parseHaTime rejects", () => {
    expect(formatHaTime("2026-02-31T10:00:00Z", now)).toBeUndefined();
    expect(parseHaTime("not a date")).toBeUndefined();
    expect(parseHaTime(42)).toBeUndefined();
  });
});
