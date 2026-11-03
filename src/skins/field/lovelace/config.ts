import {
  DashboardConfigError,
  Reader,
  isRaw,
  cardKinds,
  readAlarmOptions,
  readCard,
  readOwletOptions,
  readSensorOptions,
  readUnit,
  readWeatherOptions,
} from "@dashhaus/dashboard/schema";
import type { CardKindSpec, CardReadSchema, Raw } from "@dashhaus/dashboard/schema";
import type { NavEntry } from "@dashhaus/dashboard";
import type { ToggleIcon } from "@dashhaus/core/entities/toggle/types";
import type { OwletAlert } from "@dashhaus/core/entities/owlet/types";
import { OWLET_ALERT_SUFFIX } from "@dashhaus/core";
import type { FieldFootprint } from "../shared/ui";

/*
 * The field card's YAML (spec/deploy.md → The field dashboard), checked with the reader every card shares, so
 * every mistake shows at once with its path. Field draws lights, climate entities, humidifiers, room sensors, the
 * weather, modes, sound machines, covers, alarms and Owlet socks. The reading itself is the shared card schema
 * (`@dashhaus/dashboard/schema`); this file is the field card's kind table and the words it refuses.
 */

export type FinishSetting = "home-assistant" | "auto" | "alloy" | "black";

export interface ModuleConfig {
  entity: string;
  /** The card that draws it: from `card:`, else the entity id (`kindOf`). */
  kind: FieldKind;
  name?: string;
  /** Overrides the area Home Assistant's registries give it; modules are grouped by area. */
  area?: string;
  footprint?: FieldFootprint;
  /** Grid tracks it spans where its section has that many; one when left out. */
  span?: number;
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

/** A titled group of modules under its legend (`Area`); an area of the automatic layout is one. */
export interface SectionConfig {
  kind: "section";
  title?: string;
  /** Printed at the legend's end. */
  note?: string;
  /** At most this many modules across; fewer where the section is narrower. */
  columns?: number;
  modules: ModuleConfig[];
}
/** Sections side by side, one column each (`Areas`), for a tablet or a wall panel. */
export interface ColumnsConfig { kind: "columns"; columns: number; sections: SectionConfig[] }
export type BlockConfig = SectionConfig | ColumnsConfig;

/** A page of the card's own: its id (for `page:` in the nav and the URL hash), its title, its sections. */
export interface PageConfig { id: string; title: string; blocks: BlockConfig[] }

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
  /** Absent, with no `sections`: every supported light, climate, weather, humidifier, cover, alarm, input_boolean and switch entity, Owlet sock and room sensor, grouped by area. */
  modules?: ModuleConfig[];
  /** The main page laid out by hand, in place of `modules` grouped by area. */
  sections?: BlockConfig[];
  /** More pages in this card, opened from the nav; the main page is `home`. */
  pages?: PageConfig[];
  /** The bottom nav's destinations; absent: the pages, or else the main page's sections; false: no nav. */
  nav?: NavEntry[] | false;
}

/** Every module in some blocks, in order. */
export const modulesOf = (blocks: readonly BlockConfig[]) => sectionsOf(blocks).flatMap((s) => s.modules);

/** The sections of some blocks, a column group's in order. */
export const sectionsOf = (blocks: readonly BlockConfig[]) => blocks.flatMap((b) => (b.kind === "columns" ? b.sections : [b]));

/** Every module in some blocks, changed by `fn`: its area filled in from Home Assistant's registries. */
export const mapModules = (blocks: readonly BlockConfig[], fn: (m: ModuleConfig) => ModuleConfig): BlockConfig[] => {
  const section = (s: SectionConfig): SectionConfig => ({ ...s, modules: s.modules.map(fn) });
  return blocks.map((b) => (b.kind === "columns" ? { ...b, sections: b.sections.map(section) } : section(b)));
};

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
  // new-card: field kinds
};

const FINISHES: readonly FinishSetting[] = ["home-assistant", "auto", "alloy", "black"];
const FOOTPRINTS: readonly FieldFootprint[] = ["standard", "compact"];
const TOP_KEYS = ["type", "title", "subtitle", "show_time", "hour_cycle", "viewing", "finish", "footprint", "quiet", "modules", "sections", "pages", "nav", "view_layout", "grid_options", "visibility"];
const MODULE_KEYS = ["entity", "card", "name", "area", "footprint", "span", "history"];
const SECTION_KEYS = ["title", "note", "columns", "modules"];
const GROUP_KEYS = ["columns", "sections"];
/** A field page is at most 1240 px wide: four modules across, or four areas side by side. */
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
  section: {
    cards: "a field section lists \"modules\"",
    gap: "field spaces its grid by footprint: 12 px between modules, 8 px between rows",
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
    span: read.number(raw, "span", at, 1, MAX_ACROSS),
    history: read.boolean(raw, "history", at),
  }),
  before: (read, raw, path) => {
    if ("joined" in raw || "lead" in raw || "rows" in raw) {
      read.problem(path, "bundles are the main card's: list each module on its own");
      return false;
    }
    return true;
  },
  checkKeys: (read, raw, at, allowed) => fieldKeys(read, raw, at, allowed, ORB_ONLY.module),
};

class FieldReader extends Reader {
  module(value: unknown, path: string): ModuleConfig | undefined {
    return readCard(this, MODULE_SCHEMA, value, path);
  }

  section(value: unknown, path: string): SectionConfig | undefined {
    if (!isRaw(value)) {
      this.problem(path, "a section is a map with \"modules\" (and usually a \"title\")");
      return undefined;
    }
    fieldKeys(this, value, path, SECTION_KEYS, ORB_ONLY.section);
    if (!Array.isArray(value.modules) || value.modules.length === 0) this.problem(path, "\"modules\" must be a list of at least one module");
    const modules = Array.isArray(value.modules) ? value.modules.flatMap((m, i) => this.module(m, `${path}.modules[${i}]`) ?? []) : [];
    const columns = this.number(value, "columns", path, 1, MAX_ACROSS);
    return {
      kind: "section",
      title: this.string(value, "title", path),
      note: this.string(value, "note", path),
      columns,
      // A module spans no more tracks than its section can have.
      modules: columns ? modules.map((m) => (m.span && m.span > columns ? { ...m, span: columns } : m)) : modules,
    };
  }

  block(value: unknown, path: string): BlockConfig | undefined {
    if (isRaw(value) && "sections" in value) {
      fieldKeys(this, value, path, GROUP_KEYS, { gap: ORB_ONLY.section.gap });
      if (!Array.isArray(value.sections) || value.sections.length === 0) {
        this.problem(path, "\"sections\" must be a list of at least one section");
        return undefined;
      }
      const sections = value.sections.flatMap((s, i) => this.section(s, `${path}.sections[${i}]`) ?? []);
      return { kind: "columns", columns: this.number(value, "columns", path, 1, MAX_ACROSS) ?? Math.min(sections.length, MAX_ACROSS), sections };
    }
    return this.section(value, path);
  }
}

/** Check and normalize the card's YAML; throws a DashboardConfigError listing every problem. */
export function parseFieldConfig(raw: unknown): FieldConfig {
  const read = new FieldReader();
  const top: Raw = isRaw(raw) ? raw : {};
  if (raw != null && !isRaw(raw)) read.problem("", "the card's config must be a map");
  fieldKeys(read, top, "", TOP_KEYS, ORB_ONLY.top);
  const config: FieldConfig = {
    title: read.string(top, "title", ""),
    subtitle: read.string(top, "subtitle", ""),
    showTime: read.boolean(top, "show_time", "") ?? false,
    hourCycle: read.choice(top, "hour_cycle", "", ["h12", "h23"] as const),
    viewing: read.choice(top, "viewing", "", ["near", "far"] as const),
    finish: read.choice(top, "finish", "", FINISHES) ?? "home-assistant",
    footprint: read.choice(top, "footprint", "", FOOTPRINTS) ?? "standard",
    quiet: read.boolean(top, "quiet", "") ?? false,
  };
  if (top.modules != null && top.sections != null) read.problem("", "\"modules\" and \"sections\" both lay out the main page: keep one (sections take modules of their own)");
  if (top.modules != null) {
    if (!Array.isArray(top.modules)) read.problem("modules", "must be a list of entity ids or modules");
    else config.modules = top.modules.flatMap((m, i) => read.module(m, `modules[${i}]`) ?? []);
  }
  if (top.sections != null) {
    if (!Array.isArray(top.sections) || top.sections.length === 0) read.problem("sections", "must be a list of at least one section, or left out for the automatic layout");
    else config.sections = top.sections.flatMap((s, i) => read.block(s, `sections[${i}]`) ?? []);
  }
  config.pages = read.pages(top, (s, path) => read.block(s, path));
  // Areas come from Home Assistant's registries, so only sections the YAML titles can be checked.
  const titles = config.sections && sectionsOf(config.sections).flatMap((s) => (s.title ? [s.title] : []));
  config.nav = read.nav(top, config.pages ?? [], titles);
  if (read.problems.length) throw new DashboardConfigError(read.problems);
  return config;
}
