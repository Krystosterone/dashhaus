import { useCallback, useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import { useHashPage } from "../../hooks/useHashPage";
import { useScrollSpy } from "../../hooks/useScrollSpy";
import { MAIN_PAGE, navigateInHa, sectionId } from "./nav";
import type { NavTarget } from "./nav";
import type { NavItem } from "./nav";

/** A nav item as a skin draws it: whether it's where you are, and what a tap does. */
export interface NavButton {
  key: string;
  label: string;
  kind: NavItem["target"]["kind"];
  leaves: boolean;
  current: boolean;
  onSelect: () => void;
}

/**
 * The behaviour behind a dashboard's bottom nav, for any skin: the page on screen (in the URL hash), the section
 * being read, and what each item's tap does. A section item on another page returns to the main page first, then
 * scrolls there; a page item opens that page at its top; a navigate item leaves through Home Assistant's router.
 * On the main page a section being read is the current item, ahead of the main page's own item.
 */
export function useDashboardNav<T extends HTMLElement>({ items, pages, rootRef, navigate = navigateInHa }: {
  items: NavItem[];
  /** The card's page ids, besides the main page. */
  pages: readonly string[];
  rootRef: RefObject<T>;
  /** How a navigate item leaves: Home Assistant's router; a story passes its own. */
  navigate?: (path: string) => void;
}) {
  const ids = useMemo(() => [MAIN_PAGE, ...pages], [pages]);
  const [page, goPage] = useHashPage(ids, MAIN_PAGE);
  const [reading, jump] = useScrollSpy(rootRef, page);
  const [pending, setPending] = useState<string | null>(null);

  // A section picked from another page: scroll once the main page has drawn.
  useEffect(() => {
    if (pending && page === MAIN_PAGE) {
      jump(pending);
      setPending(null);
    }
  }, [pending, page, jump]);

  const openPage = useCallback((id: string) => {
    goPage(id);
    rootRef.current?.scrollIntoView({ block: "start" });
  }, [goPage, rootRef]);

  const buttons = useMemo((): NavButton[] => {
    const idOf = (t: Extract<NavTarget, { kind: "section" }>) => t.id ?? sectionId(t.title);
    const sectionIsCurrent = (t: Extract<NavTarget, { kind: "section" }>) => page === MAIN_PAGE && reading === idOf(t);
    const readingAny = items.some((i) => i.target.kind === "section" && sectionIsCurrent(i.target));
    return items.map((item) => {
      const t = item.target;
      const current = t.kind === "section" ? sectionIsCurrent(t)
        : t.kind === "page" ? page === t.id && !(t.id === MAIN_PAGE && readingAny)
        : location.pathname === t.path || location.pathname.startsWith(`${t.path}/`);
      const onSelect = t.kind === "page" ? () => openPage(t.id)
        : t.kind === "navigate" ? () => navigate(t.path)
        : () => {
          if (page === MAIN_PAGE) return jump(idOf(t));
          setPending(idOf(t));
          goPage(MAIN_PAGE);
        };
      return { key: item.key, label: item.label, kind: t.kind, leaves: item.leaves, current, onSelect };
    });
  }, [items, page, reading, jump, goPage, openPage, navigate]);

  return { page, buttons };
}
