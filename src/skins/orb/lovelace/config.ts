import { DashboardConfigError, Reader as YamlReader, isRaw, oneOf, suggest } from "../../../ha/lovelace/yaml";
import type { Raw } from "../../../ha/lovelace/yaml";
import { COLORS } from "../shared/ui";
import type { ColorName, CardFootprint } from "../shared/ui";
import type { ToggleIcon } from "../../../domains/toggle/types";
import type { AlarmTileProps } from "../cards/alarm/AlarmTile";
import type { OwletAlert } from "../../../domains/owlet/types";
import { OWLET_ALERT_SUFFIX } from "../../../ha/mappers/owlet";
import { MAIN_PAGE } from "../../../ha/lovelace/nav";
import type { NavEntry } from "../../../ha/lovelace/nav";

/*
 * The card's YAML, as Lovelace hands it over (already parsed), checked and normalized. Every mistake is
 * collected with its path and, for a misspelt key, the key that was probably meant, so the YAML editor shows
 * all of them at once instead of the first.
 */

export type Kind = "light" | "climate" | "sensor" | "weather" | "cover" | "toggle" | "alarm" | "owlet" | "humidifier" | "sound";

/** Each supported domain's card: the entity id picks it. */
export const DOMAIN_KIND: Record<string, Kind> = {
  light: "light",
  climate: "climate",
  sensor: "sensor",
  weather: "weather",
  cover: "cover",
  input_boolean: "toggle",
  switch: "toggle",
  alarm_control_panel: "alarm",
  humidifier: "humidifier",
};

/**
 * Cards that share a domain with that domain's own card. A card picks one with `card:`; an entity id matching `id`
 * picks it without.
 */
export const SHARED_KINDS: Partial<Record<Kind, { domains: string[]; id?: RegExp }>> = {
  owlet: { domains: ["sensor"], id: /^sensor\.\w+_sleep_state$/ },
  sound: { domains: ["switch"] },
};

interface CardBase {
  entity: string;
  name?: string;
  area?: string;
  footprint?: CardFootprint;
  span: number;
  showControl?: boolean;
  /** False skips the Today history read. */
  history: boolean;
}

export type CardConfig = CardBase & (
  | { kind: "light"; color?: ColorName | "none" }
  | { kind: "climate"; unit?: "°C" | "°F"; color?: ColorName | "none" }
  | { kind: "sensor"; humidity?: string; battery?: string; outdoor?: boolean; unit?: "°C" | "°F"; color?: ColorName | "none" }
  | { kind: "weather"; aqi?: string; aqiScale?: "US"; sun?: string; forecasts: boolean }
  | { kind: "cover"; color?: ColorName | "none" }
  | { kind: "toggle"; icon?: ToggleIcon; color?: ColorName; description?: string }
  | { kind: "alarm"; readOnly?: AlarmTileProps["readOnly"]; exitDelay?: number; entryDelay?: number; openSensors?: string[] }
  | { kind: "owlet"; heartRate?: string; oxygen?: string; charging?: string; baseStation?: string; alerts?: Partial<Record<OwletAlert, string>>; staleAfter?: number; color?: ColorName | "none" }
  | { kind: "humidifier"; color?: ColorName | "none" }
  | { kind: "sound"; volume?: string; color?: ColorName | "none" }
);

export type ItemConfig =
  | CardConfig
  | { kind: "joined"; label?: string; span: number; members: CardConfig[] }
  | { kind: "lead"; label?: string; sheetTitle?: string; span: number; lead: CardConfig; rows: CardConfig[] }
  | { kind: "titled"; title: string; area?: string; span: number; rows: CardConfig[] };

export interface SectionConfig { kind: "section"; title?: string; note?: string; columns: number; gap?: number; items: ItemConfig[] }
export interface ColumnsConfig { kind: "columns"; columns: number; gap?: number; sections: SectionConfig[] }
export type BlockConfig = SectionConfig | ColumnsConfig;

export type ThemeSetting = "home-assistant" | "auto" | "light" | "dark";
export interface Accent { chroma: number; hue: number }

export interface DashboardConfig {
  title: string;
  subtitle?: string;
  showTime: boolean;
  hourCycle?: "h12" | "h23";
  /** "far": a wall panel read from across the room. */
  viewing?: "near" | "far";
  theme: ThemeSetting;
  accent?: Accent;
  /** Absent: lay the house out automatically. */
  blocks?: BlockConfig[];
  /** The bottom nav's destinations; absent: the pages, or else the sections; false: no nav. */
  nav?: NavEntry[] | false;
  /** More pages in this card, opened from the nav; the top-level sections are the main page, `home`. */
  pages?: PageConfig[];
}

/** A page of the card's own: its id (for `page:` in the nav and the URL hash), its title, its sections. */
export interface PageConfig { id: string; title: string; blocks: BlockConfig[] }

/** The titled sections of a page, in order: what a nav can jump to. */
export const sectionTitles = (blocks: readonly BlockConfig[] = []) =>
  blocks.flatMap((b) => (b.kind === "columns" ? b.sections : [b])).flatMap((s) => (s.title ? [s.title] : []));

/** The accents tried in Storybook's toolbar; `yellow` is tokens.css's own. */
export const ACCENTS: Record<string, Accent> = {
  yellow: { chroma: 0.145, hue: 92 },
  sage: { chroma: 0.08, hue: 150 },
  coral: { chroma: 0.12, hue: 35 },
  sky: { chroma: 0.09, hue: 235 },
  lilac: { chroma: 0.08, hue: 300 },
};

const OWLET_ALERTS = Object.keys(OWLET_ALERT_SUFFIX) as OwletAlert[];
const TOGGLE_ICONS: readonly ToggleIcon[] = ["bell-off", "moon", "volume-off", "guest", "away", "power", "waves"];
const FOOTPRINTS: readonly CardFootprint[] = ["compact", "standard", "featured"];
const COLOR_NAMES = Object.keys(COLORS) as ColorName[];

const COMMON_KEYS = ["entity", "card", "name", "area", "footprint", "span", "show_control", "history"];
const KIND_KEYS: Record<Kind, string[]> = {
  light: ["color"],
  climate: ["unit", "color"],
  sensor: ["humidity", "battery", "outdoor", "unit", "color"],
  weather: ["aqi", "aqi_scale", "sun", "forecasts"],
  cover: ["color"],
  toggle: ["icon", "color", "description"],
  alarm: ["read_only", "exit_delay", "entry_delay", "open_sensors"],
  owlet: ["heart_rate", "oxygen", "charging", "base_station", "alerts", "stale_after", "color"],
  humidifier: ["color"],
  sound: ["volume", "color"],
};
const TOP_KEYS = ["type", "title", "subtitle", "show_time", "hour_cycle", "viewing", "theme", "accent", "sections", "nav", "pages", "view_layout", "grid_options", "visibility"];
const NAV_KINDS = ["section", "page", "navigate"] as const;
const PAGE_ID = /^[a-z0-9][a-z0-9_-]*$/;
const SECTION_KEYS = ["title", "note", "columns", "gap", "cards"];
const GROUP_KEYS = ["columns", "gap", "sections"];

export { DashboardConfigError, suggest };

class Reader extends YamlReader {
  /** The card for an entity: `card:` when given, else a shared card its id names, else its domain's. */
  kind(raw: Raw, entity: string, path: string): Kind | undefined {
    const domain = entity.slice(0, entity.indexOf("."));
    const shared = (Object.keys(SHARED_KINDS) as Kind[]).filter((k) => SHARED_KINDS[k]?.domains.includes(domain));
    const kinds = [...(DOMAIN_KIND[domain] ? [DOMAIN_KIND[domain]] : []), ...shared];
    if (!kinds.length) {
      this.problem(path, `${entity}: ${domain}.* entities have no card yet (supported: ${Object.keys(DOMAIN_KIND).join(", ")})`);
      return undefined;
    }
    if (raw.card != null) return this.choice(raw, "card", `${path} (${entity})`, kinds);
    const kind = shared.find((k) => SHARED_KINDS[k]?.id?.test(entity)) ?? DOMAIN_KIND[domain];
    if (!kind) this.problem(path, `${entity}: pick its card with "card": one of ${oneOf(kinds)}`);
    return kind;
  }


  card(value: unknown, path: string): CardConfig | undefined {
    const raw: Raw = typeof value === "string" ? { entity: value } : isRaw(value) ? value : {};
    if (!isRaw(value) && typeof value !== "string") {
      this.problem(path, "a card is an entity id, or a map with an \"entity\" key");
      return undefined;
    }
    if (raw.entity == null) {
      this.problem(path, `a card needs an "entity"${raw.joined || raw.lead ? " (bundles use \"joined\", \"lead\" or \"title\" with \"rows\" at the section's card level)" : ""}`);
      return undefined;
    }
    const entity = this.entityId(raw.entity, path);
    if (!entity) return undefined;
    const kind = this.kind(raw, entity, path);
    if (!kind) return undefined;
    const at = `${path} (${entity})`;
    this.keys(raw, at, [...COMMON_KEYS, ...KIND_KEYS[kind]]);
    const base: CardBase = {
      entity,
      name: this.string(raw, "name", at),
      area: this.string(raw, "area", at),
      footprint: this.choice(raw, "footprint", at, FOOTPRINTS),
      span: this.number(raw, "span", at, 1, 12) ?? 1,
      showControl: this.boolean(raw, "show_control", at),
      history: this.boolean(raw, "history", at) ?? true,
    };
    const color = () => this.choice(raw, "color", at, [...COLOR_NAMES, "none"] as const);
    const unit = () => this.choice(raw, "unit", at, ["°C", "°F"] as const);
    switch (kind) {
      case "light": return { ...base, kind, color: color() };
      case "cover": return { ...base, kind, color: color() };
      case "climate": return { ...base, kind, unit: unit(), color: color() };
      case "sensor": return {
        ...base,
        kind,
        humidity: this.optionalEntity(raw, "humidity", at, ["sensor"]),
        battery: this.optionalEntity(raw, "battery", at, ["sensor"]),
        outdoor: this.boolean(raw, "outdoor", at),
        unit: unit(),
        color: color(),
      };
      case "weather": return {
        ...base,
        kind,
        aqi: this.optionalEntity(raw, "aqi", at, ["sensor"]),
        aqiScale: this.choice(raw, "aqi_scale", at, ["US"] as const),
        sun: raw.sun === undefined ? "sun.sun" : this.optionalEntity(raw, "sun", at, ["sun"]),
        forecasts: this.boolean(raw, "forecasts", at) ?? true,
      };
      case "toggle": return {
        ...base,
        kind,
        icon: this.choice(raw, "icon", at, TOGGLE_ICONS),
        color: this.choice(raw, "color", at, COLOR_NAMES),
        description: this.string(raw, "description", at),
      };
      case "alarm": {
        const sensors = raw.open_sensors;
        if (sensors != null && !(Array.isArray(sensors) && sensors.every((s) => typeof s === "string"))) this.problem(at, "\"open_sensors\" must be a list of names");
        return {
          ...base,
          kind,
          readOnly: this.boolean(raw, "read_only", at),
          exitDelay: this.number(raw, "exit_delay", at, 0, 3600),
          entryDelay: this.number(raw, "entry_delay", at, 0, 3600),
          openSensors: Array.isArray(sensors) ? sensors.filter((s): s is string => typeof s === "string") : undefined,
        };
      }
      case "owlet": {
        const alerts = raw.alerts;
        if (alerts != null && !isRaw(alerts)) this.problem(at, "\"alerts\" must map alerts to binary_sensor.* entities, like low_oxygen: binary_sensor.sock_low_oxygen");
        if (isRaw(alerts)) this.keys(alerts, `${at}.alerts`, OWLET_ALERTS);
        return {
          ...base,
          kind,
          heartRate: this.optionalEntity(raw, "heart_rate", at, ["sensor"]),
          oxygen: this.optionalEntity(raw, "oxygen", at, ["sensor"]),
          charging: this.optionalEntity(raw, "charging", at, ["binary_sensor"]),
          baseStation: this.optionalEntity(raw, "base_station", at, ["switch"]),
          alerts: isRaw(alerts)
            ? Object.fromEntries(OWLET_ALERTS.flatMap((alert) => {
              const id = this.optionalEntity(alerts, alert, `${at}.alerts`, ["binary_sensor"]);
              return id ? [[alert, id]] : [];
            }))
            : undefined,
          staleAfter: this.number(raw, "stale_after", at, 1, 60),
          color: color(),
        };
      }
      case "humidifier": return { ...base, kind, color: color() };
      case "sound": return { ...base, kind, volume: this.optionalEntity(raw, "volume", at, ["number"]), color: color() };
    }
  }

  cards(value: unknown, path: string): CardConfig[] {
    if (!Array.isArray(value) || value.length === 0) {
      this.problem(path, "must be a list of at least one card");
      return [];
    }
    return value.map((card, i) => this.card(card, `${path}[${i}]`)).filter((c): c is CardConfig => !!c);
  }

  item(value: unknown, path: string): ItemConfig | undefined {
    if (isRaw(value) && "joined" in value) {
      this.keys(value, path, ["joined", "label", "span"]);
      return { kind: "joined", label: this.string(value, "label", path), span: this.number(value, "span", path, 1, 12) ?? 1, members: this.cards(value.joined, `${path}.joined`) };
    }
    if (isRaw(value) && "lead" in value) {
      this.keys(value, path, ["lead", "rows", "label", "sheet_title", "span"]);
      const lead = this.card(value.lead, `${path}.lead`);
      const rows = this.cards(value.rows, `${path}.rows`);
      if (!lead) return undefined;
      return { kind: "lead", label: this.string(value, "label", path), sheetTitle: this.string(value, "sheet_title", path), span: this.number(value, "span", path, 1, 12) ?? 1, lead, rows };
    }
    if (isRaw(value) && "rows" in value) {
      this.keys(value, path, ["title", "area", "rows", "span"]);
      const title = this.string(value, "title", path);
      const rows = this.cards(value.rows, `${path}.rows`);
      if (!title) {
        this.problem(path, "a bundle with \"rows\" needs a \"lead\" card, or a \"title\" naming what its rows make up");
        return undefined;
      }
      return { kind: "titled", title, area: this.string(value, "area", path), span: this.number(value, "span", path, 1, 12) ?? 1, rows };
    }
    return this.card(value, path);
  }

  section(value: unknown, path: string): SectionConfig | undefined {
    if (!isRaw(value)) {
      this.problem(path, "a section is a map with \"cards\" (and usually a \"title\")");
      return undefined;
    }
    this.keys(value, path, SECTION_KEYS);
    if (!Array.isArray(value.cards) || value.cards.length === 0) {
      this.problem(path, "\"cards\" must be a list of at least one card");
    }
    const items = Array.isArray(value.cards) ? value.cards.map((c, i) => this.item(c, `${path}.cards[${i}]`)).filter((c): c is ItemConfig => !!c) : [];
    return {
      kind: "section",
      title: this.string(value, "title", path),
      note: this.string(value, "note", path),
      columns: this.number(value, "columns", path, 1, 12) ?? 1,
      gap: this.number(value, "gap", path, 0, 64),
      items,
    };
  }

  block(value: unknown, path: string): BlockConfig | undefined {
    if (isRaw(value) && "sections" in value) {
      this.keys(value, path, GROUP_KEYS);
      if (!Array.isArray(value.sections) || value.sections.length === 0) {
        this.problem(path, "\"sections\" must be a list of at least one section");
        return undefined;
      }
      const sections = value.sections.map((s, i) => this.section(s, `${path}.sections[${i}]`)).filter((s): s is SectionConfig => !!s);
      return { kind: "columns", columns: this.number(value, "columns", path, 1, 12) ?? sections.length, gap: this.number(value, "gap", path, 0, 64), sections };
    }
    return this.section(value, path);
  }

  /** One nav destination: exactly one of `section`, `page` or `navigate`, and an optional `label`. */
  navEntry(value: unknown, path: string): NavEntry | undefined {
    if (!isRaw(value)) {
      this.problem(path, "a nav item is a map with one of \"section\", \"page\" or \"navigate\"");
      return undefined;
    }
    this.keys(value, path, [...NAV_KINDS, "label"]);
    const kinds = NAV_KINDS.filter((k) => value[k] != null);
    if (kinds.length !== 1) {
      this.problem(path, `needs exactly one of ${oneOf(NAV_KINDS)}`);
      return undefined;
    }
    const label = this.string(value, "label", path);
    const target = this.string(value, kinds[0], path);
    if (target == null) return undefined;
    if (kinds[0] === "section") return { kind: "section", title: target, label };
    if (kinds[0] === "page") return { kind: "page", id: target, label };
    if (!target.startsWith("/")) {
      this.problem(path, `"navigate" is a Home Assistant path like /baby-view/0`);
      return undefined;
    }
    return { kind: "navigate", path: target, label };
  }

  page(value: unknown, path: string): PageConfig | undefined {
    if (!isRaw(value)) {
      this.problem(path, "a page is a map with \"id\", \"title\" and \"sections\"");
      return undefined;
    }
    this.keys(value, path, ["id", "title", "sections"]);
    const id = this.string(value, "id", path);
    const title = this.string(value, "title", path);
    if (id == null || !PAGE_ID.test(id)) this.problem(path, "\"id\" is required: lower-case letters, digits, - and _, like living-room");
    else if (id === MAIN_PAGE) this.problem(path, `"id" can't be "${MAIN_PAGE}": that is the top-level sections`);
    if (title == null) this.problem(path, "\"title\" is required");
    if (!Array.isArray(value.sections) || value.sections.length === 0) {
      this.problem(path, "\"sections\" must be a list of at least one section");
      return undefined;
    }
    const blocks = value.sections.map((s, i) => this.block(s, `${path}.sections[${i}]`)).filter((b): b is BlockConfig => !!b);
    return id && title && PAGE_ID.test(id) && id !== MAIN_PAGE ? { id, title, blocks } : undefined;
  }
}

/** Check and normalize the card's YAML. Throws a `DashboardConfigError` listing every problem. */
export function parseDashboardConfig(value: unknown): DashboardConfig {
  const read = new Reader();
  if (!isRaw(value)) throw new DashboardConfigError(["the card config must be a map"]);
  read.keys(value, "", TOP_KEYS);

  let accent: Accent | undefined;
  if (typeof value.accent === "string") {
    accent = ACCENTS[value.accent];
    if (!accent) {
      const near = suggest(value.accent, Object.keys(ACCENTS));
      read.problem("accent", `must be one of ${oneOf(Object.keys(ACCENTS))}, or { chroma, hue }${near ? ` — did you mean "${near}"?` : ""}`);
    }
  } else if (isRaw(value.accent)) {
    read.keys(value.accent, "accent", ["chroma", "hue"]);
    const chroma = read.number(value.accent, "chroma", "accent", 0, 0.37, false);
    const hue = read.number(value.accent, "hue", "accent", 0, 360, false);
    if (chroma !== undefined && hue !== undefined) accent = { chroma, hue };
  } else if (value.accent != null) {
    read.problem("accent", `must be one of ${oneOf(Object.keys(ACCENTS))}, or { chroma, hue }`);
  }

  let blocks: BlockConfig[] | undefined;
  if (value.sections != null) {
    if (!Array.isArray(value.sections) || value.sections.length === 0) read.problem("sections", "must be a list of at least one section, or left out for the automatic layout");
    else blocks = value.sections.map((s, i) => read.block(s, `sections[${i}]`)).filter((b): b is BlockConfig => !!b);
  }

  let pages: PageConfig[] | undefined;
  if (value.pages != null) {
    if (!Array.isArray(value.pages) || value.pages.length === 0) read.problem("pages", "must be a list of at least one page, or left out");
    else {
      pages = value.pages.map((p, i) => read.page(p, `pages[${i}]`)).filter((p): p is PageConfig => !!p);
      const ids = pages.map((p) => p.id);
      for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) read.problem("pages", `two pages have the id "${id}"`);
    }
  }

  let nav: NavEntry[] | false | undefined;
  if (value.nav === false) nav = false;
  else if (value.nav != null) {
    if (!Array.isArray(value.nav)) read.problem("nav", "must be a list of destinations, or false for no nav");
    else {
      nav = value.nav.map((n, i) => read.navEntry(n, `nav[${i}]`)).filter((n): n is NavEntry => !!n);
      const pageIds = [MAIN_PAGE, ...(pages ?? []).map((p) => p.id)];
      // Automatic sections can't be named ahead; authored ones can.
      const titles = blocks ? sectionTitles(blocks) : undefined;
      nav.forEach((n, i) => {
        if (n.kind === "page" && !pageIds.includes(n.id)) {
          const near = suggest(n.id, pageIds);
          read.problem(`nav[${i}]`, `no page "${n.id}"${near ? ` — did you mean "${near}"?` : ` (pages: ${oneOf(pageIds)})`}`);
        }
        if (n.kind === "section" && titles && !titles.includes(n.title)) {
          const near = titles.find((t) => t.toLowerCase() === n.title.toLowerCase()) ?? suggest(n.title, titles);
          read.problem(`nav[${i}]`, `no section titled "${n.title}" in the top-level sections${near ? ` — did you mean "${near}"?` : ""}`);
        }
        if (n.kind === "section" && titles && titles.filter((t) => t === n.title).length > 1) {
          read.problem(`nav[${i}]`, `${titles.filter((t) => t === n.title).length} sections are titled "${n.title}"; give each its own title so the nav can tell them apart`);
        }
      });
    }
  }

  const config: DashboardConfig = {
    title: read.string(value, "title", "") ?? "Home",
    subtitle: read.string(value, "subtitle", ""),
    showTime: read.boolean(value, "show_time", "") ?? false,
    hourCycle: read.choice(value, "hour_cycle", "", ["h12", "h23"] as const),
    viewing: read.choice(value, "viewing", "", ["near", "far"] as const),
    theme: read.choice(value, "theme", "", ["home-assistant", "auto", "light", "dark"] as const) ?? "home-assistant",
    accent,
    blocks,
    nav,
    pages,
  };
  if (read.problems.length) throw new DashboardConfigError(read.problems);
  return config;
}
