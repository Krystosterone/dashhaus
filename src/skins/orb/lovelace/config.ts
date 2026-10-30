import {
  DashboardConfigError,
  Reader as YamlReader,
  isRaw,
  oneOf,
  suggest,
  cardKindOrder,
  readAlarmOptions,
  readCard,
  readCards,
  readColor,
  readOwletOptions,
  readSensorOptions,
  readUnit,
  readWeatherOptions,
} from "@dashhaus/dashboard/schema";
import type { CardKindSpec, CardReadSchema } from "@dashhaus/dashboard/schema";
import { COLORS } from "../shared/ui";
import type { ColorName, CardFootprint } from "../shared/ui";
import type { ToggleIcon } from "@dashhaus/core/entities/toggle/types";
import type { AlarmTileProps } from "../cards/alarm/AlarmTile";
import type { OwletAlert } from "@dashhaus/core/entities/owlet/types";
import { OWLET_ALERT_SUFFIX } from "@dashhaus/core";
import type { NavEntry } from "@dashhaus/dashboard";

/*
 * The card's YAML, as Lovelace hands it over (already parsed), checked and normalized. Every mistake is
 * collected with its path and, for a misspelt key, the key that was probably meant, so the YAML editor shows
 * all of them at once instead of the first. The reading itself is the shared card schema (`@dashhaus/dashboard/schema`);
 * this file is the card's kind table and the bundles only orb has.
 */

export type Kind =
  | "light"
  | "climate"
  | "sensor"
  | "weather"
  | "cover"
  | "toggle"
  | "alarm"
  | "owlet"
  | "humidifier"
  | "sound"
  // new-card: kinds
  ;

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
  // new-card: domain kinds
};

/**
 * Cards that share a domain with that domain's own card. A card picks one with `card:`; an entity id matching `id`
 * picks it without.
 */
export const SHARED_KINDS: Partial<Record<Kind, { domains: string[]; id?: RegExp }>> = {
  owlet: { domains: ["sensor"], id: /^sensor\.\w+_sleep_state$/ },
  sound: { domains: ["switch"] },
  // new-card: shared kinds
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
  // new-card: card configs
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

/** Each kind's own YAML keys and settings: the shared schema reads the rest. */
const KIND_SPECS: Record<Kind, Omit<CardKindSpec, "domains" | "id">> = {
  light: {
    keys: ["color"],
    options: (read, raw, at) => ({ color: readColor(read, raw, at, COLOR_NAMES) }),
  },
  climate: {
    keys: ["unit", "color"],
    options: (read, raw, at) => ({ unit: readUnit(read, raw, at), color: readColor(read, raw, at, COLOR_NAMES) }),
  },
  sensor: {
    keys: ["humidity", "battery", "outdoor", "unit", "color"],
    options: (read, raw, at) => ({ ...readSensorOptions(read, raw, at), unit: readUnit(read, raw, at), color: readColor(read, raw, at, COLOR_NAMES) }),
  },
  weather: {
    keys: ["aqi", "aqi_scale", "sun", "forecasts"],
    options: readWeatherOptions,
  },
  cover: {
    keys: ["color"],
    options: (read, raw, at) => ({ color: readColor(read, raw, at, COLOR_NAMES) }),
  },
  toggle: {
    keys: ["icon", "color", "description"],
    options: (read, raw, at) => ({
      icon: read.choice(raw, "icon", at, TOGGLE_ICONS),
      color: read.choice(raw, "color", at, COLOR_NAMES),
      description: read.string(raw, "description", at),
    }),
  },
  alarm: {
    keys: ["read_only", "exit_delay", "entry_delay", "open_sensors"],
    options: readAlarmOptions,
  },
  owlet: {
    keys: ["heart_rate", "oxygen", "charging", "base_station", "alerts", "stale_after", "color"],
    options: (read, raw, at) => ({ ...readOwletOptions(read, raw, at, OWLET_ALERTS), color: readColor(read, raw, at, COLOR_NAMES) }),
  },
  humidifier: {
    keys: ["color"],
    options: (read, raw, at) => ({ color: readColor(read, raw, at, COLOR_NAMES) }),
  },
  sound: {
    keys: ["volume", "color"],
    options: (read, raw, at) => ({ volume: read.optionalEntity(raw, "volume", at, ["number"]), color: readColor(read, raw, at, COLOR_NAMES) }),
  },
  // new-card: kind specs
};

/** The kinds an entity id tries: its domain's own, then the cards that share that domain. */
const KIND_ORDER = cardKindOrder(DOMAIN_KIND, SHARED_KINDS);

/** The kind table with each kind's domains and id pattern, read from the two tables above. */
const KINDS = (Object.keys(KIND_SPECS) as Kind[]).reduce((table, kind) => {
  table[kind] = {
    ...KIND_SPECS[kind],
    domains: [...Object.keys(DOMAIN_KIND).filter((domain) => DOMAIN_KIND[domain] === kind), ...(SHARED_KINDS[kind]?.domains ?? [])],
    id: SHARED_KINDS[kind]?.id,
  };
  return table;
}, {} as Record<Kind, CardKindSpec>);

const CARD_SCHEMA: CardReadSchema<Kind, CardConfig> = {
  noun: "card",
  common: COMMON_KEYS,
  order: KIND_ORDER,
  kinds: KINDS,
  stopOnInvalidCard: true,
  base: (read, raw, at) => ({
    name: read.string(raw, "name", at),
    area: read.string(raw, "area", at),
    footprint: read.choice(raw, "footprint", at, FOOTPRINTS),
    span: read.number(raw, "span", at, 1, 12) ?? 1,
    showControl: read.boolean(raw, "show_control", at),
    history: read.boolean(raw, "history", at) ?? true,
  }),
  missing: (raw) => `a card needs an "entity"${raw.joined || raw.lead ? " (bundles use \"joined\", \"lead\" or \"title\" with \"rows\" at the section's card level)" : ""}`,
  noKind: (entity, domain) => `${entity}: ${domain}.* entities have no card yet (supported: ${Object.keys(DOMAIN_KIND).join(", ")})`,
};

const TOP_KEYS = ["type", "title", "subtitle", "show_time", "hour_cycle", "viewing", "theme", "accent", "sections", "nav", "pages", "view_layout", "grid_options", "visibility"];
const SECTION_KEYS = ["title", "note", "columns", "gap", "cards"];
const GROUP_KEYS = ["columns", "gap", "sections"];

export { DashboardConfigError, suggest };

class Reader extends YamlReader {
  card(value: unknown, path: string): CardConfig | undefined {
    return readCard(this, CARD_SCHEMA, value, path);
  }

  cards(value: unknown, path: string): CardConfig[] {
    return readCards(this, CARD_SCHEMA, value, path);
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

  const pages: PageConfig[] | undefined = read.pages(value, (s, path) => read.block(s, path));
  // Automatic sections can't be named ahead; authored ones can.
  const nav = read.nav(value, pages ?? [], blocks ? sectionTitles(blocks) : undefined);

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
