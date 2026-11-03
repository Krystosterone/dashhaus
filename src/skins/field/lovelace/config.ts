import {
  BODY_KEYS,
  DashboardConfigError,
  PLACEMENT_KEYS,
  Reader,
  isRaw,
  cardKinds,
  readBody,
  readAlarmOptions,
  readCard,
  readOwletOptions,
  readSensorOptions,
  readUnit,
  readWeatherOptions,
  rowTitles,
} from "@dashhaus/dashboard/schema";
import type { CardKindSpec, CardReadSchema, LayoutSchema, Raw, RowConfig } from "@dashhaus/dashboard/schema";
import type { NavEntry } from "@dashhaus/dashboard";
import type { ToggleIcon } from "@dashhaus/core/entities/toggle/types";
import type { OwletAlert } from "@dashhaus/core/entities/owlet/types";
import { OWLET_ALERT_SUFFIX } from "@dashhaus/core";
import type { FieldFootprint } from "../shared/ui";

/*
 * The field card's YAML (spec/deploy.md → The field dashboard), checked with the reader every card shares, so
 * every mistake shows at once with its path, and laid out with the layout every card shares (`cards`, or `rows` of
 * cards), its footprints mixed by column. Field draws lights, climate entities, humidifiers, room sensors, the
 * weather, modes, sound machines, covers, alarms and Owlet socks. The reading itself is the shared card schema
 * (`@dashhaus/dashboard/schema`); this file is the field card's kind table and the words it refuses.
 */

export type FinishSetting = "home-assistant" | "auto" | "alloy" | "black";

export interface ModuleConfig {
  entity: string;
  /** The card that draws it: from `card:`, else the entity id (`kindOf`). */
  kind: FieldKind;
  name?: string;
  /** Overrides the area Home Assistant's registries give it; the automatic layout groups modules by area. */
  area?: string;
  footprint?: FieldFootprint;
  /** False skips the Today history read. */
  history?: boolean;
  /** A climate entity's or a sensor's temperatures in this unit, whatever Home Assistant's is. */
  unit?: "°C" | "°F";
  /** A sensor's companions on the same device, and whether it is outside (no comfort reading); a lock's battery. */
  humidity?: string;
  battery?: string;
  outdoor?: boolean;
  /** A weather's air-quality sensor and its scale, its sun entity (default `sun.sun`), and whether to read forecasts. */
  aqi?: string;
  aqiScale?: "US";
  sun?: string;
  forecasts?: boolean;
  /** A toggle's glyph, and one line on what it does for its panel. */
  icon?: ToggleIcon;
  description?: string;
  /** A sound's volume `number.*`, when it isn't named after the switch or its device. */
  volume?: string;
  /** An alarm drawn without its keys; its exit and entry delays in seconds; the names of doors and windows open. */
  readOnly?: boolean;
  exitDelay?: number;
  entryDelay?: number;
  openSensors?: string[];
  /**
   * An Owlet sock's companions, when they aren't named after its sleep state sensor: its heart rate and oxygen
   * sensors, charging sensor, base station switch and alert sensors; and the minutes before it warns that readings
   * stopped.
   */
  heartRate?: string;
  oxygen?: string;
  charging?: string;
  baseStation?: string;
  alerts?: Partial<Record<OwletAlert, string>>;
  staleAfter?: number;
}

/** A row of the page: its legend, its grid (or column stacks, for mixed footprints) and its modules. */
export type FieldRow = RowConfig<ModuleConfig>;

/** A page of the card's own: its id (for `page:` in the nav and the URL hash), its title, its rows. */
export interface PageConfig { id: string; title: string; rows: FieldRow[] }

export interface FieldConfig {
  title?: string;
  /** Replaces the date under the title on the main page. */
  subtitle?: string;
  /** A clock in the header. */
  showTime: boolean;
  /** The clock's 12 or 24 hours; the locale's when left out. */
  hourCycle?: "h12" | "h23";
  /** "home-assistant" follows Home Assistant's dark mode; "auto", the device's. */
  finish: FinishSetting;
  /** "far": a wall panel read from across the room; print and screen are set a step up. */
  viewing?: "near" | "far";
  /** Every module's footprint unless it sets its own. */
  footprint: FieldFootprint;
  /** An alarm holds its inverted screen from the start, with no flash: a panel in a nursery at night. */
  quiet: boolean;
  /**
   * The main page's rows (its `cards` are one untitled row). Absent: every supported light, climate, weather,
   * humidifier, cover, alarm, input_boolean and switch entity, Owlet sock and room sensor, a row per area.
   */
  rows?: FieldRow[];
  /** More pages in this card, opened from the nav; the main page is `home`. */
  pages?: PageConfig[];
  /** The bottom nav's destinations; absent: the pages, or else the main page's titled rows; false: no nav. */
  nav?: NavEntry[] | false;
}

/** Field's cards, by the name they share with their domain model (`packages/core/src/entities/<kind>/`). */
export type FieldKind =
  | "light"
  | "climate"
  | "sensor"
  | "weather"
  | "toggle"
  | "humidifier"
  | "sound"
  | "cover"
  | "alarm"
  | "owlet"
  | "lock"
  | "fan"
  // new-card: kinds
  ;

interface KindSpec {
  /** The Home Assistant domains it draws. */
  domains: readonly string[];
  /** Picks this card on a domain another card also draws, without `card:`. */
  id?: RegExp;
}

/**
 * Each field card and the Home Assistant domains it draws. On a domain two cards draw, the first without an `id` is
 * the domain's own (a switch is a toggle; a sound is picked with `card: sound`, as on the main card); the other is
 * picked with `card:`, or by its `id`. A new card adds itself here and to `LIVE`
 * (FieldDashboard.tsx).
 */
export const FIELD_KINDS: Record<FieldKind, KindSpec> = {
  light: { domains: ["light"] },
  climate: { domains: ["climate"] },
  sensor: { domains: ["sensor"] },
  weather: { domains: ["weather"] },
  toggle: { domains: ["input_boolean", "switch"] },
  humidifier: { domains: ["humidifier"] },
  sound: { domains: ["switch"] },
  cover: { domains: ["cover"] },
  alarm: { domains: ["alarm_control_panel"] },
  owlet: { domains: ["sensor"], id: /^sensor\.\w+_sleep_state$/ },
  lock: { domains: ["lock"] },
  fan: { domains: ["fan"] },
  // new-card: field kinds
};

const FINISHES: readonly FinishSetting[] = ["home-assistant", "auto", "alloy", "black"];
const FOOTPRINTS: readonly FieldFootprint[] = ["standard", "compact"];
const TOP_KEYS = ["type", "title", "subtitle", "show_time", "hour_cycle", "viewing", "finish", "footprint", "quiet", ...BODY_KEYS, "pages", "nav", "view_layout", "grid_options", "visibility"];
const MODULE_KEYS = ["entity", "card", "name", "area", "footprint", ...PLACEMENT_KEYS, "history"];
/** A field page is at most 1240 px wide: four modules across. */
const MAX_ACROSS = 4;
/** Keys only one card takes. */
const KIND_KEYS: Partial<Record<FieldKind, readonly string[]>> = { climate: ["unit"], sensor: ["humidity", "battery", "outdoor", "unit"], weather: ["aqi", "aqi_scale", "sun", "forecasts"], toggle: ["icon", "description"], sound: ["volume"], alarm: ["read_only", "exit_delay", "entry_delay", "open_sensors"], owlet: ["heart_rate", "oxygen", "charging", "base_station", "alerts", "stale_after"], lock: ["battery"] };
const OWLET_ALERTS = Object.keys(OWLET_ALERT_SUFFIX) as OwletAlert[];
const TOGGLE_ICONS: readonly ToggleIcon[] = ["bell-off", "moon", "volume-off", "guest", "away", "power", "waves"];

/** Each kind's own settings: the shared schema reads the rest. */
const KIND_OPTIONS: Partial<Record<FieldKind, (read: Reader, raw: Raw, at: string) => Record<string, unknown>>> = {
  climate: (read, raw, at) => ({ unit: readUnit(read, raw, at) }),
  sensor: (read, raw, at) => ({ unit: readUnit(read, raw, at), ...readSensorOptions(read, raw, at) }),
  weather: readWeatherOptions,
  toggle: (read, raw, at) => ({ icon: read.choice(raw, "icon", at, TOGGLE_ICONS), description: read.string(raw, "description", at) }),
  sound: (read, raw, at) => ({ volume: read.optionalEntity(raw, "volume", at, ["number"]) }),
  alarm: readAlarmOptions,
  owlet: (read, raw, at) => readOwletOptions(read, raw, at, OWLET_ALERTS),
  lock: (read, raw, at) => ({ battery: read.optionalEntity(raw, "battery", at, ["sensor"]) }),
};

/** Field's kind table: the domains above, plus the keys and options each card takes. */
const KINDS = (Object.keys(FIELD_KINDS) as FieldKind[]).reduce((table, kind) => {
  table[kind] = { ...FIELD_KINDS[kind], keys: KIND_KEYS[kind], options: KIND_OPTIONS[kind] };
  return table;
}, {} as Record<FieldKind, CardKindSpec>);

const TABLE = cardKinds(KINDS);

/** Every domain a field card draws. */
export const FIELD_DOMAINS: readonly string[] = TABLE.domains;

/** The card an entity gets without `card:`: one whose `id` matches it, else its domain's own; none outside Field's domains. */
export function kindOf(entity: string): FieldKind | undefined {
  return TABLE.kindOf(entity);
}

/**
 * The main card's keys that field leaves out, and why, for YAML copied from it: said in place of an unknown key's
 * "did you mean".
 */
const ORB_ONLY = {
  top: {
    theme: "field's finish is \"finish\": home-assistant, auto, alloy or black",
    accent: "field has no accent: colour names a parameter (spec/field.md)",
  },
  module: {
    color: "field keeps colour for what a control sets (spec/field.md)",
    show_control: "a field row shows its screen in place of a control",
  },
} satisfies Record<string, Record<string, string>>;

/** Unknown keys, with the reason for one that only the main card takes. */
function fieldKeys(read: Reader, raw: Raw, path: string, allowed: readonly string[], orbOnly: Record<string, string>) {
  for (const key of Object.keys(raw)) if (key in orbOnly && !allowed.includes(key)) read.problem(path, `"${key}" is the main card's: ${orbOnly[key]}`);
  read.keys(raw, path, [...allowed, ...Object.keys(orbOnly)]);
}

const MODULE_SCHEMA: CardReadSchema<FieldKind, ModuleConfig> = {
  noun: "module",
  common: MODULE_KEYS,
  domains: FIELD_DOMAINS,
  kinds: KINDS,
  base: (read, raw, at) => ({
    name: read.string(raw, "name", at),
    area: read.string(raw, "area", at),
    footprint: read.choice(raw, "footprint", at, FOOTPRINTS),
    history: read.boolean(raw, "history", at),
  }),
  before: (read, raw, path) => {
    if ("bundle" in raw || "cards" in raw) {
      read.problem(path, "bundles are the main card's: list each module on its own");
      return false;
    }
    return true;
  },
  checkKeys: (read, raw, at, allowed) => fieldKeys(read, raw, at, allowed, ORB_ONLY.module),
};

class FieldReader extends Reader {
  /** The shared layout with field's modules: at most four across, footprints mixed by column. */
  readonly layout: LayoutSchema<ModuleConfig>;

  constructor(footprint: () => FieldFootprint) {
    super();
    this.layout = {
      noun: "module",
      maxColumns: MAX_ACROSS,
      item: (_read, value, path) => this.module(value, path),
      footprints: { mix: "stacks", of: (module) => module.footprint ?? footprint() },
    };
  }

  module(value: unknown, path: string): ModuleConfig | undefined {
    return readCard(this, MODULE_SCHEMA, value, path);
  }

  body(raw: Raw, path = ""): FieldRow[] | undefined {
    return readBody(this, this.layout, raw, path);
  }
}

/** Check and normalize the card's YAML; throws a DashboardConfigError listing every problem. */
export function parseFieldConfig(raw: unknown): FieldConfig {
  let footprint: FieldFootprint = "standard";
  const read = new FieldReader(() => footprint);
  const top: Raw = isRaw(raw) ? raw : {};
  if (raw != null && !isRaw(raw)) read.problem("", "the card's config must be a map");
  fieldKeys(read, top, "", TOP_KEYS, ORB_ONLY.top);
  footprint = read.choice(top, "footprint", "", FOOTPRINTS) ?? "standard";
  const config: FieldConfig = {
    title: read.string(top, "title", ""),
    subtitle: read.string(top, "subtitle", ""),
    showTime: read.boolean(top, "show_time", "") ?? false,
    hourCycle: read.choice(top, "hour_cycle", "", ["h12", "h23"] as const),
    viewing: read.choice(top, "viewing", "", ["near", "far"] as const),
    finish: read.choice(top, "finish", "", FINISHES) ?? "home-assistant",
    footprint,
    quiet: read.boolean(top, "quiet", "") ?? false,
  };
  config.rows = read.body(top);
  config.pages = read.pages(top, (body, path) => read.body(body, path))?.map(({ id, title, body }) => ({ id, title, rows: body }));
  // Areas come from Home Assistant's registries, so only rows the YAML titles can be checked.
  config.nav = read.nav(top, config.pages ?? [], config.rows && rowTitles(config.rows));
  if (read.problems.length) throw new DashboardConfigError(read.problems);
  return config;
}
