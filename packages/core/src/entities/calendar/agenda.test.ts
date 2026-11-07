import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "./types";
import { calendarAgenda, calendarDay } from "./agenda";

/** Monday 19 October 2026, local time. */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();
const NOW = at(19, 11, 54);
const timed = (title: string, start: number, end: number): CalendarEvent => ({ title, start, end, allDay: false });
const allDay = (title: string, firstDay: number, days = 1): CalendarEvent => ({ title, start: at(firstDay, 0), end: at(firstDay + days, 0), allDay: true });

const breakfast = timed("Breakfast", at(19, 8), at(19, 9));
const standup = timed("Standup", at(19, 11, 30), at(19, 12, 15));
const dentist = timed("Dentist", at(19, 14), at(19, 15));
const bins = allDay("Bin day", 19);
const swim = timed("Swim", at(20, 9, 30), at(20, 10, 30));
const birthday = allDay("Birthday", 20);

describe("calendarAgenda", () => {
  it("leads with the event under way, and lists today's with all-day ones first", () => {
    const agenda = calendarAgenda([dentist, swim, breakfast, bins, standup], NOW);
    expect(agenda.next).toBe(standup);
    expect(agenda.today).toEqual([bins, breakfast, standup, dentist]);
    expect(agenda.left).toEqual([bins, standup, dentist]);
    expect(agenda.later).toEqual([swim]);
  });

  it("puts a timed event to come today before the day's all-day ones", () => {
    expect(calendarAgenda([bins, dentist], NOW).next).toBe(dentist);
  });

  it("leads with an all-day event when the day has nothing timed left", () => {
    expect(calendarAgenda([breakfast, bins, swim], NOW).next).toBe(bins);
  });

  it("leads with the next day's first event, timed before all-day, when today is done", () => {
    expect(calendarAgenda([breakfast, birthday, swim], NOW).next).toBe(swim);
  });

  it("counts an event that started yesterday and runs on as today's", () => {
    const night = timed("Night shift", at(18, 22), at(19, 13));
    const agenda = calendarAgenda([night, dentist], NOW);
    expect(agenda.next).toBe(night);
    expect(agenda.today).toEqual([night, dentist]);
  });

  it("has nothing to lead with when nothing is left", () => {
    expect(calendarAgenda([breakfast], NOW)).toEqual({ next: undefined, today: [breakfast], left: [], later: [] });
    expect(calendarAgenda(undefined, NOW).next).toBeUndefined();
  });
});

describe("calendarDay", () => {
  it("shares each hour by the timed events in it, the hours ahead included, overlaps once", () => {
    const day = calendarDay([breakfast, standup, timed("Overlap", at(19, 11, 45), at(19, 12)), dentist, bins], NOW);
    expect(day.currentHour).toBe(11);
    expect(day.samples).toHaveLength(24);
    expect(day.samples[8]).toBe(1);
    expect(day.samples[11]).toBe(0.5);
    expect(day.samples[12]).toBe(0.25);
    expect(day.samples[14]).toBe(1);
    expect(day.samples[20]).toBe(0);
    expect(day.busyMinutes).toBe(60 + 45 + 60);
  });

  it("counts only today's part of an event across midnight, and no hours for all-day ones", () => {
    const day = calendarDay([timed("Night shift", at(18, 22), at(19, 2)), allDay("Half term", 17, 5)], NOW);
    expect(day.samples.slice(0, 3)).toEqual([1, 1, 0]);
    expect(day.busyMinutes).toBe(120);
  });
});
