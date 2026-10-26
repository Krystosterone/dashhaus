import type { AutoEntityEntry } from "../../../ha/lovelace/element";
import { FIELD_DOMAINS } from "./config";
import type { ModuleConfig } from "./config";

/** What the automatic layout reads from `hass`: states for names, and the registries for areas. */
export interface AutoInput {
  states: Record<string, { attributes: Record<string, unknown> }>;
  entities?: Record<string, AutoEntityEntry>;
  devices?: Record<string, { area_id?: string | null }>;
  areas?: Record<string, { name: string }>;
}

const domainOf = (id: string) => id.slice(0, id.indexOf("."));

/** An entity's area name from the frontend's registries: its own area, else its device's. */
export function areaName(input: AutoInput, entityId: string): string | undefined {
  const entry = input.entities?.[entityId];
  const areaId = entry?.area_id ?? (entry?.device_id ? input.devices?.[entry.device_id]?.area_id : undefined);
  return areaId ? input.areas?.[areaId]?.name : undefined;
}

/**
 * Every entity field can draw, for a card without `modules`: hidden and config or diagnostic entities left out,
 * by name. The dashboard groups them by area.
 */
export function autoModules(input: AutoInput): ModuleConfig[] {
  const { states, entities = {} } = input;
  const name = (id: string) => String(states[id]?.attributes.friendly_name ?? id);
  return Object.keys(states)
    .filter((id) => {
      const entry = entities[id];
      return !entry?.hidden && !entry?.entity_category && (FIELD_DOMAINS as readonly string[]).includes(domainOf(id));
    })
    .sort((a, b) => name(a).localeCompare(name(b)))
    .map((entity) => ({ entity }));
}

export interface AreaGroup { area?: string; modules: ModuleConfig[] }

/**
 * Modules by area, areas by name, each module keeping its order within its area. Modules with no area come last,
 * under no heading.
 */
export function groupByArea(modules: readonly ModuleConfig[]): AreaGroup[] {
  const groups = new Map<string | undefined, ModuleConfig[]>();
  for (const m of modules) groups.set(m.area, [...(groups.get(m.area) ?? []), m]);
  return [...groups.entries()]
    .sort(([a], [b]) => (a == null ? 1 : b == null ? -1 : a.localeCompare(b)))
    .map(([area, list]) => ({ area, modules: list }));
}
