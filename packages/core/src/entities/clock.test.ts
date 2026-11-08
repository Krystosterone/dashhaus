import { describe, expect, it } from "vitest";
import { clockFace, clockOf, clockParts, hourCycleOf, hourLabel, momentWords, timeOfDay } from "./clock";

const NOW = new Date(2026, 9, 17, 11, 54);

describe("clockFace", () => {
  it("pads a 24-hour clock's hour and has no day period", () => {
    const face = clockFace(new Date(2026, 8, 30, 9, 5), { locale: "de-DE" });
    expect(face).toMatchObject({ time: "09:05", period: undefined, twentyFour: true });
  });

  it("leaves a 12-hour clock's hour unpadded, its day period apart", () => {
    const face = clockFace(new Date(2026, 8, 30, 9, 5), { locale: "en-US", hourCycle: "h12" });
    expect(face.time).toBe("9:05");
    expect(face.period).toBe("AM");
    expect(face.twentyFour).toBe(false);
  });

  it("follows an asked-for hour cycle over the locale's", () => {
    expect(clockFace(NOW, { locale: "en-US", hourCycle: "h23" }).time).toBe("11:54");
  });

  it("says the date in words, and the day machine-readable", () => {
    const face = clockFace(NOW, { locale: "en-CA" });
    expect(face.date).toBe("Saturday, October 17");
    expect(face.day).toBe("2026-10-17");
  });

  it("reads the day in the clock's time zone, not UTC's", () => {
    const late = new Date(Date.UTC(2026, 9, 18, 3, 30));
    expect(clockFace(late, { locale: "en-CA", timeZone: "America/Vancouver" }).day).toBe("2026-10-17");
    expect(clockFace(late, { locale: "en-CA", timeZone: "Europe/Paris" }).day).toBe("2026-10-18");
  });
});

describe("the dashboard's hour cycle", () => {
  it("is the one asked for, else the locale's", () => {
    expect(hourCycleOf("en-US", "h23")).toBe("h23");
    expect(hourCycleOf("de-DE", "h12")).toBe("h12");
    expect(hourCycleOf("en-US")).toBe("h12");
    expect(hourCycleOf("de-DE")).toBe("h23");
    expect(hourCycleOf("en-GB")).toBe("h23");
  });

  it("says a time of day on 24 hours with the hour padded, on 12 with its period in core's words", () => {
    expect(timeOfDay(14, 5, "h23")).toBe("14:05");
    expect(timeOfDay(9, 30, "h23")).toBe("09:30");
    expect(timeOfDay(14, 5, "h12")).toBe("2:05\u00a0PM");
    expect(timeOfDay(0, 0, "h12")).toBe("12:00\u00a0AM");
    expect(timeOfDay(12, 0, "h12")).toBe("12:00\u00a0PM");
    expect(timeOfDay(24, 0, "h23")).toBe("00:00");
    expect(clockOf(new Date(2026, 9, 17, 23, 58), "h12")).toBe("11:58\u00a0PM");
  });

  it("gives a screen its time and period apart, four digits at most", () => {
    expect(clockParts(14, 0, "h23")).toEqual({ time: "14:00" });
    expect(clockParts(14, 0, "h12")).toEqual({ time: "2:00", period: "PM" });
    expect(clockParts(10, 15, "h12")).toEqual({ time: "10:15", period: "AM" });
    for (let h = 0; h < 24; h++) for (const cycle of ["h12", "h23"] as const) {
      expect(clockParts(h, 59, cycle).time.replace(":", "").length).toBeLessThanOrEqual(4);
    }
  });

  it("heads a column of hours in two digits, or the hour and its period", () => {
    expect(hourLabel(14, "h23")).toBe("14");
    expect(hourLabel(26, "h23")).toBe("02");
    expect(hourLabel(14, "h12")).toBe("2PM");
    expect(hourLabel(0, "h12")).toBe("12AM");
  });

  it("says when something happened relative to now, in English on either cycle", () => {
    const now = new Date(2026, 9, 21, 9, 15);
    expect(momentWords(new Date(2026, 9, 21, 8, 5), now, "h23")).toBe("08:05");
    expect(momentWords(new Date(2026, 9, 21, 8, 5), now, "h12")).toBe("8:05\u00a0AM");
    expect(momentWords(new Date(2026, 9, 19, 6, 12), now, "h12")).toBe("Mon 6:12\u00a0AM");
    expect(momentWords(new Date(2026, 9, 3, 6, 12), now, "h12")).toBe("Oct 3");
  });
});
