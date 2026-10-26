import { useEffect, useRef } from "react";
import "./NavBar.css";

export interface NavBarItem {
  key: string;
  label: string;
  /** A section is a place on this page; a page or a navigate item is a page. */
  kind: "section" | "page" | "navigate";
  /** Where you are: the section being read, or the page on screen. */
  current: boolean;
  /** It leaves this dashboard. */
  leaves?: boolean;
  onSelect: () => void;
}

const IconLeave = () => (
  <svg className="dash-nav-x" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5h5.5V8M9.5 2.5 2.5 9.5" /></svg>
);

/**
 * The page's bottom nav: one raised pill per destination, the current one in the solid accent (the UI language's
 * "chosen"), and a small arrow on a pill that leaves the dashboard. More pills than fit scroll sideways inside the
 * bar, and the current one is kept in view. Put it in `DashboardPage`'s `nav`.
 */
export function NavBar({ label = "Dashboard", items }: { label?: string; items: NavBarItem[] }) {
  const list = useRef<HTMLUListElement>(null);
  const current = items.find((i) => i.current)?.key;

  // Scroll the bar itself, never the page: a page that is mid-jump keeps its own smooth scroll.
  useEffect(() => {
    const ul = list.current;
    const pill = ul?.querySelector<HTMLElement>("[aria-current]");
    if (!ul || !pill) return;
    const left = pill.offsetLeft - ul.offsetLeft;
    if (left < ul.scrollLeft || left + pill.offsetWidth > ul.scrollLeft + ul.clientWidth) ul.scrollTo({ left: left - 12 });
  }, [current]);

  return (
    <nav className="dash-nav" aria-label={label}>
      <ul className="dash-nav-list" ref={list}>
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className="dash-nav-i"
              aria-current={item.current ? (item.kind === "section" ? "location" : "page") : undefined}
              onClick={item.onSelect}
            >
              {item.label}
              {item.leaves && <><IconLeave /><span className="dash-nav-sr">, another dashboard</span></>}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
