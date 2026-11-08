import {
  BODY_KEYS,
  DashboardConfigError,
  LOVELACE_KEYS,
  PAGE_KEYS,
  PLACEMENT_KEYS,
  ROW_KEYS,
  Reader as YamlReader,
  isRaw,
  oneOf,
  suggest,
  cardKindOrder,
  readBody,
  readAlarmOptions,
  readCameraOptions,
  readCard,
  readNumericOptions,
  readOwletOptions,
  readSensorOptions,
  readUnit,
  readWeatherOptions,
  readCalendarOptions,
  rowTitles,
} from "@dashhaus/core/lovelace/schema";
import type { CardKindSpec, CardReadSchema, LayoutSchema, Raw, RowConfig } from "@dashhaus/core/lovelace/schema";
import type { CardFootprint } from "../shared/ui";
import type { ToggleIcon } from "@dashhaus/core/entities/toggle/types";
import type { AlarmTileProps } from "../cards/alarm/AlarmTile";
import type { OwletAlert } from "@dashhaus/core/entities/owlet/types";
import { GUEST_WIFI_ACTION_DOMAINS, OWLET_ALERT_SUFFIX } from "@dashhaus/core";
import type { NavEntry } from "@dashhaus/core/lovelace";

/*
 * The card's YAML, as Lovelace hands it over (already parsed), checked and normalized. Every mistake is
 * collected with its path and, for a misspelt key, the key that was probably meant, so the YAML editor shows
 * all of them at once instead of the first. The reading itself is the shared card schema and layout
 * (`@dashhaus/core/lovelace/schema`: `cards`, or `rows` of cards); this file is the card's kind table and the bundles only
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
  | "guestWifi"
  | "binarySensor"
  | "camera"
  | "mediaPlayer"
  | "numeric"
  | "vacuum"
  | "calendar"
  | "sun"
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
  binary_sensor: "binarySensor",
  camera: "camera",
  media_player: "mediaPlayer",
  vacuum: "vacuum",
  calendar: "calendar",
  sun: "sun",
  // new-card: domain kinds
};

/**
 * Cards that share a domain with that domain's own card. A card picks one with `card:`; an entity id matching `id`
 * picks it without.
 */
export const SHARED_KINDS: Partial<Record<Kind, { domains: string[]; id?: RegExp }>> = {
  owlet: { domains: ["sensor"], id: /^sensor\.\w+_sleep_state$/ },
  sound: { domains: ["switch"] },
  guestWifi: { domains: ["sensor", "input_text", "text"], id: /^sensor\.\w+_voucher$/ },
  numeric: { domains: ["sensor"] },
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
  /** Nothing chose its card but its domain (`CardShape.bare`): a bare `sensor.*` may draw the numeric card. */
  bare?: true;
}

export type CardConfig = CardBase & (
  | { kind: "light" }
  | { kind: "climate"; unit?: "°C" | "°F" }
  | { kind: "sensor"; humidity?: string; battery?: string; outdoor?: boolean; unit?: "°C" | "°F" }
  | { kind: "weather"; aqi?: string; aqiScale?: "US"; sun?: string; forecasts: boolean }
  | { kind: "cover" }
  | { kind: "toggle"; icon?: ToggleIcon; description?: string }
  | { kind: "alarm"; readOnly?: AlarmTileProps["readOnly"]; exitDelay?: number; entryDelay?: number; openSensors?: string[] }
  | { kind: "owlet"; heartRate?: string; oxygen?: string; charging?: string; baseStation?: string; alerts?: Partial<Record<OwletAlert, string>>; staleAfter?: number }
  | { kind: "humidifier" }
  | { kind: "sound"; volume?: string }
  | { kind: "lock"; battery?: string }
  | { kind: "fan" }
  | { kind: "guestWifi"; access?: "code" | "password"; network?: string; qr?: string; newCode?: string; refresh?: string }
  | { kind: "binarySensor"; battery?: string }
  | { kind: "camera"; still?: boolean; refresh?: number }
  | { kind: "mediaPlayer" }
  | { kind: "numeric"; unit?: string; warnAbove?: number; warnBelow?: number }
  | { kind: "vacuum" }
  | { kind: "calendar"; calendars?: string[]; days?: number; events: boolean }
  | { kind: "sun" }
  // new-card: card configs
);

/** Several cards drawn as one outer card (spec/orb.md → Bundles), placed in its row as one. */
export type BundleConfig =
  | { kind: "joined"; label?: string; members: CardConfig[] }
  | { kind: "lead"; label?: string; sheetTitle?: string; lead: CardConfig; rows: CardConfig[] }
  | { kind: "titled"; title: string; area?: string; rows: CardConfig[] };

/** One entry of a row's `cards`: a card, or a bundle. */
export type ItemConfig = CardConfig | BundleConfig;

/** A row of the card's layout: its heading, its grid and its cards (`@dashhaus/core/lovelace/schema` → `readBody`). */
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
  /** False: no camera still is fetched or drawn on this dashboard, for privacy or cost (YAML `stills: false`). */
  stills: boolean;
  /** Nothing on the page changes by itself: a camera's still loads when seen and when the panel wakes, never on a timer. */
  quiet: boolean;
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

const COMMON_KEYS = ["entity", "card", "name", "area", "footprint", ...PLACEMENT_KEYS, "show_control", "history"];
/** The most columns a row may have. */
const MAX_COLUMNS = 12;

/** Each kind's own YAML keys and settings: the shared schema reads the rest. */
const KIND_SPECS: Record<Kind, Omit<CardKindSpec, "domains" | "id">> = {
  light: {},
  climate: {
    keys: ["unit"],
    options: (read, raw, at) => ({ unit: readUnit(read, raw, at) }),
  },
  sensor: {
    keys: ["humidity", "battery", "outdoor", "unit"],
    options: (read, raw, at) => ({ ...readSensorOptions(read, raw, at), unit: readUnit(read, raw, at) }),
  },
  weather: {
    keys: ["aqi", "aqi_scale", "sun", "forecasts"],
    options: readWeatherOptions,
  },
  cover: {},
  toggle: {
    keys: ["icon", "description"],
    options: (read, raw, at) => ({
      icon: read.choice(raw, "icon", at, TOGGLE_ICONS),
      description: read.string(raw, "description", at),
    }),
  },
  alarm: {
    keys: ["read_only", "exit_delay", "entry_delay", "open_sensors"],
    options: readAlarmOptions,
  },
  owlet: {
    keys: ["heart_rate", "oxygen", "charging", "base_station", "alerts", "stale_after"],
    options: (read, raw, at) => readOwletOptions(read, raw, at, OWLET_ALERTS),
  },
  humidifier: {},
  sound: {
    keys: ["volume"],
    options: (read, raw, at) => ({ volume: read.optionalEntity(raw, "volume", at, ["number"]) }),
  },
  lock: {
    keys: ["battery"],
    options: (read, raw, at) => ({ battery: read.optionalEntity(raw, "battery", at, ["sensor"]) }),
  },
  fan: {},
  guestWifi: {
    keys: ["access", "network", "qr", "new_code", "refresh"],
    options: (read, raw, at) => ({
      access: read.choice(raw, "access", at, ["code", "password"] as const),
      network: read.string(raw, "network", at),
      qr: read.optionalEntity(raw, "qr", at, ["image"]),
      newCode: read.optionalEntity(raw, "new_code", at, GUEST_WIFI_ACTION_DOMAINS),
      refresh: read.optionalEntity(raw, "refresh", at, GUEST_WIFI_ACTION_DOMAINS),
    }),
  },
  binarySensor: {
    keys: ["battery"],
    options: (read, raw, at) => ({ battery: read.optionalEntity(raw, "battery", at, ["sensor"]) }),
  },
  camera: { keys: ["still", "refresh"], options: readCameraOptions },
  mediaPlayer: {},
  numeric: { keys: ["unit", "warn_above", "warn_below"], options: readNumericOptions },
  vacuum: {},
  calendar: {
    keys: ["calendars", "days", "events"],
    options: readCalendarOptions,
  },
  sun: {},
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

/** Keys a card once took and no longer does, each with what to write instead, said in place of "did you mean". */
const RETIRED_KEYS: Record<string, string> = {
  color: "\"color\" is gone: a card has no colour of its own, and the dashboard's \"accent\" sets the one colour every card is on in",
};

const CARD_SCHEMA: CardReadSchema<Kind, CardConfig> = {
  noun: "card",
  common: COMMON_KEYS,
  order: KIND_ORDER,
  kinds: KINDS,
  stopOnInvalidCard: true,
  checkKeys: (read, raw, at, allowed) => {
    for (const key of Object.keys(RETIRED_KEYS)) if (key in raw) read.problem(at, RETIRED_KEYS[key]);
    read.keys(raw, at, [...allowed, ...Object.keys(RETIRED_KEYS)]);
  },
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

const TOP_KEYS = ["type", "title", "subtitle", "show_time", "hour_cycle", "viewing", "theme", "accent", "stills", "quiet", ...BODY_KEYS, "nav", "pages", "view_layout", "grid_options", "visibility"];
const BUNDLES = ["joined", "lead", "titled"] as const;
type BundleKind = (typeof BUNDLES)[number];
/** Each bundle's keys, and the fewest cards it takes. */
const BUNDLE_SPECS: Record<BundleKind, { keys: string[]; fewest: number; what: string }> = {
  joined: { keys: ["bundle", "label", "cards", ...PLACEMENT_KEYS], fewest: 2, what: "a joined bundle shares one card between two or more compact cards" },
  lead: { keys: ["bundle", "label", "sheet_title", "cards", ...PLACEMENT_KEYS], fewest: 2, what: "a lead bundle is its first card, standard, then one or more compact rows" },
  titled: { keys: ["bundle", "title", "area", "cards", ...PLACEMENT_KEYS], fewest: 1, what: "a titled bundle is a lid naming one thing, then its parts" },
};

/**
 * Every key this card's YAML takes, by where it goes, for the site's YAML guide: the lists the reader checks, less the
 * keys Home Assistant reads itself and the ones read only to say what to write instead.
 */
export const YAML_KEYS = {
  card: TOP_KEYS.filter((key) => !BODY_KEYS.includes(key) && !LOVELACE_KEYS.includes(key)),
  page: PAGE_KEYS,
  maxColumns: MAX_COLUMNS,
  row: ROW_KEYS,
  anyCard: COMMON_KEYS,
  kinds: Object.fromEntries((Object.keys(KIND_SPECS) as Kind[]).map((kind) => [kind, KIND_SPECS[kind].keys ?? []])) as Record<Kind, readonly string[]>,
  bundles: BUNDLE_SPECS as Record<string, { keys: readonly string[] }>,
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
    else for (const key of ["chroma", "hue"]) if (value.accent[key] === undefined) read.problem(`accent.${key}`, "is required with the other");
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
    stills: read.boolean(value, "stills", "") ?? true,
    quiet: read.boolean(value, "quiet", "") ?? false,
  };
  if (read.problems.length) throw new DashboardConfigError(read.problems);
  return config;
}
