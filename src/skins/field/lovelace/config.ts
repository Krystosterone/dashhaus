import { DashboardConfigError, Reader, isRaw } from "../../../ha/lovelace/yaml";
import type { Raw } from "../../../ha/lovelace/yaml";
import type { ToggleIcon } from "../../../domains/toggle/types";
import type { FieldFootprint } from "../shared/ui";

/*
 * The field card's YAML (docs/deploy.md → The field dashboard), checked with the reader every card shares, so
 * every mistake shows at once with its path. Field draws lights, climate entities, humidifiers, room sensors, the
 * weather, modes and sound machines.
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
}

export interface FieldConfig {
  title?: string;
  /** "home-assistant" follows Home Assistant's dark mode; "auto", the device's. */
  finish: FinishSetting;
  /** Every module's footprint unless it sets its own. */
  footprint: FieldFootprint;
  /** Absent: every supported light, climate, weather, input_boolean and switch entity and room sensor, grouped by area. */
  modules?: ModuleConfig[];
}

/** Field's cards, by the name they share with their domain model (`src/domains/<kind>/`). */
export type FieldKind = "light" | "climate" | "sensor" | "weather" | "toggle" | "humidifier" | "sound";

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
const TOP_KEYS = ["type", "title", "finish", "footprint", "modules", "view_layout", "grid_options", "visibility"];
const MODULE_KEYS = ["entity", "card", "name", "area", "footprint"];
/** Keys only one card takes. */
const KIND_KEYS: Partial<Record<FieldKind, string[]>> = { sensor: ["humidity", "battery", "outdoor"], weather: ["aqi", "aqi_scale", "sun", "forecasts"], toggle: ["icon", "description"], sound: ["volume"] };
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
    finish: read.choice(top, "finish", "", FINISHES) ?? "home-assistant",
    footprint: read.choice(top, "footprint", "", FOOTPRINTS) ?? "standard",
  };
  if (top.modules != null) {
    if (!Array.isArray(top.modules)) read.problem("modules", "must be a list of entity ids or modules");
    else config.modules = top.modules.flatMap((m, i) => module(read, m, `modules[${i}]`) ?? []);
  }
  if (read.problems.length) throw new DashboardConfigError(read.problems);
  return config;
}
