import { useMemo, useRef } from "react";
import { MAIN_PAGE, resolveNav, sectionAnchors, useRowLayout } from "@dashhaus/dashboard";
import type { NavEntry, PanelInfo } from "@dashhaus/dashboard";
import { useDashboardNav } from "@dashhaus/dashboard";
import { renderFuturaCard } from "./registry";
import { FuturaActionStatus } from "./FuturaActionStatus";
import { FuturaPage, FuturaSection } from "../dashboards/layout";
import { FuturaNavBar } from "../dashboards/NavBar";
import type { FuturaFootprint } from "../shared/ui";
import { rowItems } from "@dashhaus/dashboard/schema";
import type { TrackPolicy } from "@dashhaus/dashboard/layout";
import type { PageConfig, RowLayoutConfig } from "./config";

const anchorsOf = (rows: readonly RowLayoutConfig[]) => {
  const titled = rows.filter((row): row is RowLayoutConfig & { title: string } => !!row.title);
  const anchors = sectionAnchors(titled.map((row) => row.title));
  return { anchors, ids: new Map<RowLayoutConfig, string>(titled.map((row, index) => [row, anchors[index].id])) };
};

/** dashboard.css's tracks: at least 260 px (a compact row's 230 px), at most four; `columns` is a most, never a count. */
const TRACKS: Record<FuturaFootprint, TrackPolicy> = {
  standard: { gap: 12, min: 260, preferred: 260, max: 4 },
  compact: { gap: 8, min: 230, preferred: 230, max: 4 },
};

/** One row: its heading, then its Cards where the shared layout placed them on the row's own tracks. */
function Row({ row, id, footprint }: { row: RowLayoutConfig; id?: string; footprint: FuturaFootprint }) {
  const own = row.cards[0]?.item.footprint ?? footprint;
  const layout = useRowLayout(row, TRACKS[own]);
  return (
    <FuturaSection id={id} title={row.title} note={row.note} footprint={own} grid={layout}>
      {row.cards.map((entry, index) => (
        <div key={`${index}:${entry.item.entity}`} className="futura-card-cell" style={layout.cells[index]?.style}>{renderFuturaCard(entry.item, footprint)}</div>
      ))}
    </FuturaSection>
  );
}

export interface FuturaDashboardProps {
  title?: string;
  subtitle?: string;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  rows: RowLayoutConfig[];
  pages?: PageConfig[];
  nav?: NavEntry[] | false;
  footprint: FuturaFootprint;
  panels?: Record<string, PanelInfo>;
  now?: Date;
  navigate?: (path: string) => void;
}

/**
 * Futura's whole Dashboard, from normalized Lovelace config and the skin-local Card registry. A rejected command shows
 * once for the page: above the NavBar, or as the last block when there is no nav.
 */
export function FuturaDashboard({ title, subtitle, showTime, hourCycle, rows, pages = [], nav: navConfig, footprint, panels, now, navigate }: FuturaDashboardProps) {
  const root = useRef<HTMLDivElement>(null);
  const pageIds = useMemo(() => pages.map((page) => page.id), [pages]);
  const main = useMemo(() => anchorsOf(rows), [rows]);
  const items = useMemo(() => navConfig === false ? [] : resolveNav({ entries: navConfig, mainTitle: title ?? "Home", pages, sections: main.anchors, panels }), [navConfig, title, pages, main, panels]);
  const nav = useDashboardNav({ items, pages: pageIds, rootRef: root, navigate });
  const page = nav.page === MAIN_PAGE ? undefined : pages.find((candidate) => candidate.id === nav.page);
  const shown = page?.rows ?? rows;
  const ids = page ? anchorsOf(page.rows).ids : main.ids;
  const showNav = nav.buttons.length > 1;
  return (
    <FuturaPage pageRef={root} title={page?.title ?? title} subtitle={page ? undefined : subtitle} showTime={showTime} hourCycle={hourCycle} now={now} nav={showNav ? <><FuturaActionStatus /><FuturaNavBar items={nav.buttons} /></> : undefined}>
      {shown.map((row, index) => <Row key={`${page?.id ?? MAIN_PAGE}:${index}`} row={row} id={ids.get(row)} footprint={footprint} />)}
      {rowItems(shown).length === 0 && <p className="futura-dashboard-empty">No supported entities yet. Add a domain with the normal Card generator, then add that entity to Home Assistant.</p>}
      {!showNav && <FuturaActionStatus />}
    </FuturaPage>
  );
}
