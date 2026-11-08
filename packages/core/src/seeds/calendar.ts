import type { CalendarEntity, CalendarEvent, CalendarHistory } from "../entities/calendar/types";
import { calendarDay } from "../entities/calendar/agenda";

/**
 * Example data for stories. The clock is fixed at 11:54 on Monday 19 October 2026, local time, so a countdown, "Now"
 * and the day's list draw the same in every screenshot; every event is placed from that day.
 */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();
/** The seeds' minute: Monday 19 October 2026, 11:54. */
export const CALENDAR_NOW = at(19, 11, 54);

const timed = (title: string, start: number, end: number, more: Partial<CalendarEvent> = {}): CalendarEvent => ({ title, start, end, allDay: false, ...more });
/** An all-day event over `days` days from `day`. */
const allDay = (title: string, day: number, days = 1, more: Partial<CalendarEvent> = {}): CalendarEvent => ({ title, start: at(day, 0), end: at(day + days, 0), allDay: true, ...more });

export interface CalendarSeed { entity: CalendarEntity; history: CalendarHistory }

/** A seed from its entity: today's plan by hour is read from its events, as the hook does. */
const seed = (entity: Omit<CalendarEntity, "now" | "days" | "calendars"> & Partial<Pick<CalendarEntity, "days" | "calendars">>): CalendarSeed => {
  const full: CalendarEntity = { days: 7, calendars: 1, ...entity, now: CALENDAR_NOW };
  return { entity: full, history: calendarDay(full.events, CALENDAR_NOW) };
};

export const CALENDAR_SEEDS = {
  /** The dentist at 14:00, in 2h 6m: the school run already over, swimming after. */
  normal: seed({
    entityId: "calendar.family", name: "Family", state: "ok", lastUpdated: "11:40",
    events: [
      timed("School run", at(19, 8, 15), at(19, 8, 45)),
      timed("Dentist", at(19, 14), at(19, 15), { location: "Main St Dental" }),
      timed("Swimming", at(19, 17, 30), at(19, 18, 30), { location: "Leisure centre" }),
      timed("Parents' evening", at(20, 18), at(20, 19, 30)),
      allDay("Grandma's birthday", 22),
    ],
  }),
  /** A meeting under way until 12:15, two more after it. */
  underWay: seed({
    entityId: "calendar.work", name: "Work", state: "ok", lastUpdated: "11:30",
    events: [
      timed("Team standup", at(19, 11, 30), at(19, 12, 15), { location: "Room 3" }),
      timed("Lunch with Sam", at(19, 12, 30), at(19, 13, 30)),
      timed("Design review", at(19, 15), at(19, 16, 30)),
    ],
  }),
  /** Bin day, all day, with nothing timed today: it leads. */
  allDay: seed({
    entityId: "calendar.household", name: "Household", state: "ok", lastUpdated: "00:00",
    events: [allDay("Bin day", 19), timed("Window cleaner", at(21, 10), at(21, 11)), allDay("Boiler service", 23)],
  }),
  /** Today is done: the next is tomorrow morning. */
  tomorrow: seed({
    entityId: "calendar.kids", name: "Kids", state: "ok", lastUpdated: "08:00",
    events: [timed("Swim club", at(19, 7), at(19, 8)), timed("School trip", at(20, 9, 30), at(20, 15), { location: "Science museum" })],
  }),
  /** Nothing on any calendar for the week. */
  free: seed({ entityId: "calendar.holidays", name: "Holidays", state: "ok", lastUpdated: "09:12", events: [] }),
  /** Reachable, but its events haven't been read yet. */
  waiting: seed({ entityId: "calendar.club", name: "Club", state: "ok" }),
  unavailable: seed({ entityId: "calendar.shared", name: "Shared", state: "unavailable", lastSeen: "08:20" }),
  /** Worst case: a long name and area, a long title and place, three calendars over a month (break-ui skill). */
  long: seed({
    entityId: "calendar.family_shared", name: "Family calendar shared with the grandparents", area: "Utility room behind the laundry and boiler",
    state: "ok", lastUpdated: "Fri 18:30", days: 31, calendars: 3,
    events: [
      timed("Parent–teacher conference about the spring field trip permission slips", at(19, 15, 45), at(19, 16, 30), { location: "Riverside Elementary School, Room 214 (east entrance)", calendar: "School and after-school clubs" }),
      timed("Orthodontist follow-up for the retainer adjustment", at(19, 17, 10), at(19, 17, 40), { location: "Downtown Orthodontics, 4th floor", calendar: "Family calendar shared with the grandparents" }),
      allDay("Grandparents visiting for the long weekend", 23, 4, { calendar: "Family calendar shared with the grandparents" }),
    ],
  }),
  /** Worst case: six all-day events today and nothing timed; the half term began on Saturday and runs to Friday. */
  manyAllDay: seed({
    entityId: "calendar.home", name: "Home", area: "Kitchen", state: "ok", lastUpdated: "06:00",
    events: [
      allDay("Half term", 17, 7),
      allDay("Bin day", 19),
      allDay("Recycling", 19),
      allDay("Dad away", 19, 2),
      allDay("Library books due", 19),
      allDay("Grandma visiting", 19),
    ],
  }),
  /** Worst case: an event across midnight, tonight into tomorrow, as the only one. */
  overnight: seed({
    entityId: "calendar.travel", name: "Travel", state: "ok", lastUpdated: "11:02",
    events: [timed("Overnight flight to Reykjavík", at(19, 23, 10), at(20, 6, 40), { location: "Gate B12" })],
  }),
  /** Worst case: accented text throughout. */
  accented: seed({
    entityId: "calendar.familie", name: "Kalender – Familie Müller-Lüdenscheidt", area: "Wohnküche im Erdgeschoss", state: "ok", lastUpdated: "11:50",
    events: [timed("Réunion parents–professeurs à l'école", at(19, 11, 50), at(19, 12, 40), { location: "École élémentaire Sainte-Thérèse" })],
  }),
  /** Worst case: a one-letter name, no area, today only and nothing in it. */
  bare: seed({ entityId: "calendar.k", name: "K", state: "ok", days: 1, events: [] }),
  /** Worst case: gone, and never seen. */
  gone: seed({ entityId: "calendar.old", name: "Old school calendar", state: "unavailable" }),
} satisfies Record<string, CalendarSeed>;

export type CalendarSeedName = keyof typeof CALENDAR_SEEDS;

/** Worst-case data: the card's Worst case story and each skin's Foundations → Worst case draw these. */
export const CALENDAR_WORST_CASE: CalendarSeed[] = [
  CALENDAR_SEEDS.long,
  CALENDAR_SEEDS.manyAllDay,
  CALENDAR_SEEDS.overnight,
  CALENDAR_SEEDS.accented,
  CALENDAR_SEEDS.free,
  CALENDAR_SEEDS.bare,
  CALENDAR_SEEDS.gone,
];
