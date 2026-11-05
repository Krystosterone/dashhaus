import { useEffect, useRef } from "react";
import "./dashboard.css";

export interface GlasshouseNavBarItem {
  key: string;
  label: string;
  kind: "section" | "page" | "navigate";
  current: boolean;
  leaves?: boolean;
  onSelect: () => void;
}

export interface GlasshouseNavBarProps { label?: string; items: GlasshouseNavBarItem[] }

/** A small glyph for a destination, picked from its words; anything else gets a plain pane. */
function NavGlyph({ label }: { label: string }) {
  const words = label.toLowerCase();
  const path = /home|overview|house/.test(words) ? "M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z"
    : /climate|room|air|temperature/.test(words) ? "M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0ZM12 9v7"
    : /device|light|switch|favou?rite/.test(words) ? "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"
    : /secur|lock|door|alarm/.test(words) ? "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6Z"
    : /energy|power|analytic/.test(words) ? "M13 3 5 14h6l-1 7 8-11h-6Z"
    : "M5 5h14v14H5z";
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={path} /></svg>;
}

/** The dashboard's destinations as glass pills in the header; the current one is lit. Scrolls sideways on a phone. */
export function GlasshouseNavBar({ label = "Dashboard", items }: GlasshouseNavBarProps) {
  const list = useRef<HTMLUListElement>(null);
  const current = items.find((item) => item.current)?.key;
  useEffect(() => {
    const active = list.current?.querySelector<HTMLElement>("[aria-current]");
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);
  return (
    <nav className="glasshouse-nav" aria-label={label}>
      <ul ref={list}>{items.map((item) => (
        <li key={item.key}>
          <button type="button" aria-current={item.current ? (item.kind === "section" ? "location" : "page") : undefined} onClick={item.onSelect}>
            <NavGlyph label={item.label} />
            <span>{item.label}</span>
            {item.leaves && <span className="glasshouse-nav-leave" aria-label="another dashboard">↗</span>}
          </button>
        </li>
      ))}</ul>
    </nav>
  );
}
