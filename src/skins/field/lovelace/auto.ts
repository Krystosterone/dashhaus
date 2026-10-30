import type { AutoEntityEntry } from "../../../ha/lovelace";
import { roomSensors } from "../../../ha/lovelace";
import { kindOf } from "./config";
import type { ModuleConfig, SectionConfig } from "./config";

/** What the automatic layout reads from `hass`: states for names, and the registries for areas. */
export interface AutoInput {
  states: Record<string, { attributes: Record<string, unknown> }>;
  entities?: Record<string, AutoEntityEntry>;
  devices?: Record<string, { area_id?: string | null }>;
  areas?: Record<string, { name: string }>;
}

/** An entity's area name from the frontend's registries: its own area, else its device's. */
export function areaName(input: AutoInput, entityId: string): string | undefined {
  const entry = input.entities?.[entityId];
  const areaId = entry?.area_id ?? (entry?.device_id ? input.devices?.[entry.device_id]?.area_id : undefined);
  return areaId ? input.areas?.[areaId]?.name : undefined;
}

/**
 * Every supported entity Field can draw, for a card without `modules`, as the card its entity id picks: hidden and
 * config or diagnostic entities left out, sorted by name. The sensor card takes only room air: one per device, its
 * humidity and battery as companions (`roomSensors`). The weather card takes the first weather entity by name, as
 * orb's does, with `sun.sun` for night. Every input_boolean and switch is a toggle, every humidifier a humidifier, every
 * cover a cover, every alarm_control_panel an alarm, and every `sensor.*_sleep_state` an Owlet sock (its readings are
 * found beside it, so they aren't drawn on their own). The dashboard groups them by area.
 */
export function autoModules(input: AutoInput): ModuleConfig[] {
  const { states, entities = {} } = input;
  const name = (m: ModuleConfig) => String(states[m.entity]?.attributes.friendly_name ?? m.entity);
  const visible = Object.keys(states).flatMap((entity): ModuleConfig[] => {
    const entry = entities[entity];
    const kind = kindOf(entity);
    return !entry?.hidden && !entry?.entity_category && kind ? [{ entity, kind }] : [];
  }).sort((a, b) => name(a).localeCompare(name(b)));
  const others = visible.filter((m) => m.kind !== "sensor" && m.kind !== "weather");
  const weather = visible.find((m) => m.kind === "weather");
  const sensors = roomSensors(input).map((room): ModuleConfig => ({ ...room, kind: "sensor" }));
  return [...others, ...(weather ? [{ ...weather, sun: "sun.sun" }] : []), ...sensors].sort((a, b) => name(a).localeCompare(name(b)));
}

export interface AreaGroup<M extends { area?: string } = ModuleConfig> { area?: string; modules: M[] }

/**
 * Modules by area, areas by name, each module keeping its order within its area. Modules with no area come last,
 * under no heading.
 */
export function groupByArea<M extends { area?: string }>(modules: readonly M[]): AreaGroup<M>[] {
  const groups = new Map<string | undefined, M[]>();
  for (const m of modules) groups.set(m.area, [...(groups.get(m.area) ?? []), m]);
  return [...groups.entries()]
    .sort(([a], [b]) => (a == null ? 1 : b == null ? -1 : a.localeCompare(b)))
    .map(([area, list]) => ({ area, modules: list }));
}

/** The automatic layout's sections, and a `modules` list's: one per area, titled with its name (`groupByArea`). */
export const areaSections = (modules: readonly ModuleConfig[]): SectionConfig[] =>
  groupByArea(modules).map((g) => ({ kind: "section", title: g.area, modules: g.modules }));
