import { useCallback, useEffect, useState } from "react";

const PARAM = /(?:^#|&)page=([^&]*)/;

/** The page a URL hash names (`#page=living`), if it is one of `pages`; otherwise `main`. */
export function pageFromHash(hash: string, pages: readonly string[], main: string): string {
  const named = hash.match(PARAM)?.[1];
  let id = main;
  try {
    if (named) id = decodeURIComponent(named);
  } catch {
    // A malformed link (`#page=100%`) opens the main page rather than taking the dashboard down.
  }
  return pages.includes(id) ? id : main;
}

/**
 * The page a dashboard shows, kept in the URL hash (`#page=living`; the main page has none), so the phone's back
 * button returns to the previous page and a link can open one. Going to a page pushes a history entry and keeps
 * the path and whatever state the host router keeps there; back and forward are read from the hash again.
 */
export function useHashPage(pages: readonly string[], main: string) {
  const known = pages.join("\n");
  const [page, setPage] = useState(() => pageFromHash(location.hash, pages, main));

  useEffect(() => {
    const ids = known.split("\n");
    const sync = () => setPage(pageFromHash(location.hash, ids, main));
    sync();
    addEventListener("popstate", sync);
    addEventListener("hashchange", sync);
    return () => {
      removeEventListener("popstate", sync);
      removeEventListener("hashchange", sync);
    };
  }, [known, main]);

  const go = useCallback((id: string) => {
    if (id === page) return;
    const hash = id === main ? "" : `#page=${encodeURIComponent(id)}`;
    history.pushState(history.state, "", `${location.pathname}${location.search}${hash}`);
    setPage(id);
  }, [page, main]);

  return [page, go] as const;
}
