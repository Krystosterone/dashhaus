import { createContext, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useActionStatus } from "@dashhaus/core/lovelace/skin";
import { MAIN_PAGE, resolveNav, sectionAnchors, useRowLayout } from "@dashhaus/core/lovelace";
import type { NavEntry, PanelInfo } from "@dashhaus/core/lovelace";
import { useDashboardNav } from "@dashhaus/core/lovelace";
import { renderCard, rowItems } from "@dashhaus/core/lovelace/schema";
import type { CardRenderers } from "@dashhaus/core/lovelace/schema";
import type { TrackPolicy } from "@dashhaus/core/lovelace/layout";
import { HaFanModule } from "../ha/HaFanModule";
import { HaGuestWifiModule } from "../ha/HaGuestWifiModule";
import { HaBinarySensorModule } from "../ha/HaBinarySensorModule";
import { HaCameraModule } from "../ha/HaCameraModule";
import { HaMediaPlayerModule } from "../ha/HaMediaPlayerModule";
import { HaNumericModule } from "../ha/HaNumericModule";
import { HaVacuumModule } from "../ha/HaVacuumModule";
import { HaCalendarModule } from "../ha/HaCalendarModule";
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
import { HaLockModule } from "../ha/HaLockModule";
import { Key } from "../shared/ui";
import { Area, FieldPage, Place, Stack } from "../dashboards/layout";
import { NavBar } from "../dashboards/NavBar";
import type { FieldFootprint } from "../shared/ui";
import type { FieldKind, FieldRow, ModuleConfig, PageConfig } from "./config";
import "./dashboard.css";

interface LiveProps { item: ModuleConfig; footprint: FieldFootprint }

/**
 * The dashboard's picture and motion settings (YAML `stills` and `quiet`): every camera module on it follows both,
 * under its own `still` and `refresh`, and every media player follows `quiet`, drawing no progress rule or running
 * clock. `LIVE` reads it with `Stills.Consumer` inline, so each line still names its module where
 * verify/field-conformance.test.ts looks for it.
 */
const Stills = createContext({ stills: true, quiet: false });

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
  lock: (item, footprint) => <HaLockModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} batteryEntityId={item.battery} />,
  fan: (item, footprint) => <HaFanModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} loadHistory={item.history} />,
  guestWifi: (item, footprint) => <HaGuestWifiModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} access={item.access} network={item.network} qrEntityId={item.qr} newCodeEntityId={item.newCode} refreshEntityId={item.refresh} />,
  binarySensor: (item, footprint) => <HaBinarySensorModule entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} batteryEntityId={item.battery} />,
  camera: (item, footprint) => <Stills.Consumer>{({ stills, quiet }) => (
    <HaCameraModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} still={stills && item.still !== false} refresh={item.stillRefresh} paused={quiet} />)}</Stills.Consumer>,
  mediaPlayer: (item, footprint) => <Stills.Consumer>{({ quiet }) => (
    <HaMediaPlayerModule entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} quiet={quiet} />)}</Stills.Consumer>,
  numeric: (item, footprint) => <HaNumericModule entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} unit={item.readingUnit} />,
  vacuum: (item, footprint) => <HaVacuumModule entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} />,
  calendar: (item, footprint) => <HaCalendarModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} calendarEntityIds={item.calendars} days={item.days} loadEvents={item.events} loadHistory={item.history} />,
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

/** A page's titled rows, in order, each with its id: two rows of one title still get one id each. */
function anchorsOf(rows: readonly FieldRow[]) {
  const titled = rows.filter((r): r is FieldRow & { title: string } => !!r.title);
  const anchors = sectionAnchors(titled.map((r) => r.title));
  return { anchors, ids: new Map<FieldRow, string>(titled.map((r, i) => [r, anchors[i].id])) };
}

/**
 * Field's tracks: at least a module's width (260 px; a compact row's 300 px), with its gap; `columns` is only ever a
 * most, so a module never narrows below its own, and four fit the page's 1240 px.
 */
export const FIELD_TRACKS: Record<FieldFootprint, TrackPolicy> = {
  standard: { gap: 12, min: 260, preferred: 260, max: 4 },
  compact: { gap: 8, min: 300, preferred: 300, max: 4 },
};

interface RowProps { row: FieldRow; id?: string; legend: boolean; label: string | null; footprint: FieldFootprint }

/**
 * One row under its legend. A row of one footprint is a grid placed by the shared layout (its tracks from its own
 * width, each module on its grid lines). A row that mixes footprints draws a stack per column, so a short module
 * never sits beside a tall one in a grid row; with fewer tracks than its columns, the stacks wrap in column order.
 */
function Row({ row, id, legend, label, footprint }: RowProps) {
  const own = (item: ModuleConfig) => item.footprint ?? footprint;
  const grid = row.stacks ? "standard" : own(row.cards[0]?.item ?? ({} as ModuleConfig));
  const layout = useRowLayout(row, FIELD_TRACKS[grid]);
  const drawn = (item: ModuleConfig, i: number) => <LiveModule key={`${i}:${item.entity}`} item={item} footprint={footprint} />;
  let content;
  if (row.stacks) {
    const columns = row.columns ?? Math.max(...row.cards.map((entry) => entry.column ?? 1));
    const placed = layout.tracks >= columns;
    content = Array.from({ length: columns }, (_, c) => {
      const stack = row.cards.flatMap((entry, i) => (entry.column === c + 1 ? [{ entry, i }] : []));
      return stack.length ? (
        <Stack key={c} column={placed ? c + 1 : undefined}>
          {stack.map(({ entry, i }) => <Place key={`${i}:${entry.item.entity}`} footprint={own(entry.item)}>{drawn(entry.item, i)}</Place>)}
        </Stack>
      ) : null;
    });
  } else {
    content = row.cards.map((entry, i) => <Place key={`${i}:${entry.item.entity}`} style={layout.cells[i]?.style} footprint={own(entry.item)}>{drawn(entry.item, i)}</Place>);
  }
  return (
    <Area id={id} title={row.title} label={label} legend={legend} note={row.note} footprint={grid} grid={{ ref: layout.ref, style: layout.style, tracks: layout.tracks, stacks: row.stacks, align: row.align }}>
      {content}
    </Area>
  );
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
   * The main page: the YAML's rows (its `cards` are one), or the automatic layout's row per area. Each module has its
   * area from the YAML or, failing that, Home Assistant's registries.
   */
  rows: FieldRow[];
  /** The card's other pages, opened from the nav. */
  pages?: PageConfig[];
  /** The nav's destinations; absent: the pages, or else the main page's sections; false: none. */
  nav?: NavEntry[] | false;
  footprint: FieldFootprint;
  /**
   * Nothing changes by itself (YAML `quiet: true`): an alarm holds its inverted screen from the start, with no flash,
   * a camera's still refreshes only when seen anew, never on a timer, and a media player draws no progress rule or
   * running clock.
   */
  quiet?: boolean;
  /** False: no camera still is fetched or drawn (YAML `stills: false`). */
  stills?: boolean;
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
 * header, the alert line with every alarm and urgent warning its modules report, then its rows, a legend printed over
 * each titled one where there is more than one; and a nav docked at the bottom, to its sections, its pages and other
 * dashboards. A wall panel (`viewing: far`) has no nav unless the YAML lists one; a nav with one destination isn't
 * drawn. A rejected command docks at the bottom, above the nav. It needs an `HaProvider` above it.
 */
export function FieldDashboard({ title, subtitle, showTime, hourCycle, viewing, rows, pages = NO_PAGES, nav: navConfig, footprint, quiet, stills = true, panels, now, navigate }: FieldDashboardProps) {
  const root = useRef<HTMLDivElement>(null);
  const pageIds = useMemo(() => pages.map((p) => p.id), [pages]);
  const main = useMemo(() => anchorsOf(rows), [rows]);
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
  const shown = page?.rows ?? rows;
  const ids = page ? anchorsOf(page.rows).ids : main.ids;
  const legend = shown.length > 1;
  const pictures = useMemo(() => ({ stills, quiet: quiet === true }), [stills, quiet]);

  return (
    <Stills.Provider value={pictures}>
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
        {shown.map((row, i) => <Row key={`${page?.id ?? MAIN_PAGE}:${i}`} row={row} id={ids.get(row)} legend={legend} label={shown.length > 1 ? "Other" : null} footprint={footprint} />)}
        {rowItems(shown).length === 0 && <p className="fd-dash-empty">No supported entities yet. Add <code>cards</code> to the card, or add a light, climate entity, temperature sensor or toggle to Home Assistant.</p>}
        {!showNav && <ActionNotice />}
      </FieldPage>
    </Stills.Provider>
  );
}
