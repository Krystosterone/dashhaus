import { useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useActionStatus } from "@dashhaus/dashboard";
import { MAIN_PAGE, resolveNav, sectionAnchors } from "@dashhaus/dashboard";
import type { NavEntry, PanelInfo } from "@dashhaus/dashboard";
import { useDashboardNav } from "@dashhaus/dashboard";
import { renderCard } from "@dashhaus/dashboard/schema";
import type { CardRenderers } from "@dashhaus/dashboard/schema";
// new-card: module imports
import { HaClimateModule } from "../ha/HaClimateModule";
import { HaLightModule } from "../ha/HaLightModule";
import { HaSensorModule } from "../ha/HaSensorModule";
import { HaToggleModule } from "../ha/HaToggleModule";
import { HaWeatherModule } from "../ha/HaWeatherModule";
import { HaHumidifierModule } from "../ha/HaHumidifierModule";
import { HaSoundModule } from "../ha/HaSoundModule";
import { HaCoverModule } from "../ha/HaCoverModule";
import { HaAlarmModule } from "../ha/HaAlarmModule";
import { HaOwletModule } from "../ha/HaOwletModule";
import { Key } from "../shared/ui";
import { Area, Areas, Cell, FieldPage } from "../dashboards/layout";
import { NavBar } from "../dashboards/NavBar";
import type { FieldFootprint } from "../shared/ui";
import { modulesOf, sectionsOf } from "./config";
import type { BlockConfig, FieldKind, ModuleConfig, PageConfig, SectionConfig } from "./config";
import "./dashboard.css";

interface LiveProps { item: ModuleConfig; footprint: FieldFootprint }

/** Each card's connected module, given a module's config and its footprint. A new card adds its row here. */
const LIVE: CardRenderers<FieldKind, ModuleConfig, ReactNode, [FieldFootprint]> = {
  light: (item, footprint) => <HaLightModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} loadHistory={item.history} />,
  climate: (item, footprint) => <HaClimateModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} loadHistory={item.history} unit={item.unit} />,
  sensor: (item, footprint) => (
    <HaSensorModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} loadHistory={item.history} unit={item.unit} humidityEntityId={item.humidity} batteryEntityId={item.battery} outdoor={item.outdoor} />
  ),
  weather: (item, footprint) => (
    <HaWeatherModule entityId={item.entity} name={item.name} footprint={footprint} loadHistory={item.history} aqiEntityId={item.aqi} aqiScale={item.aqiScale} sunEntityId={item.sun} loadForecasts={item.forecasts} />
  ),
  toggle: (item, footprint) => (
    <HaToggleModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} loadHistory={item.history} icon={item.icon} description={item.description} />
  ),
  humidifier: (item, footprint) => <HaHumidifierModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} loadHistory={item.history} />,
  sound: (item, footprint) => <HaSoundModule entityId={item.entity} volumeEntityId={item.volume} name={item.name} area={item.area} footprint={footprint} loadHistory={item.history} />,
  cover: (item, footprint) => <HaCoverModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} loadHistory={item.history} />,
  alarm: (item, footprint) => (
    <HaAlarmModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} loadHistory={item.history} readOnly={item.readOnly} exitDelay={item.exitDelay} entryDelay={item.entryDelay} openSensors={item.openSensors} />
  ),
  owlet: (item, footprint) => (
    <HaOwletModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} loadHistory={item.history} heartRateEntityId={item.heartRate} oxygenEntityId={item.oxygen} chargingEntityId={item.charging} baseEntityId={item.baseStation} alertEntityIds={item.alerts} staleAfterMinutes={item.staleAfter} />
  ),
  // new-card: live modules
};

/** One live module, routed by its card to the skin-free hook and the matching Field drawing. */
function LiveModule({ item, footprint }: LiveProps) {
  return renderCard(LIVE, item, item.footprint ?? footprint);
}

/** The latest command Home Assistant rejected, with Retry when repeating it is safe, and Dismiss. */
function ActionNotice() {
  const status = useActionStatus();
  if (!status) return null;
  const { title, detail, canRetry, retrying } = status;
  return (
    <div className="fd-notice" role="alert" aria-label="Home Assistant action failed">
      <p className="fd-notice-t"><strong>{title}</strong><span>{detail}</span></p>
      <div className="fd-notice-keys">
        {canRetry && (
          <Key label={retrying ? "Retrying" : "Retry"} caption={retrying ? "Retrying" : "Retry"} disabled={retrying} onPress={status.retry}>{null}</Key>
        )}
        <Key label="Dismiss" caption="Dismiss" onPress={status.dismiss}>{null}</Key>
      </div>
    </div>
  );
}

/** A page's titled sections, in order, each with its id: two sections of one title still get one id each. */
function anchorsOf(blocks: readonly BlockConfig[]) {
  const titled = sectionsOf(blocks).filter((s): s is SectionConfig & { title: string } => !!s.title);
  const anchors = sectionAnchors(titled.map((s) => s.title));
  return { anchors, ids: new Map<SectionConfig, string>(titled.map((s, i) => [s, anchors[i].id])) };
}

export interface FieldDashboardProps {
  title?: string;
  /** Replaces the date under the title on the main page (YAML `subtitle`). */
  subtitle?: string;
  /** A clock in the header (YAML `show_time`), on 12 or 24 hours (`hour_cycle`). */
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  /** "far": a wall panel read from across the room (YAML `viewing`). */
  viewing?: "near" | "far";
  /**
   * The main page: the YAML's `sections`, or its `modules` (or the automatic layout) as a section per area. Each module
   * has its area from the YAML or, failing that, Home Assistant's registries.
   */
  blocks: BlockConfig[];
  /** The card's other pages, opened from the nav. */
  pages?: PageConfig[];
  /** The nav's destinations; absent: the pages, or else the main page's sections; false: none. */
  nav?: NavEntry[] | false;
  footprint: FieldFootprint;
  /** An alarm holds its inverted screen from the start, with no flash (YAML `quiet: true`). */
  quiet?: boolean;
  /** The frontend's `hass.panels`, which name the dashboards a `navigate:` item goes to. */
  panels?: Record<string, PanelInfo>;
  /** Fixed clock for screenshots; live otherwise. */
  now?: Date;
  /** How a `navigate:` item leaves; Home Assistant's router unless a story stands in. */
  navigate?: (path: string) => void;
}

const NO_PAGES: PageConfig[] = [];

/**
 * The field page drawn from the card's config (`FieldPage`): the main page or one of its `pages`, each an optional
 * header, the alert line with every alarm and urgent warning its modules report, then its sections, a legend printed
 * over each where there is more than one; and a nav docked at the bottom, to its sections, its pages and other
 * dashboards. A wall panel (`viewing: far`) has no nav unless the YAML lists one; a nav with one destination isn't
 * drawn. A rejected command docks at the bottom, above the nav. It needs an `HaProvider` above it.
 */
export function FieldDashboard({ title, subtitle, showTime, hourCycle, viewing, blocks, pages = NO_PAGES, nav: navConfig, footprint, quiet, panels, now, navigate }: FieldDashboardProps) {
  const root = useRef<HTMLDivElement>(null);
  const pageIds = useMemo(() => pages.map((p) => p.id), [pages]);
  const main = useMemo(() => anchorsOf(blocks), [blocks]);
  const items = useMemo(() => (navConfig === false ? [] : resolveNav({
    entries: navConfig,
    mainTitle: title ?? "Home",
    pages,
    sections: main.anchors,
    panels,
  })), [navConfig, title, main, pages, panels]);
  const nav = useDashboardNav({ items, pages: pageIds, rootRef: root, navigate });
  const page = nav.page === MAIN_PAGE ? undefined : pages.find((p) => p.id === nav.page);
  const showNav = nav.buttons.length > 1 && (viewing !== "far" || Array.isArray(navConfig));
  const shown = page?.blocks ?? blocks;
  const ids = page ? anchorsOf(page.blocks).ids : main.ids;
  const legend = sectionsOf(shown).length > 1;

  const area = (s: SectionConfig, key: number) => (
    <Area key={key} id={ids.get(s)} title={s.title} legend={legend} note={s.note} columns={s.columns} footprint={footprint}>
      {s.modules.map((item, i) => {
        const live = <LiveModule key={`${i}:${item.entity}`} item={item} footprint={footprint} />;
        return item.span && item.span > 1 ? <Cell key={`${i}:${item.entity}`} span={item.span}>{live}</Cell> : live;
      })}
    </Area>
  );

  return (
    <FieldPage
      pageRef={root}
      title={page?.title ?? title}
      subtitle={page ? undefined : subtitle}
      showTime={showTime}
      hourCycle={hourCycle}
      viewing={viewing}
      quiet={quiet}
      now={now}
      nav={showNav ? <><ActionNotice /><NavBar items={nav.buttons} /></> : undefined}
    >
      {shown.map((b, i) => (b.kind === "columns" ? <Areas key={i} columns={b.columns}>{b.sections.map(area)}</Areas> : area(b, i)))}
      {modulesOf(shown).length === 0 && <p className="fd-dash-empty">No supported entities yet. Add <code>modules</code> to the card, or add a light, climate entity, temperature sensor or toggle to Home Assistant.</p>}
      {!showNav && <ActionNotice />}
    </FieldPage>
  );
}
