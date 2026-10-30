import { DashboardConfigError, Reader, isRaw } from "../../../ha/lovelace";
import type { NavEntry } from "../../../ha/lovelace";
import type { Raw } from "../../../ha/lovelace";
import type { ToggleIcon } from "@scope/core/entities/toggle/types";
import type { OwletAlert } from "@scope/core/entities/owlet/types";
import { OWLET_ALERT_SUFFIX } from "@scope/core";
import type { FieldFootprint } from "../shared/ui";

/*
 * The field card's YAML (docs/deploy.md → The field dashboard), checked with the reader every card shares, so
 * every mistake shows at once with its path. Field draws lights, climate entities, humidifiers, room sensors, the
 * weather, modes, sound machines, covers, alarms and Owlet socks.
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
  /** A sensor's companions on the same device, and whether it is outside (no comfort reading). */
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
export type FieldKind = "light" | "climate" | "sensor" | "weather" | "toggle" | "humidifier" | "sound" | "cover" | "alarm" | "owlet";

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
};

const KINDS = Object.keys(FIELD_KINDS) as FieldKind[];

/** Every domain a field card draws. */
export const FIELD_DOMAINS: readonly string[] = [...new Set(KINDS.flatMap((k) => FIELD_KINDS[k].domains))];

const domainOf = (entity: string) => entity.slice(0, entity.indexOf("."));

/** The cards that can draw an entity, by its domain. */
const kindsFor = (entity: string) => KINDS.filter((k) => FIELD_KINDS[k].domains.includes(domainOf(entity)));

/** The card an entity gets without `card:`: one whose `id` matches it, else its domain's own; none outside Field's domains. */
export function kindOf(entity: string): FieldKind | undefined {
  const kinds = kindsFor(entity);
  return kinds.find((k) => FIELD_KINDS[k].id?.test(entity)) ?? kinds.find((k) => !FIELD_KINDS[k].id);
}

const FINISHES: readonly FinishSetting[] = ["home-assistant", "auto", "alloy", "black"];
const FOOTPRINTS: readonly FieldFootprint[] = ["standard", "compact"];
const TOP_KEYS = ["type", "title", "subtitle", "show_time", "hour_cycle", "viewing", "finish", "footprint", "quiet", "modules", "sections", "pages", "nav", "view_layout", "grid_options", "visibility"];
const MODULE_KEYS = ["entity", "card", "name", "area", "footprint", "span", "history"];
const SECTION_KEYS = ["title", "note", "columns", "modules"];
const GROUP_KEYS = ["columns", "sections"];
/** A field page is at most 1240 px wide: four modules across, or four areas side by side. */
const MAX_ACROSS = 4;
/** Keys only one card takes. */
const KIND_KEYS: Partial<Record<FieldKind, string[]>> = { climate: ["unit"], sensor: ["humidity", "battery", "outdoor", "unit"], weather: ["aqi", "aqi_scale", "sun", "forecasts"], toggle: ["icon", "description"], sound: ["volume"], alarm: ["read_only", "exit_delay", "entry_delay", "open_sensors"], owlet: ["heart_rate", "oxygen", "charging", "base_station", "alerts", "stale_after"] };
const OWLET_ALERTS = Object.keys(OWLET_ALERT_SUFFIX) as OwletAlert[];
const TOGGLE_ICONS: readonly ToggleIcon[] = ["bell-off", "moon", "volume-off", "guest", "away", "power", "waves"];

/**
 * The main card's keys that field leaves out, and why, for YAML copied from it: said in place of an unknown key's
 * "did you mean".
 */
const ORB_ONLY = {
  top: {
    theme: "field's finish is \"finish\": home-assistant, auto, alloy or black",
    accent: "field has no accent: colour names a parameter (docs/field.md)",
  },
  section: {
    cards: "a field section lists \"modules\"",
    gap: "field spaces its grid by footprint: 12 px between modules, 8 px between rows",
  },
  module: {
    color: "field keeps colour for what a control sets (docs/field.md)",
    show_control: "a field row shows its screen in place of a control",
  },
} satisfies Record<string, Record<string, string>>;

class FieldReader extends Reader {
  /** Unknown keys, with the reason for one that only the main card takes. */
  fieldKeys(raw: Raw, path: string, allowed: readonly string[], orbOnly: Record<string, string>) {
    for (const key of Object.keys(raw)) if (key in orbOnly && !allowed.includes(key)) this.problem(path, `"${key}" is the main card's: ${orbOnly[key]}`);
    this.keys(raw, path, [...allowed, ...Object.keys(orbOnly)]);
  }

  module(value: unknown, path: string): ModuleConfig | undefined {
    if (isRaw(value) && ("joined" in value || "lead" in value || "rows" in value)) {
      this.problem(path, "bundles are the main card's: list each module on its own");
      return undefined;
    }
    if (!isRaw(value) && typeof value !== "string") {
      this.problem(path, "a module is an entity id, or a map with an \"entity\" key");
      return undefined;
    }
    const raw: Raw = typeof value === "string" ? { entity: value } : value;
    if (raw.entity == null) {
      this.problem(path, "a module needs an \"entity\"");
      return undefined;
    }
    const entity = this.entityId(raw.entity, path, FIELD_DOMAINS);
    if (!entity) return undefined;
    const at = `${path} (${entity})`;
    const kind = this.choice(raw, "card", at, kindsFor(entity)) ?? kindOf(entity);
    if (!kind) {
      this.problem(at, `pick its card with "card": one of ${kindsFor(entity).join(", ")}`);
      return undefined;
    }
    this.fieldKeys(raw, at, [...MODULE_KEYS, ...(KIND_KEYS[kind] ?? [])], ORB_ONLY.module);
    const config: ModuleConfig = {
      entity,
      kind,
      name: this.string(raw, "name", at),
      area: this.string(raw, "area", at),
      footprint: this.choice(raw, "footprint", at, FOOTPRINTS),
      span: this.number(raw, "span", at, 1, MAX_ACROSS),
      history: this.boolean(raw, "history", at),
    };
    if (kind === "climate" || kind === "sensor") config.unit = this.choice(raw, "unit", at, ["°C", "°F"] as const);
    if (kind === "sensor") {
      config.humidity = this.optionalEntity(raw, "humidity", at, ["sensor"]);
      config.battery = this.optionalEntity(raw, "battery", at, ["sensor"]);
      config.outdoor = this.boolean(raw, "outdoor", at);
    }
    if (kind === "weather") {
      config.aqi = this.optionalEntity(raw, "aqi", at, ["sensor"]);
      config.aqiScale = this.choice(raw, "aqi_scale", at, ["US"] as const);
      config.sun = raw.sun === undefined ? "sun.sun" : this.optionalEntity(raw, "sun", at, ["sun"]);
      config.forecasts = this.boolean(raw, "forecasts", at) ?? true;
    }
    if (kind === "toggle") {
      config.icon = this.choice(raw, "icon", at, TOGGLE_ICONS);
      config.description = this.string(raw, "description", at);
    }
    if (kind === "sound") config.volume = this.optionalEntity(raw, "volume", at, ["number"]);
    if (kind === "alarm") {
      const sensors = raw.open_sensors;
      if (sensors != null && !(Array.isArray(sensors) && sensors.every((s) => typeof s === "string"))) this.problem(at, "\"open_sensors\" must be a list of names");
      config.readOnly = this.boolean(raw, "read_only", at);
      config.exitDelay = this.number(raw, "exit_delay", at, 0, 3600);
      config.entryDelay = this.number(raw, "entry_delay", at, 0, 3600);
      config.openSensors = Array.isArray(sensors) ? sensors.filter((s): s is string => typeof s === "string") : undefined;
    }
    if (kind === "owlet") {
      const alerts = raw.alerts;
      if (alerts != null && !isRaw(alerts)) this.problem(at, "\"alerts\" must map alerts to binary_sensor.* entities, like low_oxygen: binary_sensor.sock_low_oxygen");
      if (isRaw(alerts)) this.keys(alerts, `${at}.alerts`, OWLET_ALERTS);
      config.heartRate = this.optionalEntity(raw, "heart_rate", at, ["sensor"]);
      config.oxygen = this.optionalEntity(raw, "oxygen", at, ["sensor"]);
      config.charging = this.optionalEntity(raw, "charging", at, ["binary_sensor"]);
      config.baseStation = this.optionalEntity(raw, "base_station", at, ["switch"]);
      config.alerts = isRaw(alerts)
        ? Object.fromEntries(OWLET_ALERTS.flatMap((alert) => {
          const id = this.optionalEntity(alerts, alert, `${at}.alerts`, ["binary_sensor"]);
          return id ? [[alert, id]] : [];
        }))
        : undefined;
      config.staleAfter = this.number(raw, "stale_after", at, 1, 60);
    }
    return config;
  }

  section(value: unknown, path: string): SectionConfig | undefined {
    if (!isRaw(value)) {
      this.problem(path, "a section is a map with \"modules\" (and usually a \"title\")");
      return undefined;
    }
    this.fieldKeys(value, path, SECTION_KEYS, ORB_ONLY.section);
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
      this.fieldKeys(value, path, GROUP_KEYS, { gap: ORB_ONLY.section.gap });
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
  read.fieldKeys(top, "", TOP_KEYS, ORB_ONLY.top);
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
