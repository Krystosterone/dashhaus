import { MAIN_PAGE } from "./schema";

/*
 * A dashboard's bottom nav, whatever a skin draws: each item is a destination on this page (a section), in this
 * card (a page) or elsewhere in Home Assistant (a dashboard or view), with a label that defaults to the
 * destination's own name. spec/deploy.md → Navigation.
 */

export { MAIN_PAGE };

export type NavTarget =
  /** A YAML entry names a section by title; resolved, it carries the section's id on the page. */
  | { kind: "section"; title: string; id?: string }
  | { kind: "page"; id: string }
  | { kind: "navigate"; path: string };

/** One configured destination, before its label is known. */
export type NavEntry = NavTarget & { label?: string };

export interface NavItem {
  key: string;
  label: string;
  target: NavTarget;
  /** It leaves this dashboard. */
  leaves: boolean;
}

/** The frontend's `hass.panels` entry for a dashboard, as far as its name goes. */
export interface PanelInfo { url_path?: string; title?: string | null }

/** A section's id on the page, from its title: "Living room" → "section-living-room". */
export const sectionId = (title: string) =>
  `section-${title.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "untitled"}`;

/** A page's sections, in order, each with an id of its own: a repeated title gets -2, -3, so no two sections share one. */
export function sectionAnchors(titles: readonly string[]): { title: string; id: string }[] {
  const seen = new Map<string, number>();
  return titles.map((title) => {
    const base = sectionId(title);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { title, id: n === 1 ? base : `${base}-${n}` };
  });
}

/**
 * The bar's items. With no `entries`, the bar lists the main page and each page when the card has pages, or else
 * the main page's sections. A section or page that doesn't exist (an automatic layout that changed, a typo the
 * YAML check couldn't see) is left out rather than drawn dead.
 */
export function resolveNav({ entries, mainTitle, pages, sections, panels }: {
  entries?: NavEntry[];
  mainTitle: string;
  pages: readonly { id: string; title: string }[];
  /** The main page's sections, from sectionAnchors. */
  sections: readonly { title: string; id: string }[];
  panels?: Record<string, PanelInfo>;
}): NavItem[] {
  const list: NavEntry[] = entries ?? (pages.length
    ? [{ kind: "page", id: MAIN_PAGE }, ...pages.map((p) => ({ kind: "page" as const, id: p.id }))]
    : sections.map(({ title, id }) => ({ kind: "section" as const, title, id })));
  return list.flatMap((entry, i): NavItem[] => {
    const key = `${i}:${entry.kind}`;
    if (entry.kind === "section") {
      // By id when the bar lists every section; by title, the first of that name, for a YAML entry.
      const anchor = sections.find((s) => (entry.id ? s.id === entry.id : s.title === entry.title));
      return anchor ? [{ key, label: entry.label ?? anchor.title, target: { kind: "section", title: anchor.title, id: anchor.id }, leaves: false }] : [];
    }
    if (entry.kind === "page") {
      const title = entry.id === MAIN_PAGE ? mainTitle : pages.find((p) => p.id === entry.id)?.title;
      return title == null ? [] : [{ key, label: entry.label ?? title, target: entry, leaves: false }];
    }
    const dashboard = entry.path.split("/")[1];
    const panel = dashboard ? panels?.[dashboard] : undefined;
    return [{ key, label: entry.label ?? panel?.title ?? entry.path, target: entry, leaves: true }];
  });
}

/** Go to a path inside the Home Assistant frontend, the way its own links do: no reload, the router follows. */
export function navigateInHa(path: string) {
  history.pushState(null, "", path);
  dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
}
