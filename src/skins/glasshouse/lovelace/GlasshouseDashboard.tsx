import { useMemo, useRef } from "react";
import { MAIN_PAGE, resolveNav, sectionAnchors, useRowLayout } from "@dashhaus/core/lovelace";
import type { NavEntry, PanelInfo } from "@dashhaus/core/lovelace";
import { useDashboardNav } from "@dashhaus/core/lovelace";
import { renderGlasshouseCard } from "./registry";
import { GlasshouseActionStatus } from "./GlasshouseActionStatus";
import { GlasshousePage, GlasshouseSection } from "../dashboards/layout";
import { GlasshouseNavBar } from "../dashboards/NavBar";
import type { GlasshouseFootprint } from "../shared/ui";
import { rowItems } from "@dashhaus/core/lovelace/schema";
import type { TrackPolicy } from "@dashhaus/core/lovelace/layout";
import type { PageConfig, RowLayoutConfig } from "./config";

const anchorsOf = (rows: readonly RowLayoutConfig[]) => {
  const titled = rows.filter((row): row is RowLayoutConfig & { title: string } => !!row.title);
  const anchors = sectionAnchors(titled.map((row) => row.title));
  return { anchors, ids: new Map<RowLayoutConfig, string>(titled.map((row, index) => [row, anchors[index].id])) };
};

/** Tracks at least a Card's 260 px wide, at most four; `columns` is a most, never a forced count. */
const TRACKS: Record<GlasshouseFootprint, TrackPolicy> = {
  standard: { gap: 14, min: 260, preferred: 260, max: 4 },
  compact: { gap: 10, min: 260, preferred: 260, max: 4 },
};

/** One row: its heading, then its Cards where the shared layout placed them on the row's own tracks. */
function Row({ row, id, footprint }: { row: RowLayoutConfig; id?: string; footprint: GlasshouseFootprint }) {
  const own = row.cards[0]?.item.footprint ?? footprint;
  const layout = useRowLayout(row, TRACKS[own]);
  return (
    <GlasshouseSection id={id} title={row.title} note={row.note} footprint={own} grid={layout}>
      {row.cards.map((entry, index) => (
        <div key={`${index}:${entry.item.entity}`} className="glasshouse-card-cell" style={layout.cells[index]?.style}>{renderGlasshouseCard(entry.item, footprint)}</div>
      ))}
    </GlasshouseSection>
  );
}

export interface GlasshouseDashboardProps {
  title?: string;
  subtitle?: string;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  rows: RowLayoutConfig[];
  pages?: PageConfig[];
  nav?: NavEntry[] | false;
  footprint: GlasshouseFootprint;
  panels?: Record<string, PanelInfo>;
  now?: Date;
  navigate?: (path: string) => void;
}

/**
 * The generated skin's whole Dashboard, from normalized Lovelace config and the skin-local Card registry. A rejected
 * command shows once for the page, docked over its foot; the nav sits in the header.
 */
export function GlasshouseDashboard({ title, subtitle, showTime, hourCycle, rows, pages = [], nav: navConfig, footprint, panels, now, navigate }: GlasshouseDashboardProps) {
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
    <GlasshousePage pageRef={root} title={page?.title ?? title ?? "Home"} subtitle={page ? undefined : subtitle} showTime={showTime} hourCycle={hourCycle} now={now} nav={showNav ? <GlasshouseNavBar items={nav.buttons} /> : undefined} dock={<GlasshouseActionStatus />}>
      {shown.map((row, index) => <Row key={`${page?.id ?? MAIN_PAGE}:${index}`} row={row} id={ids.get(row)} footprint={footprint} />)}
      {rowItems(shown).length === 0 && <p className="glasshouse-dashboard-empty">No entities this skin can draw yet. Add a card for their domain with the card generator.</p>}
    </GlasshousePage>
  );
}
