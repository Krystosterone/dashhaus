import { useMemo, useRef } from "react";
import { MAIN_PAGE, resolveNav, sectionAnchors, useRowLayout } from "@dashhaus/dashboard";
import type { NavEntry, PanelInfo } from "@dashhaus/dashboard";
import { useDashboardNav } from "@dashhaus/dashboard";
import { renderLcarsCard } from "./registry";
import { LcarsActionStatus } from "./LcarsActionStatus";
import { LcarsPage, LcarsSection } from "../dashboards/layout";
import { LcarsNavBar } from "../dashboards/NavBar";
import type { LcarsFootprint } from "../shared/ui";
import { rowItems } from "@dashhaus/dashboard/schema";
import type { TrackPolicy } from "@dashhaus/dashboard/layout";
import type { PageConfig, RowLayoutConfig } from "./config";

const anchorsOf = (rows: readonly RowLayoutConfig[]) => {
  const titled = rows.filter((row): row is RowLayoutConfig & { title: string } => !!row.title);
  const anchors = sectionAnchors(titled.map((row) => row.title));
  return { anchors, ids: new Map<RowLayoutConfig, string>(titled.map((row, index) => [row, anchors[index].id])) };
};

/** dashboard.css's tracks: at least 280 px, 10 px apart (a compact row's 8 px), at most four; `columns` is a most. */
const TRACKS: Record<LcarsFootprint, TrackPolicy> = {
  standard: { gap: 10, min: 280, preferred: 280, max: 4 },
  compact: { gap: 8, min: 280, preferred: 280, max: 4 },
};

/** One row: its heading, then its Cards where the shared layout placed them on the row's own tracks. */
function Row({ row, id, footprint }: { row: RowLayoutConfig; id?: string; footprint: LcarsFootprint }) {
  const own = row.cards[0]?.item.footprint ?? footprint;
  const layout = useRowLayout(row, TRACKS[own]);
  return (
    <LcarsSection id={id} title={row.title} note={row.note} footprint={own} grid={layout}>
      {row.cards.map((entry, index) => (
        <div key={`${index}:${entry.item.entity}`} className="lcars-card-cell" style={layout.cells[index]?.style}>{renderLcarsCard(entry.item, footprint)}</div>
      ))}
    </LcarsSection>
  );
}

export interface LcarsDashboardProps {
  title?: string;
  subtitle?: string;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  rows: RowLayoutConfig[];
  pages?: PageConfig[];
  nav?: NavEntry[] | false;
  footprint: LcarsFootprint;
  panels?: Record<string, PanelInfo>;
  now?: Date;
  navigate?: (path: string) => void;
}

/**
 * The generated skin's whole Dashboard, from normalized Lovelace config and the skin-local Card registry. A rejected
 * command shows once for the page, as the last block of the main area, sticky to the bottom of the view (clear of the
 * phone's docked NavBar): the NavBar lives in the console's rail on a wide screen, too narrow for it.
 */
export function LcarsDashboard({ title, subtitle, showTime, hourCycle, rows, pages = [], nav: navConfig, footprint, panels, now, navigate }: LcarsDashboardProps) {
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
    <LcarsPage pageRef={root} title={page?.title ?? title} subtitle={page ? undefined : subtitle} showTime={showTime} hourCycle={hourCycle} now={now} nav={showNav ? <LcarsNavBar items={nav.buttons} /> : undefined}>
      {shown.map((row, index) => <Row key={`${page?.id ?? MAIN_PAGE}:${index}`} row={row} id={ids.get(row)} footprint={footprint} />)}
      {rowItems(shown).length === 0 && <p className="lcars-dashboard-empty">No entities this skin can draw yet. Add a card for their domain with the card generator.</p>}
      <LcarsActionStatus />
    </LcarsPage>
  );
}
