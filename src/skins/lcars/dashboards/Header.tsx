import type { ReactNode } from "react";
import { useNow } from "@dashhaus/core/hooks";
import { clockFace } from "@dashhaus/core/entities/clock";
import "./dashboard.css";

export interface LcarsHeaderProps {
  title: string;
  subtitle?: ReactNode;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  locale?: string;
  timeZone?: string;
  now?: Date;
}

/** A playful stardate for the console's corner: thousands since 1946, the year's progress as the rest. Decoration. */
export function stardate(now: Date) {
  const start = Date.UTC(now.getUTCFullYear(), 0, 1);
  const length = Date.UTC(now.getUTCFullYear() + 1, 0, 1) - start;
  return ((now.getUTCFullYear() - 1946) * 1000 + ((now.getTime() - start) / length) * 1000).toFixed(1);
}

/**
 * The top elbow: a coloured cap on the left (the stardate on it) that turns into a segmented bar under the title,
 * with the date and an optional stable-width minute clock.
 */
export function LcarsHeader({ title, subtitle, showTime, hourCycle, locale, timeZone, now: fixed }: LcarsHeaderProps) {
  const now = useNow(fixed);
  const face = clockFace(now, { locale, hourCycle, timeZone });
  return (
    <header className="lcars-header">
      <div className="lcars-header-cap" aria-hidden="true"><span>Stardate</span><b>{stardate(now)}</b></div>
      <div className="lcars-header-copy">
        <div className="lcars-header-when">
          {showTime && <p className="lcars-header-time"><time dateTime={now.toISOString()}>{face.time}</time>{face.period && <small>{face.period}</small>}</p>}
          <p className="lcars-header-sub">{subtitle ?? <time dateTime={face.day}>{face.date}</time>}</p>
        </div>
        <h1>{title}</h1>
      </div>
      <div className="lcars-header-bar lcars-bar" aria-hidden="true"><i /><i /><i /><i /></div>
    </header>
  );
}
