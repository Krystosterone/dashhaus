import { useMemo, useRef } from "react";
import { MAIN_PAGE, resolveNav, sectionAnchors, useRowLayout } from "@dashhaus/dashboard";
import type { NavEntry, PanelInfo } from "@dashhaus/dashboard";
import { useDashboardNav } from "@dashhaus/dashboard";
import { renderTitanCard } from "./registry";
import { TitanActionStatus } from "./TitanActionStatus";
import { TitanPage, TitanSection } from "../dashboards/layout";
import { TitanNavBar } from "../dashboards/NavBar";
import type { TitanFootprint } from "../shared/ui";
import { rowItems } from "@dashhaus/dashboard/schema";
import type { TrackPolicy } from "@dashhaus/dashboard/layout";
import type { PageConfig, RowLayoutConfig } from "./config";

const anchorsOf = (rows: readonly RowLayoutConfig[]) => {
  const titled = rows.filter((row): row is RowLayoutConfig & { title: string } => !!row.title);
  const anchors = sectionAnchors(titled.map((row) => row.title));
  return { anchors, ids: new Map<RowLayoutConfig, string>(titled.map((row, index) => [row, anchors[index].id])) };
};

/** Tracks at least a Card's 250 px wide, at most four; `columns` is a most, never a forced count. */
const TRACKS: Record<TitanFootprint, TrackPolicy> = {
  standard: { gap: 20, min: 250, preferred: 270, max: 4 },
  compact: { gap: 10, min: 220, preferred: 240, max: 4 },
};

/** One row: its heading, then its Cards where the shared layout placed them on the row's own tracks. */
function Row({ row, id, footprint }: { row: RowLayoutConfig; id?: string; footprint: TitanFootprint }) {
  const own = row.cards[0]?.item.footprint ?? footprint;
  const layout = useRowLayout(row, TRACKS[own]);
  return (
    <TitanSection id={id} title={row.title} note={row.note} footprint={own} count={row.cards.length} grid={layout}>
      {row.cards.map((entry, index) => (
        <div key={`${index}:${entry.item.entity}`} className="titan-card-cell" style={layout.cells[index]?.style}>{renderTitanCard(entry.item, footprint)}</div>
      ))}
    </TitanSection>
  );
}

export interface TitanDashboardProps {
  title?: string;
  subtitle?: string;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  rows: RowLayoutConfig[];
  pages?: PageConfig[];
  nav?: NavEntry[] | false;
  footprint: TitanFootprint;
  panels?: Record<string, PanelInfo>;
  now?: Date;
  navigate?: (path: string) => void;
}

/**
 * The generated skin's whole Dashboard, from normalized Lovelace config and the skin-local Card registry. A rejected
 * command shows once for the page: above the NavBar, or as the last block when there is no nav.
 */
export function TitanDashboard({ title, subtitle, showTime, hourCycle, rows, pages = [], nav: navConfig, footprint, panels, now, navigate }: TitanDashboardProps) {
  const root = useRef<HTMLDivElement>(null);
  const pageIds = useMemo(() => pages.map((page) => page.id), [pages]);
  const main = useMemo(() => anchorsOf(rows), [rows]);
  const items = useMemo(() => navConfig === false ? [] : resolveNav({ entries: navConfig, mainTitle: title ?? "Home", pages, sections: main.anchors, panels }), [navConfig, title, pages, main, panels]);
  const nav = useDashboardNav({ items, pages: pageIds, rootRef: root, navigate });
  const page = nav.page === MAIN_PAGE ? undefined : pages.find((candidate) => candidate.id === nav.page);
  const shown = page?.rows ?? rows;
  const ids = page ? anchorsOf(page.rows).ids : main.ids;
  const showNav = nav.buttons.length > 1;
  const cards = rowItems(shown).length;
  const sections = shown.filter((row) => row.title).length;
  const footer = [page?.title ?? title ?? "Home", sections > 1 && `${sections} sections`, `${cards} ${cards === 1 ? "card" : "cards"}`].filter(Boolean).join(" · ");
  return (
    <TitanPage pageRef={root} title={page?.title ?? title} subtitle={page ? undefined : subtitle} showTime={showTime} hourCycle={hourCycle} now={now} footer={footer} nav={showNav ? <TitanNavBar items={nav.buttons} /> : undefined} status={<TitanActionStatus />}>
      {shown.map((row, index) => <Row key={`${page?.id ?? MAIN_PAGE}:${index}`} row={row} id={ids.get(row)} footprint={footprint} />)}
      {cards === 0 && <p className="titan-dashboard-empty">No entities this skin can draw yet. Add a card for their domain with the card generator.</p>}
    </TitanPage>
  );
}
