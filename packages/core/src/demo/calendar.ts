import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import { createDemoTransport } from "./transport";
import type { DemoService } from "./transport";

const stamp = "2026-10-19T11:20:00Z";
const calendar = (entity_id: string, friendly_name: string): HassEntity => ({
  entity_id,
  state: "off",
  attributes: { friendly_name },
  last_changed: stamp,
  last_updated: stamp,
});

const initial: HassEntities = {
  "calendar.family": calendar("calendar.family", "Family"),
  "calendar.school": calendar("calendar.school", "School"),
};

/** A day from today as Home Assistant writes an all-day event's date: "2026-10-19". */
const date = (days: number) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
/** A local time on a day from today, as an ISO timestamp. */
const time = (days: number, hour: number, minute = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, minute).toISOString();
};

interface DemoEvent { start: string; end: string; summary: string; location?: string }

/** Each calendar's week, from today: placed on the day it is read, so the card always has a day to show. */
const WEEKS: Record<string, () => DemoEvent[]> = {
  "calendar.family": () => [
    { start: date(0), end: date(1), summary: "Bin day" },
    { start: time(0, 8, 15), end: time(0, 8, 45), summary: "School run" },
    { start: time(0, 14), end: time(0, 15), summary: "Dentist", location: "Main St Dental" },
    { start: time(0, 17, 30), end: time(0, 18, 30), summary: "Swimming", location: "Leisure centre" },
    { start: time(1, 18), end: time(1, 19, 30), summary: "Parents' evening" },
    { start: date(3), end: date(4), summary: "Grandma's birthday" },
  ],
  "calendar.school": () => [
    { start: time(1, 9), end: time(1, 10), summary: "Assembly" },
    { start: date(4), end: date(5), summary: "Inset day" },
  ],
};

/** Answers `calendar.get_events` for the calendar it targets, between the call's start and end. */
const getEvents: DemoService = ({ entity, data }) => {
  const from = typeof data.start_date_time === "string" ? Date.parse(data.start_date_time) : -Infinity;
  const to = typeof data.end_date_time === "string" ? Date.parse(data.end_date_time) : Infinity;
  const parse = (value: string) => (value.length === 10 ? new Date(`${value}T00:00:00`).getTime() : Date.parse(value));
  const events = (WEEKS[entity.entity_id]?.() ?? []).filter((event) => parse(event.end) > from && parse(event.start) < to);
  return { response: { [entity.entity_id]: { events } } };
};

/**
 * Storybook-only `calendar` transport: the real store, mapper and events read, answered locally. Two calendars, a
 * family's and a school's, each answering `calendar.get_events` with a week placed from today. Read-only otherwise.
 */
export function createDemoCalendarHaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({
    seed,
    services: { "calendar.get_events": getEvents },
    refuse: (domain, service) => new Error(`The calendar is read-only: ${domain}.${service}`),
  });
}
