import { useEffect, useRef } from "react";
import "./dashboard.css";

export interface TitanNavBarItem {
  key: string;
  label: string;
  kind: "section" | "page" | "navigate";
  current: boolean;
  leaves?: boolean;
  onSelect: () => void;
}

export interface TitanNavBarProps { label?: string; items: TitanNavBarItem[] }

/**
 * The page's destinations as the reference's column of keys: stacked down the left rail on a wide screen, a
 * scrolling row of keys docked at the bottom on a phone. The current one is lit salmon; the rest step through the
 * console's greys so the column reads as blocks, not a list.
 */
export function TitanNavBar({ label = "Dashboard", items }: TitanNavBarProps) {
  const list = useRef<HTMLUListElement>(null);
  const current = items.find((item) => item.current)?.key;
  useEffect(() => {
    const active = list.current?.querySelector<HTMLElement>("[aria-current]");
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);
  return (
    <nav className="titan-nav" aria-label={label}>
      <ul ref={list}>{items.map((item, index) => (
        <li key={item.key}>
          <button type="button" data-step={index % 3} aria-current={item.current ? (item.kind === "section" ? "location" : "page") : undefined} onClick={item.onSelect}>
            <span className="titan-nav-words">{item.label}</span>{item.leaves && <span className="titan-nav-leave" aria-label="another dashboard">↗</span>}
          </button>
        </li>
      ))}</ul>
    </nav>
  );
}
