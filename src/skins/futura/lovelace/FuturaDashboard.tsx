import { useMemo, useRef } from "react";
import { MAIN_PAGE, resolveNav, sectionAnchors } from "@dashhaus/dashboard";
import type { NavEntry, PanelInfo } from "@dashhaus/dashboard";
import { useDashboardNav } from "@dashhaus/dashboard";
import { renderFuturaCard } from "./registry";
import { FuturaActionStatus } from "./FuturaActionStatus";
import { FuturaCell, FuturaColumns, FuturaPage, FuturaSection } from "../dashboards/layout";
import { FuturaNavBar } from "../dashboards/NavBar";
import type { FuturaFootprint } from "../shared/ui";
import { cardsOf, sectionsOf } from "./config";
import type { BlockConfig, PageConfig, SectionConfig } from "./config";

const anchorsOf = (blocks: readonly BlockConfig[]) => {
  const titled = sectionsOf(blocks).filter((section): section is SectionConfig & { title: string } => !!section.title);
  const anchors = sectionAnchors(titled.map((section) => section.title));
  return { anchors, ids: new Map<SectionConfig, string>(titled.map((section, index) => [section, anchors[index].id])) };
};

export interface FuturaDashboardProps {
  title?: string;
  subtitle?: string;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  blocks: BlockConfig[];
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
export function FuturaDashboard({ title, subtitle, showTime, hourCycle, blocks, pages = [], nav: navConfig, footprint, panels, now, navigate }: FuturaDashboardProps) {
  const root = useRef<HTMLDivElement>(null);
  const pageIds = useMemo(() => pages.map((page) => page.id), [pages]);
  const main = useMemo(() => anchorsOf(blocks), [blocks]);
  const items = useMemo(() => navConfig === false ? [] : resolveNav({ entries: navConfig, mainTitle: title ?? "Home", pages, sections: main.anchors, panels }), [navConfig, title, pages, main, panels]);
  const nav = useDashboardNav({ items, pages: pageIds, rootRef: root, navigate });
  const page = nav.page === MAIN_PAGE ? undefined : pages.find((candidate) => candidate.id === nav.page);
  const shown = page?.blocks ?? blocks;
  const ids = page ? anchorsOf(page.blocks).ids : main.ids;
  const showNav = nav.buttons.length > 1;
  const section = (item: SectionConfig, key: number) => (
    <FuturaSection key={key} id={ids.get(item)} title={item.title} note={item.note} columns={item.columns} footprint={footprint}>
      {item.cards.map((card, index) => {
        const live = renderFuturaCard(card, footprint);
        return card.span && card.span > 1 ? <FuturaCell key={`${index}:${card.entity}`} span={card.span}>{live}</FuturaCell> : <span key={`${index}:${card.entity}`} className="futura-card-cell">{live}</span>;
      })}
    </FuturaSection>
  );
  return (
    <FuturaPage pageRef={root} title={page?.title ?? title} subtitle={page ? undefined : subtitle} showTime={showTime} hourCycle={hourCycle} now={now} nav={showNav ? <><FuturaActionStatus /><FuturaNavBar items={nav.buttons} /></> : undefined}>
      {shown.map((block, index) => block.kind === "columns" ? <FuturaColumns key={index} columns={block.columns}>{block.sections.map(section)}</FuturaColumns> : section(block, index))}
      {cardsOf(shown).length === 0 && <p className="futura-dashboard-empty">No supported entities yet. Add a domain with the normal Card generator, then add that entity to Home Assistant.</p>}
      {!showNav && <FuturaActionStatus />}
    </FuturaPage>
  );
}
