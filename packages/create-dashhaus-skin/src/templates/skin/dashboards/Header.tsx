import type { ReactNode } from "react";
import { useHourCycle, useNow } from "@dashhaus/core/hooks";
import { clockFace } from "@dashhaus/core/entities/clock";
import type { HourCycle } from "@dashhaus/core/entities/clock";
import "./dashboard.css";

export interface __Skin__HeaderProps {
  title: string;
  subtitle?: ReactNode;
  showTime?: boolean;
  /** The page's hour cycle: every card under the page says its times on it. */
  hourCycle?: HourCycle;
  locale?: string;
  timeZone?: string;
  now?: Date;
}

/** Dashboard furniture: title, date or subtitle, and an optional stable-width minute clock on the page's hour cycle. */
export function __Skin__Header({ title, subtitle, showTime, hourCycle, locale, timeZone, now: fixed }: __Skin__HeaderProps) {
  const now = useNow(fixed);
  const cycle = useHourCycle({ hourCycle, locale });
  const face = clockFace(now, { locale, hourCycle: cycle, timeZone });
  return (
    <header className="__skin__-header">
      <div><h1>{title}</h1><p className="__skin__-header-sub">{subtitle ?? <time dateTime={face.day}>{face.date}</time>}</p></div>
      {showTime && <p className="__skin__-header-time"><time dateTime={now.toISOString()}>{face.time}</time>{face.period && <small>{face.period}</small>}</p>}
    </header>
  );
}
