import { DashboardConfigError, Reader, isRaw } from "../../../ha/lovelace/yaml";
import type { Raw } from "../../../ha/lovelace/yaml";
import type { FieldFootprint } from "../shared/ui";

/*
 * The field card's YAML (docs/deploy.md → The field dashboard), checked with the reader every card shares, so
 * every mistake shows at once with its path. Field draws lights and climate entities.
 */

export type FinishSetting = "home-assistant" | "auto" | "alloy" | "black";

export interface ModuleConfig {
  entity: string;
  name?: string;
  /** Overrides the area Home Assistant's registries give it; modules are grouped by area. */
  area?: string;
  footprint?: FieldFootprint;
}

export interface FieldConfig {
  title?: string;
  /** "home-assistant" follows Home Assistant's dark mode; "auto", the device's. */
  finish: FinishSetting;
  /** Every module's footprint unless it sets its own. */
  footprint: FieldFootprint;
  /** Absent: every supported light and climate entity, grouped by area. */
  modules?: ModuleConfig[];
}

/** The domains Field has a module for. */
export const FIELD_DOMAINS = ["light", "climate"] as const;

const FINISHES: readonly FinishSetting[] = ["home-assistant", "auto", "alloy", "black"];
const FOOTPRINTS: readonly FieldFootprint[] = ["standard", "compact"];
const TOP_KEYS = ["type", "title", "finish", "footprint", "modules", "view_layout", "grid_options", "visibility"];
const MODULE_KEYS = ["entity", "name", "area", "footprint"];

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
  read.keys(raw, at, MODULE_KEYS);
  return { entity, name: read.string(raw, "name", at), area: read.string(raw, "area", at), footprint: read.choice(raw, "footprint", at, FOOTPRINTS) };
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
