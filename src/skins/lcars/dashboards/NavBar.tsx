import { useEffect, useRef } from "react";
import "./dashboard.css";

export interface LcarsNavBarItem {
  key: string;
  label: string;
  kind: "section" | "page" | "navigate";
  current: boolean;
  leaves?: boolean;
  onSelect: () => void;
}

export interface LcarsNavBarProps { label?: string; items: LcarsNavBarItem[] }

/** The Dashboard's horizontally scrolling destination bar. */
export function LcarsNavBar({ label = "Dashboard", items }: LcarsNavBarProps) {
  const list = useRef<HTMLUListElement>(null);
  const current = items.find((item) => item.current)?.key;
  useEffect(() => {
    const active = list.current?.querySelector<HTMLElement>("[aria-current]");
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);
  return (
    <nav className="lcars-nav" aria-label={label}>
      <ul ref={list}>{items.map((item) => <li key={item.key}><button type="button" aria-current={item.current ? (item.kind === "section" ? "location" : "page") : undefined} onClick={item.onSelect}>{item.label}{item.leaves && <span className="lcars-nav-leave" aria-label="another dashboard">↗</span>}</button></li>)}</ul>
    </nav>
  );
}
