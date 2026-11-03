import { useMemo, useRef } from "react";
import { MAIN_PAGE, resolveNav, sectionAnchors, useRowLayout } from "@dashhaus/dashboard";
import type { NavEntry, PanelInfo } from "@dashhaus/dashboard";
import { useDashboardNav } from "@dashhaus/dashboard";
import { render__Skin__Card } from "./registry";
import { __Skin__ActionStatus } from "./__Skin__ActionStatus";
import { __Skin__Page, __Skin__Section } from "../dashboards/layout";
import { __Skin__NavBar } from "../dashboards/NavBar";
import type { __Skin__Footprint } from "../shared/ui";
import { rowItems } from "@dashhaus/dashboard/schema";
import type { TrackPolicy } from "@dashhaus/dashboard/layout";
import type { PageConfig, RowLayoutConfig } from "./config";

const anchorsOf = (rows: readonly RowLayoutConfig[]) => {
  const titled = rows.filter((row): row is RowLayoutConfig & { title: string } => !!row.title);
  const anchors = sectionAnchors(titled.map((row) => row.title));
  return { anchors, ids: new Map<RowLayoutConfig, string>(titled.map((row, index) => [row, anchors[index].id])) };
};

/** Tracks at least a Card's 240 px wide, at most four; `columns` is a most, never a forced count. */
const TRACKS: Record<__Skin__Footprint, TrackPolicy> = {
  standard: { gap: 12, min: 240, preferred: 240, max: 4 },
  compact: { gap: 8, min: 240, preferred: 240, max: 4 },
};

/** One row: its heading, then its Cards where the shared layout placed them on the row's own tracks. */
function Row({ row, id, footprint }: { row: RowLayoutConfig; id?: string; footprint: __Skin__Footprint }) {
  const own = row.cards[0]?.item.footprint ?? footprint;
  const layout = useRowLayout(row, TRACKS[own]);
  return (
    <__Skin__Section id={id} title={row.title} note={row.note} footprint={own} grid={layout}>
      {row.cards.map((entry, index) => (
        <div key={`${index}:${entry.item.entity}`} className="__skin__-card-cell" style={layout.cells[index]?.style}>{render__Skin__Card(entry.item, footprint)}</div>
      ))}
    </__Skin__Section>
  );
}

export interface __Skin__DashboardProps {
  title?: string;
  subtitle?: string;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  rows: RowLayoutConfig[];
  pages?: PageConfig[];
  nav?: NavEntry[] | false;
  footprint: __Skin__Footprint;
  panels?: Record<string, PanelInfo>;
  now?: Date;
  navigate?: (path: string) => void;
}

/**
 * The generated skin's whole Dashboard, from normalized Lovelace config and the skin-local Card registry. A rejected
 * command shows once for the page: above the NavBar, or as the last block when there is no nav.
 */
export function __Skin__Dashboard({ title, subtitle, showTime, hourCycle, rows, pages = [], nav: navConfig, footprint, panels, now, navigate }: __Skin__DashboardProps) {
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
    <__Skin__Page pageRef={root} title={page?.title ?? title} subtitle={page ? undefined : subtitle} showTime={showTime} hourCycle={hourCycle} now={now} nav={showNav ? <><__Skin__ActionStatus /><__Skin__NavBar items={nav.buttons} /></> : undefined}>
      {shown.map((row, index) => <Row key={`${page?.id ?? MAIN_PAGE}:${index}`} row={row} id={ids.get(row)} footprint={footprint} />)}
      {rowItems(shown).length === 0 && <p className="__skin__-dashboard-empty">No entities this skin can draw yet. Add a card for their domain with the card generator.</p>}
      {!showNav && <__Skin__ActionStatus />}
    </__Skin__Page>
  );
}
