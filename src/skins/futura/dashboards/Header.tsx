import type { ReactNode } from "react";
import { useNow } from "@dashhaus/core/hooks";
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

/** Dashboard furniture: the date or subtitle as a mono kicker, the title under it, and the clock as the page's lit figure. */
export function FuturaHeader({ title, subtitle, showTime, hourCycle, locale, timeZone, now: fixed }: FuturaHeaderProps) {
  const now = useNow(fixed);
  const face = clockFace(now, { locale, hourCycle, timeZone });
  return (
    <header className="futura-header">
      <div><p className="futura-header-sub">{subtitle ?? <time dateTime={face.day}>{face.date}</time>}</p><h1>{title}</h1></div>
      {showTime && <p className="futura-header-time"><time dateTime={now.toISOString()}>{face.time}</time>{face.period && <small>{face.period}</small>}</p>}
    </header>
  );
}
