import { useEffect, useRef } from "react";
import "./dashboard.css";

export interface __Skin__NavBarItem {
  key: string;
  label: string;
  kind: "section" | "page" | "navigate";
  current: boolean;
  leaves?: boolean;
  onSelect: () => void;
}

export interface __Skin__NavBarProps { label?: string; items: __Skin__NavBarItem[] }

/** The Dashboard's horizontally scrolling destination bar. */
export function __Skin__NavBar({ label = "Dashboard", items }: __Skin__NavBarProps) {
  const list = useRef<HTMLUListElement>(null);
  const current = items.find((item) => item.current)?.key;
  useEffect(() => {
    const active = list.current?.querySelector<HTMLElement>("[aria-current]");
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);
  return (
    <nav className="__skin__-nav" aria-label={label}>
      <ul ref={list}>{items.map((item) => <li key={item.key}><button type="button" aria-current={item.current ? (item.kind === "section" ? "location" : "page") : undefined} onClick={item.onSelect}>{item.label}{item.leaves && <span className="__skin__-nav-leave" aria-label="another dashboard">↗</span>}</button></li>)}</ul>
    </nav>
  );
}
