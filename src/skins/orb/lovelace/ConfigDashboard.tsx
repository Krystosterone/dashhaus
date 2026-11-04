import { useMemo, useRef } from "react";
import type { ReactElement } from "react";
import { DashboardPage } from "../dashboards/layout";
import { NavBar } from "../dashboards/NavBar";
import { MAIN_PAGE, resolveNav, sectionAnchors, useRowLayout } from "@dashhaus/dashboard";
import type { PanelInfo } from "@dashhaus/dashboard";
import { useDashboardNav } from "@dashhaus/dashboard";
import type { TrackPolicy } from "@dashhaus/dashboard/layout";
import { JoinedBundle, LeadBundle, TitledBundle, joinedUnits } from "../bundles/Bundle";
import { CardHeadingLevelContext } from "../shared/ui";
import type { CardFootprint } from "../shared/ui";
import { HaLockTile } from "../ha/HaLockTile";
import { HaFanTile } from "../ha/HaFanTile";
// new-card: tile imports
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
import { renderCard } from "@dashhaus/dashboard/schema";
import type { CardRenderers } from "@dashhaus/dashboard/schema";
import type { CardConfig, DashboardConfig, ItemConfig, Kind, RowLayoutConfig } from "./config";
import { ActionStatus } from "./ActionStatus";

/** Each kind's connected tile: the shared renderer dispatch picks the card's row. */
const TILES: CardRenderers<Kind, CardConfig, ReactElement, [key?: string]> = {
  light: (card, key) => <HaLightTile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} loadHistory={card.history} area={card.area} color={card.color} />,
  climate: (card, key) => <HaClimateTile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} loadHistory={card.history} area={card.area} unit={card.unit} color={card.color} />,
  cover: (card, key) => <HaCoverTile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} loadHistory={card.history} area={card.area} color={card.color} />,
  sensor: (card, key) => <HaSensorTile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} loadHistory={card.history} area={card.area} humidityEntityId={card.humidity} batteryEntityId={card.battery} outdoor={card.outdoor} unit={card.unit} color={card.color} />,
  weather: (card, key) => <HaWeatherTile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} loadHistory={card.history} aqiEntityId={card.aqi} aqiScale={card.aqiScale} sunEntityId={card.sun} loadForecasts={card.forecasts} />,
  toggle: (card, key) => <HaToggleTile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} loadHistory={card.history} area={card.area} icon={card.icon} color={card.color} description={card.description} />,
  alarm: (card, key) => <HaAlarmTile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} loadHistory={card.history} area={card.area} readOnly={card.readOnly} exitDelay={card.exitDelay} entryDelay={card.entryDelay} openSensors={card.openSensors} />,
  owlet: (card, key) => <HaOwletTile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} loadHistory={card.history} area={card.area} heartRateEntityId={card.heartRate} oxygenEntityId={card.oxygen} chargingEntityId={card.charging} baseEntityId={card.baseStation} alertEntityIds={card.alerts} staleAfterMinutes={card.staleAfter} color={card.color} />,
  humidifier: (card, key) => <HaHumidifierTile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} loadHistory={card.history} area={card.area} color={card.color} />,
  sound: (card, key) => <HaSoundTile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} loadHistory={card.history} area={card.area} volumeEntityId={card.volume} color={card.color} />,
  lock: (card, key) => <HaLockTile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} area={card.area} batteryEntityId={card.battery} color={card.color} />,
  fan: (card, key) => <HaFanTile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} loadHistory={card.history} area={card.area} color={card.color} />,
  // new-card: tiles
};

/** One configured card as its connected tile. */
function tile(card: CardConfig, key?: string): ReactElement {
  return renderCard(TILES, card, key);
}

/** A card or a bundle as its connected tiles. */
function item(entry: ItemConfig): ReactElement {
  if (entry.kind === "joined") return <JoinedBundle label={entry.label}>{entry.members.map((m, i) => tile(m, `${i}:${m.entity}`))}</JoinedBundle>;
  if (entry.kind === "lead") return <LeadBundle lead={tile(entry.lead)} label={entry.label} sheetTitle={entry.sheetTitle}>{entry.rows.map((r, i) => tile(r, `${i}:${r.entity}`))}</LeadBundle>;
  if (entry.kind === "titled") return <TitledBundle title={entry.title} area={entry.area}>{entry.rows.map((r, i) => tile(r, `${i}:${r.entity}`))}</TitledBundle>;
  return tile(entry);
}

/**
 * Orb's tracks: an explicit `columns` holds while a track is at least 156 px, so two columns hold from 320 px of row
 * (the narrow-phone boundary); left out, a row takes as many 300 px tracks as fit, at most twelve.
 */
const ORB_TRACKS: TrackPolicy = { gap: 8, min: 156, preferred: 300, max: 12 };

/** A footprint's height in 60 px units: n units are n × 60 + (n − 1) × 8 px. */
const FOOTPRINT_UNITS: Record<CardFootprint, number> = { compact: 1, standard: 2, featured: 4 };

/** A card's or a bundle's height in units at `width` px: a bundle forces its members' footprints. */
function unitsOf(entry: ItemConfig, width: number | undefined): number {
  if (entry.kind === "joined") return joinedUnits(entry.members.length, width);
  if (entry.kind === "lead") return FOOTPRINT_UNITS.standard + entry.rows.length;
  if (entry.kind === "titled") return 1 + entry.rows.length;
  return FOOTPRINT_UNITS[entry.footprint ?? "standard"];
}

/**
 * One row: an optional heading, then its cards on a grid of 60 px units with the 8 px gap, each where the shared
 * placement put it. Every footprint is a whole number of units, so cards of every footprint share the grid without
 * holes the YAML didn't ask for. The row measures itself, so a narrow one yields tracks like a phone.
 */
function Row({ row, id }: { row: RowLayoutConfig; id?: string }) {
  const layout = useRowLayout(row, ORB_TRACKS, unitsOf);
  const grid = (
    <div ref={layout.ref} className="dash-row" data-tracks={layout.tracks} style={layout.style}>
      {row.cards.map((entry, i) => (
        <div key={`${i}:${"entity" in entry.item ? entry.item.entity : entry.item.kind}`} className="dash-place" style={layout.cells[i]?.style}>{item(entry.item)}</div>
      ))}
    </div>
  );
  if (!row.title) return grid;
  return (
    <section id={id} data-section-id={id} className="dash-sec" aria-label={row.title}>
      <h2 className="dash-sec-h">{row.title}{row.note && <small>{row.note}</small>}</h2>
      <CardHeadingLevelContext.Provider value={3}>{grid}</CardHeadingLevelContext.Provider>
    </section>
  );
}

/** A page's titled rows, in order, each with its id: two rows of one title still get one id each. */
function anchorsOf(rows: readonly RowLayoutConfig[]) {
  const titled = rows.filter((r): r is RowLayoutConfig & { title: string } => !!r.title);
  const anchors = sectionAnchors(titled.map((r) => r.title));
  return { anchors, ids: new Map<RowLayoutConfig, string>(titled.map((r, i) => [r, anchors[i].id])) };
}

export interface ConfigDashboardProps {
  config: DashboardConfig & { rows: RowLayoutConfig[] };
  /** The frontend's `hass.panels`, which name the dashboards a `navigate:` item goes to. */
  panels?: Record<string, PanelInfo>;
  /** Fixed clock for screenshots; live otherwise. */
  now?: Date;
  /** How a `navigate:` item leaves; Home Assistant's router unless a story stands in. */
  navigate?: (path: string) => void;
}

/**
 * A whole dashboard drawn from the card's YAML: the main page (the top-level `cards` or `rows`) or one of its `pages`,
 * and a bottom nav to its titled rows, its pages and other dashboards. A wall panel (`viewing: far`) has no nav unless the
 * YAML lists one; a nav with one destination isn't drawn. It needs an `HaProvider` above it.
 */
export function ConfigDashboard({ config, panels, now, navigate }: ConfigDashboardProps) {
  const root = useRef<HTMLDivElement>(null);
  const pages = useMemo(() => config.pages ?? [], [config.pages]);
  const pageIds = useMemo(() => pages.map((p) => p.id), [pages]);
  const main = useMemo(() => anchorsOf(config.rows), [config.rows]);
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
  const shown = page?.rows ?? config.rows;
  const ids = page ? anchorsOf(page.rows).ids : main.ids;
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
      {shown.map((row, i) => <Row key={`${page?.id ?? MAIN_PAGE}:${i}`} row={row} id={ids.get(row)} />)}
      {!showNav && <ActionStatus />}
    </DashboardPage>
  );
}
