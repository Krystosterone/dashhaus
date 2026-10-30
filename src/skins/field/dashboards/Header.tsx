import type { ReactNode } from "react";
import { useNow } from "@dashhaus/core/hooks";
import { clockFace } from "@dashhaus/core/entities/clock";
import type { ClockOptions } from "@dashhaus/core/entities/clock";
import { Digits, Screen } from "../shared/ui";
import "./Header.css";

export interface HeaderProps extends ClockOptions {
  /** The dashboard's name: "Home", "Nursery". Without one, the date and the clock alone. */
  title?: string;
  /** Replaces the date under the title, e.g. "Night · quiet". */
  subtitle?: ReactNode;
  /** Show the clock on the right. */
  showTime?: boolean;
  /** Freeze the time (stories, screenshots). Live otherwise. */
  now?: Date;
}

/**
 * The top of a field page: its name printed large, today's date under it in small print, and an optional clock on a
 * strip of screen. Not a module: print on the page, the clock the one thing lit. The clock ticks on the minute with no
 * animation, its digits in fixed places (a 12-hour clock's first one an unlit segment before 10), so nothing shifts.
 */
export function Header({ title, subtitle, showTime, hourCycle, locale, timeZone, now: fixed }: HeaderProps) {
  const now = useNow(fixed);
  const { date, day, time, period } = clockFace(now, { locale, hourCycle, timeZone });
  return (
    <header className="fd-hh">
      <div className="fd-hh-t">
        {title && <h1 className="fd-hh-title" title={title}>{title}</h1>}
        <p className="fd-hh-sub">{subtitle ?? <time dateTime={day}>{date}</time>}</p>
      </div>
      {showTime && (
        <div className="fd-hh-clock">
          <Screen>
            <time dateTime={now.toISOString()}><Digits text={time} places={5} /></time>
            {period && <small>{period}</small>}
          </Screen>
        </div>
      )}
    </header>
  );
}
