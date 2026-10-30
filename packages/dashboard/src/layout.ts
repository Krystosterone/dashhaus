import type { AutoEntityEntry } from "./element";

/*
 * The facts an automatic Lovelace layout needs, shared by every skin: which entities are visible, which area an
 * entity is in, how entities sort by name, how they group by area, and how a section joins one of its title. The
 * section policy itself (orb's Comfort/Modes/Rooms/Security/Nursery/Outside, field's by-area modules) stays in the
 * skin. Pure: no React, no DOM, no skin, so a Node config (dashboard.config.mjs, a generated skin) can import it.
 */

export type { AutoEntityEntry } from "./element";

/** A raw state, as far as a layout needs one. */
export interface AutoState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

/** What an automatic layout reads: states for names, the entity registry for visibility, devices and areas. */
export interface AutoInput {
  states: Record<string, { attributes: Record<string, unknown> }>;
  entities?: Record<string, AutoEntityEntry>;
  devices?: Record<string, { area_id?: string | null }>;
  areas?: Record<string, { name: string }>;
}

/** What finding room sensors reads from `hass`: states for device classes and names, the entity registry for devices. */
export interface RoomSensorInput {
  states: AutoInput["states"];
  entities?: Record<string, AutoEntityEntry>;
}

/** One device's room air: its primary sensor, with the humidity and battery sensors on the same device. */
export interface RoomSensor {
  entity: string;
  humidity?: string;
  battery?: string;
}

export const domainOf = (id: string) => id.slice(0, id.indexOf("."));

export const deviceClass = (state: { attributes: Record<string, unknown> } | undefined) =>
  typeof state?.attributes.device_class === "string" ? state.attributes.device_class : undefined;

/** An entity's name as Home Assistant shows it, falling back to its id. */
export const friendlyName = (states: AutoInput["states"], entity: string) => String(states[entity]?.attributes.friendly_name ?? entity);

/** Entity ids by name, the way a dashboard sorts cards. */
export const byName = (states: AutoInput["states"]) => (a: string, b: string) => friendlyName(states, a).localeCompare(friendlyName(states, b));

/** Items by the name `name` gives them. */
export const sortByName = <T>(items: readonly T[], name: (item: T) => string): T[] =>
  [...items].sort((a, b) => name(a).localeCompare(name(b)));

/** An entity's area id: its own, else its device's. */
export function areaId(input: AutoInput, entity: string): string | undefined {
  const entry = input.entities?.[entity];
  return entry?.area_id ?? (entry?.device_id ? input.devices?.[entry.device_id]?.area_id ?? undefined : undefined);
}

/** An entity's area name from the frontend's registries: its own area, else its device's. */
export function areaName(input: AutoInput, entity: string): string | undefined {
  const id = areaId(input, entity);
  return id ? input.areas?.[id]?.name : undefined;
}

/**
 * The entities a dashboard may draw, in registry order: hidden and config or diagnostic entities left out, and
 * anything `supported` rejects (a skin's registered cards).
 */
export function visibleEntities(input: AutoInput, supported: (entity: string) => boolean = () => true): string[] {
  return Object.keys(input.states).filter((entity) => {
    const entry = input.entities?.[entity];
    return !entry?.hidden && !entry?.entity_category && supported(entity);
  });
}

export interface AreaGroup<M extends { area?: string } = { area?: string }> {
  area?: string;
  modules: M[];
}

/**
 * Items by area, areas by name, each item keeping its order within its area. Items with no area come last, under no
 * heading.
 */
export function groupByArea<M extends { area?: string }>(items: readonly M[]): AreaGroup<M>[] {
  const groups = new Map<string | undefined, M[]>();
  for (const item of items) groups.set(item.area, [...(groups.get(item.area) ?? []), item]);
  return [...groups.entries()]
    .sort(([a], [b]) => (a == null ? 1 : b == null ? -1 : a.localeCompare(b)))
    .map(([area, list]) => ({ area, modules: list }));
}

/**
 * Place a section: one of its title already on the page takes its cards instead, so the page never shows two
 * sections of one name and a nav to one never lands on the other.
 */
export function placeSection<S extends { title: string; cards: C[] }, C>(sections: S[], section: S): void {
  const same = sections.find((candidate) => candidate.title.toLowerCase() === section.title.toLowerCase());
  if (same) same.cards.push(...section.cards);
  else sections.push(section);
}

/**
 * Room air for an automatic layout, one per device: every visible temperature sensor, with the humidity and battery
 * sensors on its device as companions, then every humidity sensor on a device that has no temperature. Each group
 * sorted by name. Companions may be diagnostic entities (batteries usually are); only hidden ones are left out.
 */
export function roomSensors({ states, entities = {} }: RoomSensorInput): RoomSensor[] {
  const name = (id: string) => friendlyName(states, id);
  const sensors = Object.keys(states).filter((id) => id.startsWith("sensor.") && !entities[id]?.hidden);
  const visible = sensors.filter((id) => !entities[id]?.entity_category);
  const deviceOf = (id: string) => entities[id]?.device_id ?? undefined;
  const companion = (device: string | undefined, cls: string) => (
    device ? sensors.find((id) => deviceOf(id) === device && deviceClass(states[id]) === cls) : undefined
  );
  const taken = new Set<string>();
  const rooms: RoomSensor[] = [];
  for (const cls of ["temperature", "humidity"]) {
    for (const id of visible.filter((sensor) => deviceClass(states[sensor]) === cls).sort((a, b) => name(a).localeCompare(name(b)))) {
      const device = deviceOf(id);
      if (taken.has(id) || (device && taken.has(`device:${device}`))) continue;
      if (device) taken.add(`device:${device}`);
      taken.add(id);
      const humidity = cls === "temperature" ? companion(device, "humidity") : undefined;
      const battery = companion(device, "battery");
      rooms.push({ entity: id, ...(humidity && { humidity }), ...(battery && { battery }) });
    }
  }
  return rooms;
}
