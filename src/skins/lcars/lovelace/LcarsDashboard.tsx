import { useMemo, useRef } from "react";
import { MAIN_PAGE, resolveNav, sectionAnchors } from "@dashhaus/dashboard";
import type { NavEntry, PanelInfo } from "@dashhaus/dashboard";
import { useDashboardNav } from "@dashhaus/dashboard";
import { renderLcarsCard } from "./registry";
import { LcarsActionStatus } from "./LcarsActionStatus";
import { LcarsCell, LcarsColumns, LcarsPage, LcarsSection } from "../dashboards/layout";
import { LcarsNavBar } from "../dashboards/NavBar";
import type { LcarsFootprint } from "../shared/ui";
import { cardsOf, sectionsOf } from "./config";
import type { BlockConfig, PageConfig, SectionConfig } from "./config";

const anchorsOf = (blocks: readonly BlockConfig[]) => {
  const titled = sectionsOf(blocks).filter((section): section is SectionConfig & { title: string } => !!section.title);
  const anchors = sectionAnchors(titled.map((section) => section.title));
  return { anchors, ids: new Map<SectionConfig, string>(titled.map((section, index) => [section, anchors[index].id])) };
};

export interface LcarsDashboardProps {
  title?: string;
  subtitle?: string;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  blocks: BlockConfig[];
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
export function LcarsDashboard({ title, subtitle, showTime, hourCycle, blocks, pages = [], nav: navConfig, footprint, panels, now, navigate }: LcarsDashboardProps) {
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
    <LcarsSection key={key} id={ids.get(item)} title={item.title} note={item.note} columns={item.columns} footprint={footprint}>
      {item.cards.map((card, index) => {
        const live = renderLcarsCard(card, footprint);
        return card.span && card.span > 1 ? <LcarsCell key={`${index}:${card.entity}`} span={card.span}>{live}</LcarsCell> : <span key={`${index}:${card.entity}`} className="lcars-card-cell">{live}</span>;
      })}
    </LcarsSection>
  );
  return (
    <LcarsPage pageRef={root} title={page?.title ?? title} subtitle={page ? undefined : subtitle} showTime={showTime} hourCycle={hourCycle} now={now} nav={showNav ? <LcarsNavBar items={nav.buttons} /> : undefined}>
      {shown.map((block, index) => block.kind === "columns" ? <LcarsColumns key={index} columns={block.columns}>{block.sections.map(section)}</LcarsColumns> : section(block, index))}
      {cardsOf(shown).length === 0 && <p className="lcars-dashboard-empty">No entities this skin can draw yet. Add a card for their domain with the card generator.</p>}
      <LcarsActionStatus />
    </LcarsPage>
  );
}
