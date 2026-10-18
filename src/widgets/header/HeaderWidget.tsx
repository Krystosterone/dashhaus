import type { ReactNode } from "react";
import { useNow } from "../../shared/useNow";
import "./HeaderWidget.css";

export interface HeaderWidgetProps {
  /** The dashboard's name: "Home", "Living room". */
  title: string;
  /** Replaces the date under the title, e.g. "Comfortable · 21.4°". */
  subtitle?: ReactNode;
  /** Show the clock on the right. */
  showTime?: boolean;
  /** 12 or 24 hour clock. Defaults to the locale's. */
  hourCycle?: "h12" | "h23";
  /** BCP 47 locale for the date and time. Defaults to the browser's. */
  locale?: string;
  /** IANA time zone, e.g. Home Assistant's "America/Toronto". Defaults to the device's. */
  timeZone?: string;
  /** Freeze the time (stories, screenshots). Live otherwise. */
  now?: Date;
}

/**
 * The top of a dashboard: its name, today's date under it, and an optional clock on the right.
 * Not a card: it sits on the page surface and frames the cards below. Sizes itself from its own
 * width (phone to wall panel). The clock ticks on the minute with no animation, in tabular figures,
 * so nothing shifts as the time changes.
 */
export function HeaderWidget({ title, subtitle, showTime, hourCycle, locale, timeZone, now: fixed }: HeaderWidgetProps) {
  const now = useNow(fixed);
  const date = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", timeZone }).format(now);
  // 24-hour clocks pad the hour ("09:05"); 12-hour clocks don't ("9:05 a.m.").
  const cycle = new Intl.DateTimeFormat(locale, { hour: "numeric", hourCycle, timeZone }).resolvedOptions().hourCycle;
  const twentyFour = cycle === "h23" || cycle === "h24";
  const parts = new Intl.DateTimeFormat(locale, { hour: twentyFour ? "2-digit" : "numeric", minute: "2-digit", hourCycle, timeZone }).formatToParts(now);
  // The time large; AM/PM small beside it.
  const main = parts.filter((p) => p.type !== "dayPeriod").map((p) => p.value).join("").trim();
  const period = parts.find((p) => p.type === "dayPeriod")?.value;
  // Machine-readable date in the same time zone as what is shown (toISOString would use UTC).
  const day = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(now);

  return (
    <div className="hh-c">
      <header className="hh">
        <div className="hh-t">
          <h1 className="hh-title" title={title}>{title}</h1>
          <p className="hh-sub">{subtitle ?? <time dateTime={day}>{date}</time>}</p>
        </div>
        {showTime && (
          <p className="hh-time">
            <time dateTime={now.toISOString()}>{main}</time>
            {period && <small>{period}</small>}
          </p>
        )}
      </header>
    </div>
  );
}
