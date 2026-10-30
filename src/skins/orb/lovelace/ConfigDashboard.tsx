import { useMemo, useRef } from "react";
import type { ReactElement } from "react";
import { DashboardPage, Section, Columns, CardGrid, Cell } from "../dashboards/layout";
import { NavBar } from "../dashboards/NavBar";
import { MAIN_PAGE, resolveNav, sectionAnchors } from "../../../ha/lovelace";
import type { PanelInfo } from "../../../ha/lovelace";
import { useDashboardNav } from "../../../ha/lovelace";
import { JoinedBundle, LeadBundle, TitledBundle } from "../bundles/Bundle";
import { HaLightTile } from "../ha/HaLightTile";
import { HaClimateTile } from "../ha/HaClimateTile";
import { HaSensorTile } from "../ha/HaSensorTile";
import { HaWeatherTile } from "../ha/HaWeatherTile";
import { HaCoverTile } from "../ha/HaCoverTile";
import { HaToggleTile } from "../ha/HaToggleTile";
import { HaAlarmTile } from "../ha/HaAlarmTile";
import { HaOwletTile } from "../ha/HaOwletTile";
import { HaHumidifierTile } from "../ha/HaHumidifierTile";
import { HaSoundTile } from "../ha/HaSoundTile";
import type { BlockConfig, CardConfig, DashboardConfig, ItemConfig, SectionConfig } from "./config";
import { ActionStatus } from "./ActionStatus";

/** One configured card as its connected tile. */
function tile(card: CardConfig, key?: string): ReactElement {
  const common = { entityId: card.entity, name: card.name, footprint: card.footprint, showControl: card.showControl, loadHistory: card.history };
  switch (card.kind) {
    case "light": return <HaLightTile key={key} {...common} area={card.area} color={card.color} />;
    case "climate": return <HaClimateTile key={key} {...common} area={card.area} unit={card.unit} color={card.color} />;
    case "cover": return <HaCoverTile key={key} {...common} area={card.area} color={card.color} />;
    case "sensor": return <HaSensorTile key={key} {...common} area={card.area} humidityEntityId={card.humidity} batteryEntityId={card.battery} outdoor={card.outdoor} unit={card.unit} color={card.color} />;
    case "weather": return <HaWeatherTile key={key} {...common} aqiEntityId={card.aqi} aqiScale={card.aqiScale} sunEntityId={card.sun} loadForecasts={card.forecasts} />;
    case "toggle": return <HaToggleTile key={key} {...common} area={card.area} icon={card.icon} color={card.color} description={card.description} />;
    case "alarm": return <HaAlarmTile key={key} {...common} area={card.area} readOnly={card.readOnly} exitDelay={card.exitDelay} entryDelay={card.entryDelay} openSensors={card.openSensors} />;
    case "owlet": return <HaOwletTile key={key} {...common} area={card.area} heartRateEntityId={card.heartRate} oxygenEntityId={card.oxygen} chargingEntityId={card.charging} baseEntityId={card.baseStation} alertEntityIds={card.alerts} staleAfterMinutes={card.staleAfter} color={card.color} />;
    case "humidifier": return <HaHumidifierTile key={key} {...common} area={card.area} color={card.color} />;
    case "sound": return <HaSoundTile key={key} {...common} area={card.area} volumeEntityId={card.volume} color={card.color} />;
  }
}

function item(entry: ItemConfig, index: number) {
  const key = entry.span > 1 ? undefined : String(index);
  const content = entry.kind === "joined"
    ? <JoinedBundle key={key} label={entry.label}>{entry.members.map((m, i) => tile(m, `${i}:${m.entity}`))}</JoinedBundle>
    : entry.kind === "lead"
      ? <LeadBundle key={key} lead={tile(entry.lead)} label={entry.label} sheetTitle={entry.sheetTitle}>{entry.rows.map((r, i) => tile(r, `${i}:${r.entity}`))}</LeadBundle>
      : entry.kind === "titled"
        ? <TitledBundle key={key} title={entry.title} area={entry.area}>{entry.rows.map((r, i) => tile(r, `${i}:${r.entity}`))}</TitledBundle>
        : tile(entry, key);
  return entry.span > 1 ? <Cell key={index} span={entry.span}>{content}</Cell> : content;
}

/** A page's titled sections, in order, each with its id: two sections of one title still get one id each. */
function anchorsOf(blocks: readonly BlockConfig[]) {
  const titled = blocks.flatMap((b) => (b.kind === "columns" ? b.sections : [b])).filter((s): s is SectionConfig & { title: string } => !!s.title);
  const anchors = sectionAnchors(titled.map((s) => s.title));
  return { anchors, ids: new Map<SectionConfig, string>(titled.map((s, i) => [s, anchors[i].id])) };
}

function section(s: SectionConfig, key: number, ids: Map<SectionConfig, string>) {
  const items = s.items.map(item);
  return s.title
    ? <Section key={key} id={ids.get(s)} title={s.title} note={s.note} columns={s.columns} gap={s.gap}>{items}</Section>
    : <CardGrid key={key} columns={s.columns} gap={s.gap}>{items}</CardGrid>;
}

function block(b: BlockConfig, key: number, ids: Map<SectionConfig, string>) {
  return b.kind === "columns"
    ? <Columns key={key} columns={b.columns} gap={b.gap}>{b.sections.map((s, i) => section(s, i, ids))}</Columns>
    : section(b, key, ids);
}

export interface ConfigDashboardProps {
  config: DashboardConfig & { blocks: BlockConfig[] };
  /** The frontend's `hass.panels`, which name the dashboards a `navigate:` item goes to. */
  panels?: Record<string, PanelInfo>;
  /** Fixed clock for screenshots; live otherwise. */
  now?: Date;
  /** How a `navigate:` item leaves; Home Assistant's router unless a story stands in. */
  navigate?: (path: string) => void;
}

/**
 * A whole dashboard drawn from the card's YAML: the main page (the top-level sections) or one of its `pages`, and a
 * bottom nav to its sections, its pages and other dashboards. A wall panel (`viewing: far`) has no nav unless the
 * YAML lists one; a nav with one destination isn't drawn. It needs an `HaProvider` above it.
 */
export function ConfigDashboard({ config, panels, now, navigate }: ConfigDashboardProps) {
  const root = useRef<HTMLDivElement>(null);
  const pages = useMemo(() => config.pages ?? [], [config.pages]);
  const pageIds = useMemo(() => pages.map((p) => p.id), [pages]);
  const main = useMemo(() => anchorsOf(config.blocks), [config.blocks]);
  const items = useMemo(() => (config.nav === false ? [] : resolveNav({
    entries: config.nav,
    mainTitle: config.title,
    pages,
    sections: main.anchors,
    panels,
  })), [config.nav, config.title, main, pages, panels]);
  const nav = useDashboardNav({ items, pages: pageIds, rootRef: root, navigate });
  const page = nav.page === MAIN_PAGE ? undefined : pages.find((p) => p.id === nav.page);
  const showNav = nav.buttons.length > 1 && (config.viewing !== "far" || Array.isArray(config.nav));
  const shown = page?.blocks ?? config.blocks;
  const ids = page ? anchorsOf(page.blocks).ids : main.ids;
  return (
    <DashboardPage
      pageRef={root}
      title={page?.title ?? config.title}
      subtitle={page ? undefined : config.subtitle}
      showTime={config.showTime}
      hourCycle={config.hourCycle}
      viewing={config.viewing}
      now={now}
      nav={showNav ? <><ActionStatus /><NavBar items={nav.buttons} /></> : undefined}
    >
      {shown.map((b, i) => block(b, i, ids))}
      {!showNav && <ActionStatus />}
    </DashboardPage>
  );
}
