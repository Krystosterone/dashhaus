import { DashboardConfigError, Reader, isRaw } from "../../../ha/lovelace/yaml";
import type { Raw } from "../../../ha/lovelace/yaml";
import type { FieldFootprint } from "../shared/ui";

/*
 * The field card's YAML (docs/deploy.md → The field dashboard), checked with the reader every card shares, so
 * every mistake shows at once with its path. Field draws lights, climate entities and room sensors.
 */

export type FinishSetting = "home-assistant" | "auto" | "alloy" | "black";

export interface ModuleConfig {
  entity: string;
  name?: string;
  /** Overrides the area Home Assistant's registries give it; modules are grouped by area. */
  area?: string;
  footprint?: FieldFootprint;
  /** A sensor's companions on the same device, and whether it is outside (no comfort reading). */
  humidity?: string;
  battery?: string;
  outdoor?: boolean;
}

export interface FieldConfig {
  title?: string;
  /** "home-assistant" follows Home Assistant's dark mode; "auto", the device's. */
  finish: FinishSetting;
  /** Every module's footprint unless it sets its own. */
  footprint: FieldFootprint;
  /** Absent: every supported light and climate entity and room sensor, grouped by area. */
  modules?: ModuleConfig[];
}

/** The domains Field has a module for. */
export const FIELD_DOMAINS = ["light", "climate", "sensor"] as const;
export type FieldDomain = (typeof FIELD_DOMAINS)[number];

const FINISHES: readonly FinishSetting[] = ["home-assistant", "auto", "alloy", "black"];
const FOOTPRINTS: readonly FieldFootprint[] = ["standard", "compact"];
const TOP_KEYS = ["type", "title", "finish", "footprint", "modules", "view_layout", "grid_options", "visibility"];
const MODULE_KEYS = ["entity", "name", "area", "footprint"];
/** Keys only a sensor module takes. */
const SENSOR_KEYS = ["humidity", "battery", "outdoor"];

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
  const sensor = entity.startsWith("sensor.");
  read.keys(raw, at, sensor ? [...MODULE_KEYS, ...SENSOR_KEYS] : MODULE_KEYS);
  const config: ModuleConfig = { entity, name: read.string(raw, "name", at), area: read.string(raw, "area", at), footprint: read.choice(raw, "footprint", at, FOOTPRINTS) };
  if (sensor) {
    config.humidity = read.optionalEntity(raw, "humidity", at, ["sensor"]);
    config.battery = read.optionalEntity(raw, "battery", at, ["sensor"]);
    config.outdoor = read.boolean(raw, "outdoor", at);
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
