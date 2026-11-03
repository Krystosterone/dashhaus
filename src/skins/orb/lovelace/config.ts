import {
  BODY_KEYS,
  DashboardConfigError,
  PLACEMENT_KEYS,
  Reader as YamlReader,
  isRaw,
  oneOf,
  suggest,
  cardKindOrder,
  readBody,
  readAlarmOptions,
  readCard,
  readColor,
  readOwletOptions,
  readSensorOptions,
  readUnit,
  readWeatherOptions,
  rowTitles,
} from "@dashhaus/dashboard/schema";
import type { CardKindSpec, CardReadSchema, LayoutSchema, Raw, RowConfig } from "@dashhaus/dashboard/schema";
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
 * all of them at once instead of the first. The reading itself is the shared card schema and layout
 * (`@dashhaus/dashboard/schema`: `cards`, or `rows` of cards); this file is the card's kind table and the bundles only
 * orb has.
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
  | "lock"
  | "fan"
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
  lock: "lock",
  fan: "fan",
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
  | { kind: "lock"; battery?: string; color?: ColorName | "none" }
  | { kind: "fan"; color?: ColorName | "none" }
  // new-card: card configs
);

/** Several cards drawn as one outer card (spec/orb.md → Bundles), placed in its row as one. */
export type BundleConfig =
  | { kind: "joined"; label?: string; members: CardConfig[] }
  | { kind: "lead"; label?: string; sheetTitle?: string; lead: CardConfig; rows: CardConfig[] }
  | { kind: "titled"; title: string; area?: string; rows: CardConfig[] };

/** One entry of a row's `cards`: a card, or a bundle. */
export type ItemConfig = CardConfig | BundleConfig;

/** A row of the card's layout: its heading, its grid and its cards (`@dashhaus/dashboard/schema` → `readBody`). */
export type RowLayoutConfig = RowConfig<ItemConfig>;

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
  /** The main page's rows (its `cards` are one untitled row). Absent: lay the house out automatically. */
  rows?: RowLayoutConfig[];
  /** The bottom nav's destinations; absent: the pages, or else the titled rows; false: no nav. */
  nav?: NavEntry[] | false;
  /** More pages in this card, opened from the nav; the top-level layout is the main page, `home`. */
  pages?: PageConfig[];
}

/** A page of the card's own: its id (for `page:` in the nav and the URL hash), its title, its rows. */
export interface PageConfig { id: string; title: string; rows: RowLayoutConfig[] }

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

const COMMON_KEYS = ["entity", "card", "name", "area", "footprint", ...PLACEMENT_KEYS, "show_control", "history"];
/** The most columns a row may have. */
const MAX_COLUMNS = 12;

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
  lock: {
    keys: ["battery", "color"],
    options: (read, raw, at) => ({ battery: read.optionalEntity(raw, "battery", at, ["sensor"]), color: readColor(read, raw, at, COLOR_NAMES) }),
  },
  fan: { keys: ["color"], options: (read, raw, at) => ({ color: readColor(read, raw, at, COLOR_NAMES) }) },
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
    showControl: read.boolean(raw, "show_control", at),
    history: read.boolean(raw, "history", at) ?? true,
  }),
  missing: () => "a card needs an \"entity\"",
  noKind: (entity, domain) => `${entity}: ${domain}.* entities have no card yet (supported: ${Object.keys(DOMAIN_KIND).join(", ")})`,
};

const TOP_KEYS = ["type", "title", "subtitle", "show_time", "hour_cycle", "viewing", "theme", "accent", ...BODY_KEYS, "nav", "pages", "view_layout", "grid_options", "visibility"];
const BUNDLES = ["joined", "lead", "titled"] as const;
type BundleKind = (typeof BUNDLES)[number];
/** Each bundle's keys, and the fewest cards it takes. */
const BUNDLE_SPECS: Record<BundleKind, { keys: string[]; fewest: number; what: string }> = {
  joined: { keys: ["bundle", "label", "cards", ...PLACEMENT_KEYS], fewest: 2, what: "a joined bundle shares one card between two or more compact cards" },
  lead: { keys: ["bundle", "label", "sheet_title", "cards", ...PLACEMENT_KEYS], fewest: 2, what: "a lead bundle is its first card, standard, then one or more compact rows" },
  titled: { keys: ["bundle", "title", "area", "cards", ...PLACEMENT_KEYS], fewest: 1, what: "a titled bundle is a lid naming one thing, then its parts" },
};

export { DashboardConfigError, suggest };

class Reader extends YamlReader {
  /** The shared layout, with orb's cards and bundles and its twelve columns. */
  readonly layout: LayoutSchema<ItemConfig> = { noun: "card", maxColumns: MAX_COLUMNS, item: (_read, value, path) => this.item(value, path) };

  card(value: unknown, path: string): CardConfig | undefined {
    return readCard(this, CARD_SCHEMA, value, path);
  }

  /** A bundle's cards: the bundle places them and sets their footprints, so they take neither. */
  members(value: unknown, path: string, spec: (typeof BUNDLE_SPECS)[BundleKind]): CardConfig[] {
    if (!Array.isArray(value) || value.length < spec.fewest) {
      this.problem(path, `${spec.what}: list ${spec.fewest === 1 ? "at least one card" : `at least ${spec.fewest} cards`}`);
      if (!Array.isArray(value)) return [];
    }
    return (value as unknown[]).flatMap((member, i) => {
      const at = `${path}[${i}]`;
      if (isRaw(member)) {
        const named = typeof member.entity === "string" ? `${at} (${member.entity})` : at;
        if ("bundle" in member) {
          this.problem(at, "bundles don't nest: put this bundle beside the other in the row's \"cards\"");
          return [];
        }
        const own = ["footprint", ...PLACEMENT_KEYS].filter((key) => key in member);
        for (const key of own) {
          this.problem(named, key === "footprint"
            ? "\"footprint\" is the bundle's to set: every card in it is compact (a lead bundle's first card, standard)"
            : `"${key}" places the whole bundle: put it on the bundle, beside "bundle"`);
        }
        const rest: Raw = Object.fromEntries(Object.entries(member).filter(([key]) => !own.includes(key)));
        const card = this.card(rest, at);
        return card ? [card] : [];
      }
      const card = this.card(member, at);
      return card ? [card] : [];
    });
  }

  item(value: unknown, path: string): ItemConfig | undefined {
    if (isRaw(value) && !("entity" in value) && ("cards" in value || "joined" in value || "lead" in value || "rows" in value)) {
      if (!("bundle" in value)) {
        this.problem(path, "a map of \"cards\" in a row is a bundle: say which with \"bundle\": joined, lead or titled");
        return undefined;
      }
    }
    if (!isRaw(value) || !("bundle" in value)) return this.card(value, path);
    const kind = this.choice(value, "bundle", path, BUNDLES);
    if (!kind) return undefined;
    const spec = BUNDLE_SPECS[kind];
    this.keys(value, path, spec.keys);
    const cards = this.members(value.cards, `${path}.cards`, spec);
    if (kind === "joined") return { kind, label: this.string(value, "label", path), members: cards };
    if (kind === "lead") {
      const [lead, ...rows] = cards;
      return lead && { kind, label: this.string(value, "label", path), sheetTitle: this.string(value, "sheet_title", path), lead, rows };
    }
    const title = this.string(value, "title", path);
    if (!title) {
      this.problem(path, "a titled bundle needs a \"title\" naming what its cards make up, like Sound machine");
      return undefined;
    }
    return { kind, title, area: this.string(value, "area", path), rows: cards };
  }

  body(raw: Raw, path = ""): RowLayoutConfig[] | undefined {
    return readBody(this, this.layout, raw, path);
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

  const rows = read.body(value);
  const pages: PageConfig[] | undefined = read.pages(value, (raw, path) => read.body(raw, path))?.map(({ id, title, body }) => ({ id, title, rows: body }));
  // An automatic layout's rows can't be named ahead; authored ones can.
  const nav = read.nav(value, pages ?? [], rows ? rowTitles(rows) : undefined);

  const config: DashboardConfig = {
    title: read.string(value, "title", "") ?? "Home",
    subtitle: read.string(value, "subtitle", ""),
    showTime: read.boolean(value, "show_time", "") ?? false,
    hourCycle: read.choice(value, "hour_cycle", "", ["h12", "h23"] as const),
    viewing: read.choice(value, "viewing", "", ["near", "far"] as const),
    theme: read.choice(value, "theme", "", ["home-assistant", "auto", "light", "dark"] as const) ?? "home-assistant",
    accent,
    rows,
    nav,
    pages,
  };
  if (read.problems.length) throw new DashboardConfigError(read.problems);
  return config;
}
