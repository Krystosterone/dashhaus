import { describe, expect, it } from "vitest";
import { hourCycleOf } from "../entities/clock";
import { formatHaTime, parseHaTime } from "./time";

const now = new Date(2026, 9, 21, 9, 15); // Wednesday
const local = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();

describe("formatHaTime", () => {
  it("shows only the time for today, on the dashboard's hour cycle", () => {
    expect(formatHaTime(local(21, 8, 5), now, "h23")).toBe("08:05");
    expect(formatHaTime(local(21, 8, 5), now, "h12")).toBe("8:05\u00a0AM");
    expect(formatHaTime(local(21, 0, 30), now, "h12")).toBe("12:30\u00a0AM");
  });

  it("names the weekday within the last week, in English", () => {
    expect(formatHaTime(local(20, 23, 59), now, "h23")).toBe("Tue 23:59");
    expect(formatHaTime(local(20, 23, 59), now, "h12")).toBe("Tue 11:59\u00a0PM");
    expect(formatHaTime(local(15, 7), now, "h23")).toBe("Thu 07:00");
    expect(formatHaTime(local(15, 12), now, "h12")).toBe("Thu 12:00\u00a0PM");
  });

  it("falls back to the date for anything older, on either cycle", () => {
    expect(formatHaTime(local(14, 7), now, "h23")).toBe("Oct 14");
    expect(formatHaTime(local(14, 7), now, "h12")).toBe("Oct 14");
  });

  it("follows the browser locale's cycle when the dashboard sets none", () => {
    expect(formatHaTime(local(21, 14, 5), now)).toBe(formatHaTime(local(21, 14, 5), now, hourCycleOf()));
  });

  it("rejects what parseHaTime rejects", () => {
    expect(formatHaTime("2026-02-31T10:00:00Z", now)).toBeUndefined();
    expect(parseHaTime("not a date")).toBeUndefined();
    expect(parseHaTime(42)).toBeUndefined();
  });
});
