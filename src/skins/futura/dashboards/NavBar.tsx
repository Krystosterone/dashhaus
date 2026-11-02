import { useEffect, useRef } from "react";
import "./dashboard.css";

export interface FuturaNavBarItem {
  key: string;
  label: string;
  kind: "section" | "page" | "navigate";
  current: boolean;
  leaves?: boolean;
  onSelect: () => void;
}

export interface FuturaNavBarProps { label?: string; items: FuturaNavBarItem[] }

/** The Dashboard's horizontally scrolling destination bar. */
export function FuturaNavBar({ label = "Dashboard", items }: FuturaNavBarProps) {
  const list = useRef<HTMLUListElement>(null);
  const current = items.find((item) => item.current)?.key;
  useEffect(() => {
    const active = list.current?.querySelector<HTMLElement>("[aria-current]");
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);
  return (
    <nav className="futura-nav" aria-label={label}>
      <ul ref={list}>{items.map((item) => <li key={item.key}><button type="button" aria-current={item.current ? (item.kind === "section" ? "location" : "page") : undefined} onClick={item.onSelect}>{item.label}{item.leaves && <span className="futura-nav-leave" aria-label="another dashboard">↗</span>}</button></li>)}</ul>
    </nav>
  );
}
