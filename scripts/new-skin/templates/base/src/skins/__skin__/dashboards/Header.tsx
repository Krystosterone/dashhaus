import type { ReactNode } from "react";
import { useNow } from "../../../hooks/useNow";
import { clockFace } from "../../../domains/clock";
import "./dashboard.css";

export interface __Skin__HeaderProps {
  title: string;
  subtitle?: ReactNode;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  locale?: string;
  timeZone?: string;
  now?: Date;
}

/** Dashboard furniture: title, date or subtitle, and an optional stable-width minute clock. */
export function __Skin__Header({ title, subtitle, showTime, hourCycle, locale, timeZone, now: fixed }: __Skin__HeaderProps) {
  const now = useNow(fixed);
  const face = clockFace(now, { locale, hourCycle, timeZone });
  return (
    <header className="__skin__-header">
      <div><h1>{title}</h1><p className="__skin__-header-sub">{subtitle ?? <time dateTime={face.day}>{face.date}</time>}</p></div>
      {showTime && <p className="__skin__-header-time"><time dateTime={now.toISOString()}>{face.time}</time>{face.period && <small>{face.period}</small>}</p>}
    </header>
  );
}
