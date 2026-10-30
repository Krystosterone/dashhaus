import { useMemo, useRef } from "react";
import { MAIN_PAGE, resolveNav, sectionAnchors } from "@dashhaus/dashboard";
import type { NavEntry, PanelInfo } from "@dashhaus/dashboard";
import { useDashboardNav } from "@dashhaus/dashboard";
import { render__Skin__Card } from "./registry";
import { __Skin__Cell, __Skin__Columns, __Skin__Page, __Skin__Section } from "../dashboards/layout";
import { __Skin__NavBar } from "../dashboards/NavBar";
import type { __Skin__Footprint } from "../shared/ui";
import { cardsOf, sectionsOf } from "./config";
import type { BlockConfig, PageConfig, SectionConfig } from "./config";

const anchorsOf = (blocks: readonly BlockConfig[]) => {
  const titled = sectionsOf(blocks).filter((section): section is SectionConfig & { title: string } => !!section.title);
  const anchors = sectionAnchors(titled.map((section) => section.title));
  return { anchors, ids: new Map<SectionConfig, string>(titled.map((section, index) => [section, anchors[index].id])) };
};

export interface __Skin__DashboardProps {
  title?: string;
  subtitle?: string;
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  blocks: BlockConfig[];
  pages?: PageConfig[];
  nav?: NavEntry[] | false;
  footprint: __Skin__Footprint;
  panels?: Record<string, PanelInfo>;
  now?: Date;
  navigate?: (path: string) => void;
}

/** The generated skin's whole Dashboard, from normalized Lovelace config and the skin-local Card registry. */
export function __Skin__Dashboard({ title, subtitle, showTime, hourCycle, blocks, pages = [], nav: navConfig, footprint, panels, now, navigate }: __Skin__DashboardProps) {
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
    <__Skin__Section key={key} id={ids.get(item)} title={item.title} note={item.note} columns={item.columns} footprint={footprint}>
      {item.cards.map((card, index) => {
        const live = render__Skin__Card(card, footprint);
        return card.span && card.span > 1 ? <__Skin__Cell key={`${index}:${card.entity}`} span={card.span}>{live}</__Skin__Cell> : <span key={`${index}:${card.entity}`} className="__skin__-card-cell">{live}</span>;
      })}
    </__Skin__Section>
  );
  return (
    <__Skin__Page pageRef={root} title={page?.title ?? title} subtitle={page ? undefined : subtitle} showTime={showTime} hourCycle={hourCycle} now={now} nav={showNav ? <__Skin__NavBar items={nav.buttons} /> : undefined}>
      {shown.map((block, index) => block.kind === "columns" ? <__Skin__Columns key={index} columns={block.columns}>{block.sections.map(section)}</__Skin__Columns> : section(block, index))}
      {cardsOf(shown).length === 0 && <p className="__skin__-dashboard-empty">No supported entities yet. Add a domain with the normal Card generator, then add that entity to Home Assistant.</p>}
    </__Skin__Page>
  );
}
