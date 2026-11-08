/** How a dashboard's header reads the time: its locale, 12 or 24 hours, and its time zone. */
export interface ClockOptions {
  /** BCP 47 locale for the date and time. Defaults to the browser's. */
  locale?: string;
  /** 12 or 24 hour clock. Defaults to the locale's. */
  hourCycle?: HourCycle;
  /** IANA time zone, e.g. Home Assistant's "America/Toronto". Defaults to the device's. */
  timeZone?: string;
}

/** A header's date and time, as words to show and as machine-readable values for `<time>`. */
export interface ClockFace {
  /** "Saturday, October 17". */
  date: string;
  /** The same day as `YYYY-MM-DD`, in the clock's time zone (`toISOString` would use UTC). */
  day: string;
  /** The time without its day period: "11:54", "9:05". 24-hour clocks pad the hour, 12-hour clocks don't. */
  time: string;
  /** AM/PM in the locale's words, on a 12-hour clock. */
  period?: string;
  /** Whether the clock runs 0 to 23. */
  twentyFour: boolean;
}

/** Today's date and the time for a dashboard header, in the locale, hour cycle and time zone asked for. */
export function clockFace(now: Date, { locale, hourCycle, timeZone }: ClockOptions = {}): ClockFace {
  const date = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", timeZone }).format(now);
  const cycle = new Intl.DateTimeFormat(locale, { hour: "numeric", hourCycle, timeZone }).resolvedOptions().hourCycle;
  const twentyFour = cycle === "h23" || cycle === "h24";
  const parts = new Intl.DateTimeFormat(locale, { hour: twentyFour ? "2-digit" : "numeric", minute: "2-digit", hourCycle, timeZone }).formatToParts(now);
  const time = parts.filter((p) => p.type !== "dayPeriod").map((p) => p.value).join("").trim();
  const period = parts.find((p) => p.type === "dayPeriod")?.value;
  const day = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(now);
  return { date, day, time, period, twentyFour };
}

/**
 * The clock a dashboard says its times on: 12 hours with a day period, or 24. One per dashboard, the header's, and
 * every card on it says a time on it (spec/cards.md → What every card says).
 */
export type HourCycle = "h12" | "h23";

const LOCALE_CYCLES = new Map<string, HourCycle>();

/** The hour cycle asked for, else the one `locale` reads the time on (the browser's when none is given). */
export function hourCycleOf(locale?: string, hourCycle?: HourCycle): HourCycle {
  if (hourCycle) return hourCycle;
  const key = locale ?? "";
  let cycle = LOCALE_CYCLES.get(key);
  if (!cycle) {
    const resolved = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
    cycle = resolved === "h23" || resolved === "h24" ? "h23" : "h12";
    LOCALE_CYCLES.set(key, cycle);
  }
  return cycle;
}

/** A 12-hour clock's day periods, in core's words, the same on every card and in every skin. */
export const DAY_PERIOD = { am: "AM", pm: "PM" } as const;

/**
 * A time of day in its parts, as a segment screen draws it: `time` is "14:05" on 24 hours (the hour padded, as the
 * header's), "2:05" on 12 (the hour unpadded, so a screen's fixed places leave the first one unlit); `period` is AM
 * or PM, on 12 hours only.
 */
export function clockParts(hour: number, minute: number, hourCycle: HourCycle = hourCycleOf()): { time: string; period?: string } {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  const mm = String(Math.trunc(minute)).padStart(2, "0");
  if (hourCycle === "h23") return { time: `${String(h).padStart(2, "0")}:${mm}` };
  return { time: `${h % 12 || 12}:${mm}`, period: h < 12 ? DAY_PERIOD.am : DAY_PERIOD.pm };
}

/**
 * A time of day as every card says it, on the dashboard's hour cycle: "14:05", or "2:05 PM", with a no-break space
 * before the period so a line never wraps between them.
 */
export function timeOfDay(hour: number, minute: number, hourCycle: HourCycle = hourCycleOf()): string {
  const { time, period } = clockParts(hour, minute, hourCycle);
  return period ? `${time}\u00a0${period}` : time;
}

/** A moment's time of day, in the device's time zone: "14:05", "2:05 PM". */
export const clockOf = (date: Date, hourCycle: HourCycle = hourCycleOf()) => timeOfDay(date.getHours(), date.getMinutes(), hourCycle);

/**
 * An hour as it heads a column of hours (a forecast's next hours): "14" on 24 hours, "2PM" on 12, the period set
 * close, since a column has the room of two digits and a little more.
 */
export function hourLabel(hour: number, hourCycle: HourCycle = hourCycleOf()): string {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  if (hourCycle === "h23") return String(h).padStart(2, "0");
  return `${h % 12 || 12}${h < 12 ? DAY_PERIOD.am : DAY_PERIOD.pm}`;
}

/**
 * When something happened, relative to `now`, as a card's small print says it: its time today ("14:05", "2:05 PM"),
 * the weekday and time within the last week ("Tue 14:05"), the date before that ("Oct 3"). English, as every card's
 * words are, and on the dashboard's hour cycle.
 */
export function momentWords(date: Date, now: Date, hourCycle: HourCycle = hourCycleOf()): string {
  const time = clockOf(date, hourCycle);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= today) return time;
  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  if (date >= weekAgo) return `${date.toLocaleDateString("en-US", { weekday: "short" })} ${time}`;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** One piece of a line of words: its words, or a time in it (`time: true`). */
export interface LinePart {
  text: string;
  time?: true;
}

// A time as core writes one: "14:05" or "2:05 PM", a span ("2:00–3:00 PM", "11:30 AM–12:30 PM"), with the weekday
// before it when it has one ("Fri 18:30"), and the " · " that leads it in when it comes after other words.
const TIME = /(?: · )?(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[ \u00a0])?\d{1,2}:\d\d(?:\u00a0[AP]M)?(?:[–-]\d{1,2}:\d\d(?:\u00a0[AP]M)?)?/g;

/**
 * A line of words cut at its times ("Stopped 11:49 AM", "Sets in 5h 14m · 5:08 PM", "Until Sun 07:00"), so a skin can
 * draw each time as one piece that a clip keeps whole, with its period, or drops whole, never `1:44…` (spec/cards.md
 * → Clock words follow the dashboard's hour cycle). The parts joined are the line.
 */
export function lineParts(line: string): LinePart[] {
  const parts: LinePart[] = [];
  let at = 0;
  for (const match of line.matchAll(TIME)) {
    if (match.index > at) parts.push({ text: line.slice(at, match.index) });
    parts.push({ text: match[0], time: true });
    at = match.index + match[0].length;
  }
  if (at < line.length) parts.push({ text: line.slice(at) });
  return parts;
}
