import type { ReactNode } from "react";
import { useNow } from "@dashhaus/core/hooks";
import { clockFace } from "@dashhaus/core/entities/clock";
import "./Header.css";

export interface HeaderProps {
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
export function Header({ title, subtitle, showTime, hourCycle, locale, timeZone, now: fixed }: HeaderProps) {
  const now = useNow(fixed);
  // The time large; AM/PM small beside it.
  const { date, day, time: main, period } = clockFace(now, { locale, hourCycle, timeZone });

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
