import type { ReactNode } from "react";
import { useHourCycle, useNow } from "@dashhaus/core/hooks";
import { clockFace } from "@dashhaus/core/entities/clock";
import "./dashboard.css";

export interface FuturaHeaderProps {
  title: string;
  subtitle?: ReactNode;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  locale?: string;
  timeZone?: string;
  now?: Date;
}

/** Dashboard furniture: the title, the date or subtitle under it in mono capitals, and the clock as the page's lit figure. */
export function FuturaHeader({ title, subtitle, showTime, hourCycle, locale, timeZone, now: fixed }: FuturaHeaderProps) {
  const now = useNow(fixed);
  const cycle = useHourCycle({ hourCycle, locale });
  const face = clockFace(now, { locale, hourCycle: cycle, timeZone });
  return (
    <header className="futura-header">
      <div><h1>{title}</h1><p className="futura-header-sub">{subtitle ?? <time dateTime={face.day}>{face.date}</time>}</p></div>
      {showTime && <p className="futura-header-time"><time dateTime={now.toISOString()}>{face.time}</time>{face.period && <small>{face.period}</small>}</p>}
    </header>
  );
}
