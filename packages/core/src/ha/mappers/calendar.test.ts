import { describe, expect, it } from "vitest";
import { calendarEventsFromHass, calendarFromHass } from "./calendar";

/** Monday 19 October 2026, local time. */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();
const now = new Date(at(19, 11, 54));
/** A local time as Home Assistant writes it with the browser's own offset, so the test holds in any time zone. */
const iso = (ms: number) => {
  const d = new Date(ms);
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
};

const raw = {
  entity_id: "calendar.family",
  state: "off",
  attributes: {
    friendly_name: "Family",
    message: "Dentist",
    all_day: false,
    start_time: "2026-10-19 14:00:00",
    end_time: "2026-10-19 15:00:00",
    location: "Main St Dental",
  },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};

const response = {
  response: {
    "calendar.family": {
      events: [
        { start: iso(at(19, 14)), end: iso(at(19, 15)), summary: "Dentist", location: "Main St Dental" },
        { start: "2026-10-19", end: "2026-10-20", summary: "Bin day" },
        { start: iso(at(19, 8)), end: iso(at(19, 9)), summary: "" },
      ],
    },
    "calendar.school": {
      events: [
        { start: iso(at(20, 9)), end: iso(at(20, 10)), summary: "Assembly" },
        { start: "not a time", end: iso(at(20, 10)), summary: "Broken" },
        { start: iso(at(20, 11)), end: iso(at(20, 10)), summary: "Ends before it starts" },
      ],
    },
  },
};

describe("calendarEventsFromHass", () => {
  it("merges every calendar's events by start, all-day dates at local midnight, naming whose when there are several", () => {
    const events = calendarEventsFromHass(response, [{ entityId: "calendar.family", name: "Family" }, { entityId: "calendar.school", name: "School" }]);
    expect(events.map((e) => e.title)).toEqual(["Bin day", "Busy", "Dentist", "Assembly"]);
    expect(events[0]).toEqual({ title: "Bin day", start: at(19, 0), end: at(20, 0), allDay: true, calendar: "Family" });
    expect(events[2]).toEqual({ title: "Dentist", start: at(19, 14), end: at(19, 15), allDay: false, location: "Main St Dental", calendar: "Family" });
    expect(events[3].calendar).toBe("School");
  });

  it("leaves one calendar's events unnamed, and reads the unwrapped and result-wrapped shapes", () => {
    const one = [{ entityId: "calendar.family", name: "Family" }];
    expect(calendarEventsFromHass(response, one).every((e) => e.calendar === undefined)).toBe(true);
    expect(calendarEventsFromHass(response.response, one)).toHaveLength(3);
    expect(calendarEventsFromHass({ result: response }, one)).toHaveLength(3);
    expect(calendarEventsFromHass(null, one)).toEqual([]);
  });

  it("keeps an all-day event that names its last day as covering that day", () => {
    const events = calendarEventsFromHass({ "calendar.family": { events: [{ start: "2026-10-19", end: "2026-10-19", summary: "Bin day" }] } }, [{ entityId: "calendar.family" }]);
    expect(events).toEqual([{ title: "Bin day", start: at(19, 0), end: at(20, 0), allDay: true }]);
  });
});

describe("calendarFromHass", () => {
  it("maps identity, the horizon and the events read beside it, from today's start to the horizon", () => {
    const events = calendarEventsFromHass(response, [{ entityId: "calendar.family" }]);
    const far = { title: "Far", start: at(30, 9), end: at(30, 10), allDay: false };
    const mapped = calendarFromHass(raw, raw.entity_id, { area: "Kitchen", now, events: [...events, far], days: 7, calendars: 2 });
    expect(mapped).toMatchObject({ entityId: "calendar.family", name: "Family", area: "Kitchen", state: "ok", now: now.getTime(), days: 7, calendars: 2 });
    expect(mapped.events?.map((e) => e.title)).toEqual(["Bin day", "Busy", "Dentist"]);
    expect(mapped.lastUpdated).toBeDefined();
  });

  it("stands in the entity's own event while its events are unread", () => {
    const mapped = calendarFromHass(raw, raw.entity_id, { now });
    expect(mapped.events).toEqual([{ title: "Dentist", start: at(19, 14), end: at(19, 15), allDay: false, location: "Main St Dental" }]);
    expect(calendarFromHass({ ...raw, attributes: { friendly_name: "Family" } }, raw.entity_id, { now }).events).toBeUndefined();
  });

  it("keeps unknown, unavailable, and missing calendars unavailable, with no events", () => {
    for (const state of ["unknown", "unavailable"]) expect(calendarFromHass({ ...raw, state }, raw.entity_id, { now, events: [] })).toMatchObject({ state: "unavailable", events: undefined });
    expect(calendarFromHass(undefined, "calendar.missing")).toMatchObject({ name: "calendar.missing", state: "unavailable" });
  });

  it("reads on and off as available", () => {
    expect(calendarFromHass({ ...raw, state: "on" }, raw.entity_id).state).toBe("ok");
  });

  it("looks a week ahead by default, never less than today", () => {
    expect(calendarFromHass(raw, raw.entity_id).days).toBe(7);
    expect(calendarFromHass(raw, raw.entity_id, { days: 0 }).days).toBe(1);
  });

  it("sets lastSeen only when unavailable", () => {
    expect(calendarFromHass(raw, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBeUndefined();
    expect(calendarFromHass({ ...raw, state: "unavailable" }, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBe("07:00");
  });
});
