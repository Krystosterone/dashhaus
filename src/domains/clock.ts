/** How a dashboard's header reads the time: its locale, 12 or 24 hours, and its time zone. */
export interface ClockOptions {
  /** BCP 47 locale for the date and time. Defaults to the browser's. */
  locale?: string;
  /** 12 or 24 hour clock. Defaults to the locale's. */
  hourCycle?: "h12" | "h23";
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
