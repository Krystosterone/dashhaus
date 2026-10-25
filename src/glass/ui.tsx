import { useId } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useNow } from "../hooks/useNow";
import { greeting } from "./greeting";
import { IconPower, IconWarn } from "./icons";
import "./tokens.css";
import "./glass.css";

/** A card's footprint on the bento grid; its height comes from this alone, never its state. */
export type GlassSize = "s" | "m" | "l" | "xl";
export type GlassState = "on" | "off" | "unavailable";

const STATE_WORD: Record<GlassState, string> = { on: "On", off: "Off", unavailable: "Unavailable" };

/** The glass page: tokens, the gradient, and the grid's container. `bar` docks at the bottom: the room bar, and a notice above it. */
export function GlassPage({ bar, children }: { bar?: ReactNode; children: ReactNode }) {
  return (
    <div className="gl-page">
      <div className="gl-main">{children}</div>
      {bar && <div className="gl-dock">{bar}</div>}
    </div>
  );
}

/** The greeting for the time of day, and the page title under it. `now` freezes the clock for stories. */
export function GlassHeader({ title, name, now: fixed }: { title: string; name?: string; now?: Date }) {
  const now = useNow(fixed);
  return (
    <header className="gl-header">
      <p className="gl-greeting">{greeting(now, name)}</p>
      <h1 className="gl-title">{title}</h1>
    </header>
  );
}

export function GlassGrid({ label, children }: { label: string; children: ReactNode }) {
  return <section className="gl-grid" aria-label={label}>{children}</section>;
}

/** On is filled, off a ring, unavailable a dashed ring: the shape carries the state, the accent reinforces it. */
export function StatusDot({ state }: { state: GlassState }) {
  return <span className="gl-dot" data-state={state} role="img" aria-label={STATE_WORD[state]} />;
}

/** A card's switch. Pressed when on; unavailable disables it and draws it dashed. */
export function PowerButton({ label, on, unavailable, onToggle }: { label: string; on: boolean; unavailable?: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="gl-btn gl-power" aria-label={`${label} power`} aria-pressed={unavailable ? undefined : on} disabled={unavailable} onClick={onToggle}>
      <IconPower />
    </button>
  );
}

export interface GlassCardProps {
  size: GlassSize;
  name: string;
  /** The area, or the one state line. */
  subtitle?: string;
  /** The domain icon: every card names itself with icon, name and one line (docs/glass.md). */
  icon: ReactNode;
  /** Shown as a dot on the icon. Omit for a card with no on and off, like the weather. */
  state?: GlassState;
  /** The header's control, usually a PowerButton. */
  action?: ReactNode;
  children?: ReactNode;
}

/** One entity on the glass grid: icon, name and subtitle, an optional control, then the card's own body. */
export function GlassCard({ size, name, subtitle, icon, state, action, children }: GlassCardProps) {
  const nameId = useId();
  return (
    <article className="gl-card gl-panel" data-size={size} data-state={state} aria-labelledby={nameId}>
      <header className="gl-head">
        <span className="gl-mark">{icon}{state && <StatusDot state={state} />}</span>
        <div className="gl-text">
          <h2 id={nameId} className="gl-name" title={name}>{name}</h2>
          {subtitle && <p className="gl-sub" title={subtitle}>{subtitle}</p>}
        </div>
        {action && <div className="gl-action">{action}</div>}
      </header>
      {children && <div className="gl-slot">{children}</div>}
    </article>
  );
}

export interface Room { id: string; name: string }

/** The rooms as a filter: the first is usually Home, the cards that matter now. Fixed at the bottom of the page. */
export function RoomBar({ rooms, current, onPick }: { rooms: Room[]; current: string; onPick: (id: string) => void }) {
  return (
    <nav className="gl-rooms gl-panel" aria-label="Rooms">
      <ul className="gl-rooms-list">
        {rooms.map((room) => (
          <li key={room.id}>
            <button type="button" className="gl-btn gl-room" aria-pressed={room.id === current} onClick={() => onPick(room.id)}>{room.name}</button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * A problem the page has to tell, such as a command Home Assistant rejected: fixed above the room bar, the
 * warn colour on the words and the icon, never on the panel. `children` are its buttons.
 */
export function GlassNotice({ label, title, detail, children }: { label: string; title: string; detail: string; children?: ReactNode }) {
  return (
    <div className="gl-notice gl-panel" role="alert" aria-label={label}>
      <span className="gl-notice-icon"><IconWarn /></span>
      <span className="gl-notice-copy"><strong>{title}</strong><span>{detail}</span></span>
      {children && <span className="gl-notice-actions">{children}</span>}
    </div>
  );
}

/** A labelled pill button, for a notice's actions. */
export function GlassButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={className ? `gl-btn gl-pill ${className}` : "gl-btn gl-pill"} />;
}
