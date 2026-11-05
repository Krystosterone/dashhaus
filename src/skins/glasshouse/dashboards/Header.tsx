import type { ReactNode } from "react";
import { useNow } from "@dashhaus/core/hooks";
import { clockFace } from "@dashhaus/core/entities/clock";
import "./dashboard.css";

export interface GlasshouseHeaderProps {
  title: string;
  subtitle?: ReactNode;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  locale?: string;
  timeZone?: string;
  now?: Date;
  /** The nav bar, drawn in the header's top bar beside the wordmark. */
  nav?: ReactNode;
}

/** The time of day in words, for the greeting: the house's own clock, not Home Assistant data. */
export const greetingFor = (hour: number) => hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

/** The glass mark beside the wordmark: two panes, one lit. */
function Mark() {
  return (
    <svg className="glasshouse-mark" viewBox="0 0 28 28" aria-hidden="true">
      <path className="glasshouse-mark-frame" d="M4 13 14 5l10 8v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <path className="glasshouse-mark-lit" d="M15 14h5v6h-5z" />
    </svg>
  );
}

/**
 * Dashboard furniture: a top bar with the dashboard's title as a wordmark and the nav bar in glass pills, then a
 * greeting for the time of day over the date (or the YAML's subtitle), and an optional stable-width minute clock.
 */
export function GlasshouseHeader({ title, subtitle, showTime, hourCycle, locale, timeZone, now: fixed, nav }: GlasshouseHeaderProps) {
  const now = useNow(fixed);
  const face = clockFace(now, { locale, hourCycle, timeZone });
  return (
    <header className="glasshouse-header">
      <div className="glasshouse-topbar">
        <h1 className="glasshouse-brand"><Mark /><span>{title}</span></h1>
        {nav && <div className="glasshouse-topbar-nav">{nav}</div>}
      </div>
      <div className="glasshouse-greeting">
        <div>
          <p className="glasshouse-greeting-title">{greetingFor(now.getHours())}</p>
          <p className="glasshouse-header-sub">{subtitle ?? <>Welcome home · <time dateTime={face.day}>{face.date}</time></>}</p>
        </div>
        {showTime && <p className="glasshouse-header-time"><time dateTime={now.toISOString()}>{face.time}</time>{face.period && <small>{face.period}</small>}</p>}
      </div>
    </header>
  );
}
