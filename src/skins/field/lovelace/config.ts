import { DashboardConfigError, Reader, isRaw } from "../../../ha/lovelace/yaml";
import type { Raw } from "../../../ha/lovelace/yaml";
import type { ToggleIcon } from "../../../domains/toggle/types";
import type { OwletAlert } from "../../../domains/owlet/types";
import { OWLET_ALERT_SUFFIX } from "../../../ha/mappers/owlet";
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

export interface FieldConfig {
  title?: string;
  /** A clock in the header. */
  showTime: boolean;
  /** The clock's 12 or 24 hours; the locale's when left out. */
  hourCycle?: "h12" | "h23";
  /** "home-assistant" follows Home Assistant's dark mode; "auto", the device's. */
  finish: FinishSetting;
  /** Every module's footprint unless it sets its own. */
  footprint: FieldFootprint;
  /** An alarm holds its inverted screen from the start, with no flash: a panel in a nursery at night. */
  quiet: boolean;
  /** Absent: every supported light, climate, weather, humidifier, cover, alarm, input_boolean and switch entity, Owlet sock and room sensor, grouped by area. */
  modules?: ModuleConfig[];
}

/** Field's cards, by the name they share with their domain model (`src/domains/<kind>/`). */
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
const TOP_KEYS = ["type", "title", "show_time", "hour_cycle", "finish", "footprint", "quiet", "modules", "view_layout", "grid_options", "visibility"];
const MODULE_KEYS = ["entity", "card", "name", "area", "footprint"];
/** Keys only one card takes. */
const KIND_KEYS: Partial<Record<FieldKind, string[]>> = { sensor: ["humidity", "battery", "outdoor"], weather: ["aqi", "aqi_scale", "sun", "forecasts"], toggle: ["icon", "description"], sound: ["volume"], alarm: ["read_only", "exit_delay", "entry_delay", "open_sensors"], owlet: ["heart_rate", "oxygen", "charging", "base_station", "alerts", "stale_after"] };
const OWLET_ALERTS = Object.keys(OWLET_ALERT_SUFFIX) as OwletAlert[];
const TOGGLE_ICONS: readonly ToggleIcon[] = ["bell-off", "moon", "volume-off", "guest", "away", "power", "waves"];

function module(read: Reader, value: unknown, path: string): ModuleConfig | undefined {
  if (!isRaw(value) && typeof value !== "string") {
    read.problem(path, "a module is an entity id, or a map with an \"entity\" key");
    return undefined;
  }
  const raw: Raw = typeof value === "string" ? { entity: value } : value;
  if (raw.entity == null) {
    read.problem(path, "a module needs an \"entity\"");
    return undefined;
  }
  const entity = read.entityId(raw.entity, path, FIELD_DOMAINS);
  if (!entity) return undefined;
  const at = `${path} (${entity})`;
  const kind = read.choice(raw, "card", at, kindsFor(entity)) ?? kindOf(entity);
  if (!kind) {
    read.problem(at, `pick its card with "card": one of ${kindsFor(entity).join(", ")}`);
    return undefined;
  }
  read.keys(raw, at, [...MODULE_KEYS, ...(KIND_KEYS[kind] ?? [])]);
  const config: ModuleConfig = { entity, kind, name: read.string(raw, "name", at), area: read.string(raw, "area", at), footprint: read.choice(raw, "footprint", at, FOOTPRINTS) };
  if (kind === "sensor") {
    config.humidity = read.optionalEntity(raw, "humidity", at, ["sensor"]);
    config.battery = read.optionalEntity(raw, "battery", at, ["sensor"]);
    config.outdoor = read.boolean(raw, "outdoor", at);
  }
  if (kind === "weather") {
    config.aqi = read.optionalEntity(raw, "aqi", at, ["sensor"]);
    config.aqiScale = read.choice(raw, "aqi_scale", at, ["US"] as const);
    config.sun = raw.sun === undefined ? "sun.sun" : read.optionalEntity(raw, "sun", at, ["sun"]);
    config.forecasts = read.boolean(raw, "forecasts", at) ?? true;
  }
  if (kind === "toggle") {
    config.icon = read.choice(raw, "icon", at, TOGGLE_ICONS);
    config.description = read.string(raw, "description", at);
  }
  if (kind === "sound") config.volume = read.optionalEntity(raw, "volume", at, ["number"]);
  if (kind === "alarm") {
    const sensors = raw.open_sensors;
    if (sensors != null && !(Array.isArray(sensors) && sensors.every((s) => typeof s === "string"))) read.problem(at, "\"open_sensors\" must be a list of names");
    config.readOnly = read.boolean(raw, "read_only", at);
    config.exitDelay = read.number(raw, "exit_delay", at, 0, 3600);
    config.entryDelay = read.number(raw, "entry_delay", at, 0, 3600);
    config.openSensors = Array.isArray(sensors) ? sensors.filter((s): s is string => typeof s === "string") : undefined;
  }
  if (kind === "owlet") {
    const alerts = raw.alerts;
    if (alerts != null && !isRaw(alerts)) read.problem(at, "\"alerts\" must map alerts to binary_sensor.* entities, like low_oxygen: binary_sensor.sock_low_oxygen");
    if (isRaw(alerts)) read.keys(alerts, `${at}.alerts`, OWLET_ALERTS);
    config.heartRate = read.optionalEntity(raw, "heart_rate", at, ["sensor"]);
    config.oxygen = read.optionalEntity(raw, "oxygen", at, ["sensor"]);
    config.charging = read.optionalEntity(raw, "charging", at, ["binary_sensor"]);
    config.baseStation = read.optionalEntity(raw, "base_station", at, ["switch"]);
    config.alerts = isRaw(alerts)
      ? Object.fromEntries(OWLET_ALERTS.flatMap((alert) => {
        const id = read.optionalEntity(alerts, alert, `${at}.alerts`, ["binary_sensor"]);
        return id ? [[alert, id]] : [];
      }))
      : undefined;
    config.staleAfter = read.number(raw, "stale_after", at, 1, 60);
  }
  return config;
}

/** Check and normalize the card's YAML; throws a DashboardConfigError listing every problem. */
export function parseFieldConfig(raw: unknown): FieldConfig {
  const read = new Reader();
  const top: Raw = isRaw(raw) ? raw : {};
  if (raw != null && !isRaw(raw)) read.problem("", "the card's config must be a map");
  read.keys(top, "", TOP_KEYS);
  const config: FieldConfig = {
    title: read.string(top, "title", ""),
    showTime: read.boolean(top, "show_time", "") ?? false,
    hourCycle: read.choice(top, "hour_cycle", "", ["h12", "h23"] as const),
    finish: read.choice(top, "finish", "", FINISHES) ?? "home-assistant",
    footprint: read.choice(top, "footprint", "", FOOTPRINTS) ?? "standard",
    quiet: read.boolean(top, "quiet", "") ?? false,
  };
  if (top.modules != null) {
    if (!Array.isArray(top.modules)) read.problem("modules", "must be a list of entity ids or modules");
    else config.modules = top.modules.flatMap((m, i) => module(read, m, `modules[${i}]`) ?? []);
  }
  if (read.problems.length) throw new DashboardConfigError(read.problems);
  return config;
}
