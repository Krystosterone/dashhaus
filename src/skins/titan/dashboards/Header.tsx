import type { ReactNode } from "react";
import { useHourCycle, useNow } from "@dashhaus/core/hooks";
import { clockFace } from "@dashhaus/core/entities/clock";
import "./dashboard.css";

export interface TitanHeaderProps {
  title: string;
  subtitle?: ReactNode;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  locale?: string;
  timeZone?: string;
  now?: Date;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** The day as the reference's build stamp: "2026.NOV.05". */
export const dateCode = (day: string) => {
  const [y, m, d] = day.split("-");
  return `${y}.${MONTHS[Number(m) - 1] ?? m}.${d}`;
};

/**
 * The page's headline, under the top bar: the title in salmon capitals set right, as the reference's
 * "EPS POWER DISTRIBUTION STATUS", the date under it, and the time (when asked for) at the left in big numerals.
 */
export function TitanHeader({ title, subtitle, showTime, hourCycle, locale, timeZone, now: fixed }: TitanHeaderProps) {
  const now = useNow(fixed);
  const cycle = useHourCycle({ hourCycle, locale });
  const face = clockFace(now, { locale, hourCycle: cycle, timeZone });
  return (
    <header className="titan-header">
      {showTime && <p className="titan-header-time"><time dateTime={now.toISOString()}>{face.time}</time>{face.period && <small>{face.period}</small>}</p>}
      <div className="titan-header-words">
        <h1>{title}</h1>
        <p className="titan-header-sub">{subtitle ?? <time dateTime={face.day}>{face.date}</time>}</p>
      </div>
    </header>
  );
}
