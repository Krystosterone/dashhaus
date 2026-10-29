import { useEffect, useRef } from "react";
// Its keys are the module's key part (.fd-key), so the bar brings the part's styles when it is drawn without a module.
import "../shared/module.css";
import "./NavBar.css";

export interface NavBarItem {
  key: string;
  label: string;
  /** A section is a place on this page; a page or a navigate item is a page. */
  kind: "section" | "page" | "navigate";
  /** Where you are: the area being read, or the page on screen. */
  current: boolean;
  /** It leaves this dashboard. */
  leaves?: boolean;
  onSelect: () => void;
}

const IconLeave = () => <svg className="fd-nav-x" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5h5.5V8M9.5 2.5 2.5 9.5" /></svg>;

/**
 * The page's bottom nav: a plate of keys, one per destination, its word printed on it. Where you are is the key that
 * stays down, as a group's chosen key does; a key that leaves the dashboard carries a small arrow. More keys than fit
 * scroll sideways under the plate's edge, the current one kept in view. Put it in `FieldPage`'s `nav`.
 */
export function NavBar({ label = "Dashboard", items }: { label?: string; items: NavBarItem[] }) {
  const list = useRef<HTMLUListElement>(null);
  const current = items.find((i) => i.current)?.key;

  // Scroll the bar itself, never the page: a page mid-jump keeps its own smooth scroll.
  useEffect(() => {
    const ul = list.current;
    const key = ul?.querySelector<HTMLElement>("[aria-current]");
    if (!ul || !key) return;
    const left = key.offsetLeft - ul.offsetLeft;
    // A sliver of the key before it stays in view, so the row says there is more on that side too.
    if (left < ul.scrollLeft || left + key.offsetWidth > ul.scrollLeft + ul.clientWidth) ul.scrollTo({ left: left - 32 });
  }, [current]);

  return (
    <nav className="fd-nav" aria-label={label}>
      <ul className="fd-nav-keys" ref={list}>
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className="fd-key fd-nav-key"
              title={item.label}
              aria-current={item.current ? (item.kind === "section" ? "location" : "page") : undefined}
              onClick={item.onSelect}
            >
              <span className="fd-nav-t">{item.label}</span>
              {item.leaves && <><IconLeave /><span className="fd-sr">, another dashboard</span></>}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
