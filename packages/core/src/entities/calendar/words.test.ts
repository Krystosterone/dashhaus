import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "./types";
import { clockFigure, clockTime, countdown, dayWord, eventCue, eventDay, eventDetail, eventSpan, eventWhen, freeFor, horizonFact, isActive, leftToday, minutesUntil } from "./words";

/** Monday 19 October 2026, local time. */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();
const NOW = at(19, 11, 54);
const timed = (title: string, start: number, end: number): CalendarEvent => ({ title, start, end, allDay: false });
const allDay = (title: string, firstDay: number, days = 1): CalendarEvent => ({ title, start: at(firstDay, 0), end: at(firstDay + days, 0), allDay: true });

describe("calendar words", () => {
  it("is active while an event is under way, timed or all-day, and rests with none", () => {
    expect(isActive(timed("Dentist", at(19, 11), at(19, 13)), NOW)).toBe(true);
    expect(isActive(allDay("Bin day", 19), NOW)).toBe(true);
    expect(isActive(timed("Later", at(19, 14), at(19, 15)), NOW)).toBe(false);
    expect(isActive(undefined, NOW)).toBe(false);
  });

  it("tells the time on 24 hours, as the weather does", () => {
    expect(clockTime(at(19, 9, 5), "h23")).toBe("09:05");
    expect(clockTime(at(19, 14, 0), "h23")).toBe("14:00");
  });

  it("says the day from now: today, tomorrow, the weekday this week, then the date", () => {
    expect(dayWord(at(19, 18), NOW)).toBe("Today");
    expect(dayWord(at(20, 9), NOW)).toBe("Tomorrow");
    expect(dayWord(at(22, 9), NOW)).toBe("Thu");
    expect(dayWord(at(26, 9), NOW)).toBe("Oct 26");
  });

  it("counts down to a start in minutes, rounded up, never zero", () => {
    expect(minutesUntil(timed("A", at(19, 12, 19), at(19, 13)), NOW)).toBe(25);
    expect(countdown(25)).toBe("In 25m");
    expect(countdown(130)).toBe("In 2h 10m");
    expect(countdown(0)).toBe("In 1m");
  });

  it("says when an event still to come today is: how long until it starts", () => {
    expect(eventWhen(timed("Dentist", at(19, 14, 4), at(19, 15)), NOW, "h23")).toEqual({ label: "In", value: "2h 10m", line: "In 2h 10m" });
  });

  it("says until when an event under way runs", () => {
    expect(eventWhen(timed("Standup", at(19, 11, 30), at(19, 13)), NOW, "h23")).toEqual({ label: "Until", value: "13:00", line: "Until 13:00" });
    expect(eventWhen(timed("Night shift", at(19, 8), at(20, 6)), NOW, "h23").line).toBe("Until Tomorrow 06:00");
    expect(eventWhen(allDay("Bin day", 19), NOW, "h23")).toEqual({ label: "Today", value: "All day", line: "All day" });
    expect(eventWhen(allDay("Half term", 17, 5), NOW, "h23")).toEqual({ label: "Until", value: "Wed", line: "Until Wed" });
  });

  it("says the day over the time for an event on another day", () => {
    expect(eventWhen(timed("Swim", at(20, 9, 30), at(20, 10, 30)), NOW, "h23")).toEqual({ label: "Tomorrow", value: "09:30", line: "Tomorrow 09:30" });
    expect(eventWhen(allDay("Mum's birthday", 22), NOW, "h23")).toEqual({ label: "Thu", value: "All day", line: "Thu" });
  });

  it("cues a compact row with Now while a timed event is under way", () => {
    expect(eventCue(timed("Standup", at(19, 11, 30), at(19, 13)), NOW, "h23")).toBe("Now");
    expect(eventCue(allDay("Bin day", 19), NOW, "h23")).toBe("All day");
    expect(eventCue(timed("Swim", at(20, 9, 30), at(20, 10)), NOW, "h23")).toBe("Tomorrow 09:30");
  });

  it("spans an event for the day's list", () => {
    expect(eventSpan(timed("Dentist", at(19, 14), at(19, 15)), NOW, "h23")).toBe("14:00–15:00");
    expect(eventSpan(timed("Ends at midnight", at(19, 22), at(20, 0)), NOW, "h23")).toBe("22:00–00:00");
    expect(eventSpan(timed("Late", at(19, 22), at(20, 1)), NOW, "h23")).toBe("22:00–Tue 01:00");
    expect(eventSpan(allDay("Bin day", 19), NOW, "h23")).toBe("All day");
    expect(eventSpan(allDay("Half term", 17, 5), NOW, "h23")).toBe("Until Wed");
  });

  it("names a later event's day and time, and where and on which calendar it is", () => {
    expect(eventDay(timed("Swim", at(20, 9, 30), at(20, 10)), NOW, "h23")).toBe("Tomorrow 09:30");
    expect(eventDay(allDay("Birthday", 22), NOW, "h23")).toBe("Thu");
    expect(eventDetail({ ...timed("Dentist", 0, 1), location: "Main St Dental", calendar: "School" })).toBe("Main St Dental · School");
    expect(eventDetail(timed("Dentist", 0, 1))).toBeUndefined();
  });

  it("says a free horizon, today's count and the horizon in words", () => {
    expect(freeFor(7)).toEqual({ label: "For", value: "7 days", line: "Free for 7 days" });
    expect(freeFor(1).line).toBe("Free today");
    expect(leftToday(3, 5)).toBe("3 left today");
    expect(leftToday(0, 2)).toBe("Nothing more today");
    expect(leftToday(0, 0)).toBe("Nothing today");
    expect(horizonFact(7, 1)).toBe("Next 7 days");
    expect(horizonFact(14, 3)).toBe("3 calendars · Next 14 days");
    expect(horizonFact(1, 1)).toBe("Today only");
  });
});

describe("calendar words on a 12-hour clock", () => {
  const pm = (time: string) => `${time}\u00a0PM`;
  const am = (time: string) => `${time}\u00a0AM`;

  it("tells the time with its period, the hour unpadded", () => {
    expect(clockTime(at(19, 9, 5), "h12")).toBe(am("9:05"));
    expect(clockTime(at(19, 14, 0), "h12")).toBe(pm("2:00"));
    expect(clockFigure(at(19, 14, 0), "h12")).toEqual({ time: "2:00", period: "PM" });
    expect(clockFigure(at(19, 14, 0), "h23")).toEqual({ time: "14:00" });
  });

  it("says until when, and the day over the time, with the period", () => {
    expect(eventWhen(timed("Standup", at(19, 11, 30), at(19, 13)), NOW, "h12")).toEqual({ label: "Until", value: pm("1:00"), line: `Until ${pm("1:00")}` });
    expect(eventWhen(timed("Night shift", at(19, 8), at(20, 6)), NOW, "h12").line).toBe(`Until Tomorrow ${am("6:00")}`);
    expect(eventWhen(timed("Swim", at(20, 14), at(20, 15)), NOW, "h12").line).toBe(`Tomorrow ${pm("2:00")}`);
    expect(eventCue(timed("Swim", at(20, 9, 30), at(20, 10)), NOW, "h12")).toBe(`Tomorrow ${am("9:30")}`);
    expect(eventDay(timed("Swim", at(20, 9, 30), at(20, 10)), NOW, "h12")).toBe(`Tomorrow ${am("9:30")}`);
  });

  it("spans an event saying its start's period only where it differs from its end's", () => {
    expect(eventSpan(timed("Dentist", at(19, 14), at(19, 15)), NOW, "h12")).toBe(`2:00–${pm("3:00")}`);
    expect(eventSpan(timed("Lunch", at(19, 11, 30), at(19, 12, 30)), NOW, "h12")).toBe(`${am("11:30")}–${pm("12:30")}`);
    expect(eventSpan(timed("Late", at(19, 22), at(20, 1)), NOW, "h12")).toBe(`${pm("10:00")}–Tue ${am("1:00")}`);
  });
});
