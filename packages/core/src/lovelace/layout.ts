import type { AutoEntityEntry } from "./element";
import type { BinarySensorClass } from "../entities/binarySensor/types";
import type { NumericClass } from "../entities/numeric/types";
import type { EnergyPrefs } from "../ha/energy";

/*
 * The facts an automatic Lovelace layout needs, shared by every skin: which entities are visible, which area an
 * entity is in, how entities sort by name, how they group by area, and how a section joins one of its title. The
 * section policy itself (orb's Comfort/Modes/Rooms/Security/Nursery/Outside, field's by-area modules) stays in the
 * skin. Pure: no React, no DOM, no skin, so a Node config (dashboard.config.mjs, a generated skin) can import it.
 */

export type { AutoEntityEntry } from "./element";
export type { EnergyPrefs, EnergySourcePrefs } from "../ha/energy";

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
  /** Home Assistant's energy preferences (`energy/get_prefs`), for the house's power and energy meters (`energySensors`). */
  energy?: EnergyPrefs;
}

/** What finding room sensors reads from `hass`: states for device classes and names, the entity registry for devices. */
export interface RoomSensorInput {
  states: AutoInput["states"];
  entities?: Record<string, AutoEntityEntry>;
  /** Home Assistant's energy preferences, which `energySensors` reads. */
  energy?: EnergyPrefs;
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
 * The first `domain` entity (by default a `sensor.*`) of one device class on the same device as `entity`: a room
 * sensor's humidity, a lock's or a door sensor's battery. Companions may be diagnostic entities (batteries usually
 * are); only hidden ones, and the entity itself, are left out. Nothing when the entity has no device in the registry.
 */
export function deviceCompanion({ states, entities = {} }: RoomSensorInput, entity: string, cls: string, domain = "sensor"): string | undefined {
  const device = entities[entity]?.device_id;
  if (!device) return undefined;
  return Object.keys(states).find((id) => id !== entity && id.startsWith(`${domain}.`) && !entities[id]?.hidden && entities[id]?.device_id === device && deviceClass(states[id]) === cls);
}

/** The filter-life sensors `dyson_local` names after a Dyson's fan; one of them, with its night-mode switch, is a Dyson. */
const DYSON_FILTERS = ["hepa_filter_life", "carbon_filter_life", "filter_life"] as const;

/**
 * The Dysons among the house's fans, for an automatic layout to draw with the dyson card: each `fan.*` beside which
 * `dyson_local` (ha-dyson) names a night-mode switch and a filter-life sensor (`switch.<fan>_night_mode`,
 * `sensor.<fan>_hepa_filter_life` …), with the heater that is its own on a Hot+Cool (`climate.<fan>`), which the
 * dyson card draws so no other card should. A pure function of the states' ids; this file has no runtime relative
 * import, so the names are written here and the mapper's (`dysonCompanionIds`) test holds them alike.
 */
export function dysonFans({ states }: Pick<AutoInput, "states">): { fan: string; heat?: string }[] {
  return Object.keys(states).flatMap((id) => {
    const match = /^fan\.(\w+)$/.exec(id);
    if (!match) return [];
    const o = match[1];
    if (!states[`switch.${o}_night_mode`] || !DYSON_FILTERS.some((f) => states[`sensor.${o}_${f}`])) return [];
    return [states[`climate.${o}`] ? { fan: id, heat: `climate.${o}` } : { fan: id }];
  });
}

/**
 * Room air for an automatic layout, one per device: every visible temperature sensor, with the humidity and battery
 * sensors on its device as companions, then every humidity sensor on a device that has no temperature. Each group
 * sorted by name. Companions may be diagnostic entities (batteries usually are); only hidden ones are left out.
 */
export function roomSensors({ states, entities = {} }: RoomSensorInput): RoomSensor[] {
  const name = (id: string) => friendlyName(states, id);
  const visible = Object.keys(states).filter((id) => id.startsWith("sensor.") && !entities[id]?.hidden && !entities[id]?.entity_category);
  const deviceOf = (id: string) => entities[id]?.device_id ?? undefined;
  const companion = (id: string, cls: string) => deviceCompanion({ states, entities }, id, cls);
  const taken = new Set<string>();
  const rooms: RoomSensor[] = [];
  for (const cls of ["temperature", "humidity"]) {
    for (const id of visible.filter((sensor) => deviceClass(states[sensor]) === cls).sort((a, b) => name(a).localeCompare(name(b)))) {
      const device = deviceOf(id);
      if (taken.has(id) || (device && taken.has(`device:${device}`))) continue;
      if (device) taken.add(`device:${device}`);
      taken.add(id);
      const humidity = cls === "temperature" ? companion(id, "humidity") : undefined;
      const battery = companion(id, "battery");
      rooms.push({ entity: id, ...(humidity && { humidity }), ...(battery && { battery }) });
    }
  }
  return rooms;
}

/**
 * The binary sensor device classes an automatic layout shows: the safety glance, doors, windows, leaks and smoke.
 * Every other class (motion, connectivity, updates, an Owlet sock's alerts with none) is left for a person to add,
 * since a house has dozens of them and they would bury the ones that matter.
 */
export const SAFETY_CLASSES: readonly BinarySensorClass[] = ["door", "garage_door", "window", "opening", "moisture", "smoke", "gas", "carbon_monoxide", "safety"];

/** Whether a raw `device_class` is one of `SAFETY_CLASSES`, narrowing it to a binary sensor class. */
const isSafetyClass = (value: string | undefined): value is BinarySensorClass =>
  value != null && (SAFETY_CLASSES as readonly string[]).includes(value);

/** One safety sensor for an automatic layout: the `binary_sensor`, with the battery sensor on its device. */
export interface SafetySensor {
  entity: string;
  battery?: string;
}

/**
 * Every visible `binary_sensor` of a safety class (`SAFETY_CLASSES`), by name, each with its device's battery where it
 * has one. Config and diagnostic sensors are left out; their battery companions may be diagnostic, as a lock's are.
 */
export function safetySensors({ states, entities = {} }: RoomSensorInput): SafetySensor[] {
  return Object.keys(states)
    .filter((id) => id.startsWith("binary_sensor.") && !entities[id]?.hidden && !entities[id]?.entity_category && isSafetyClass(deviceClass(states[id])))
    .sort(byName(states))
    .map((entity) => {
      const battery = deviceCompanion({ states, entities }, entity, "battery");
      return { entity, ...(battery && { battery }) };
    });
}

/**
 * The numeric reading classes an automatic layout shows, in the order one device's readings are picked: the room's air
 * (CO₂, then fine and coarse particles, then volatile organic compounds). Power, energy and every other class are left
 * for a person to add with `card: numeric`, since every smart plug has them and dozens would bury the room's air; the
 * house's own power and energy meters come from its energy preferences instead (`energySensors`).
 */
export const NUMERIC_CLASSES: readonly NumericClass[] = ["carbon_dioxide", "pm25", "pm10", "volatile_organic_compounds", "volatile_organic_compounds_parts"];

/**
 * Room air quality for an automatic layout, one per device: every visible `sensor` of a `NUMERIC_CLASSES` class, the
 * first class in that order on each device (an air monitor's CO₂ before its particles), by name. Hidden, config and
 * diagnostic sensors are left out; a sensor with no device stands alone.
 */
export function numericSensors({ states, entities = {} }: RoomSensorInput): string[] {
  const visible = Object.keys(states).filter((id) => id.startsWith("sensor.") && !entities[id]?.hidden && !entities[id]?.entity_category);
  const rank = (id: string) => (NUMERIC_CLASSES as readonly (string | undefined)[]).indexOf(deviceClass(states[id]));
  const picked = new Map<string, string>();
  for (const id of visible.filter((sensor) => rank(sensor) >= 0)) {
    const key = entities[id]?.device_id ? `device:${entities[id].device_id}` : id;
    const held = picked.get(key);
    if (!held || rank(id) < rank(held)) picked.set(key, id);
  }
  return [...picked.values()].sort(byName(states));
}

/*
 * Placing a row's cards (spec/deploy.md → The format → Placement). A row is a grid of tracks across and, down, rows of
 * the skin's unit: orb's 60 px, or one module in a skin whose rows hold one footprint. Every card is a block of whole
 * tracks and units, so placing is exact and the same on every render: it depends on the YAML and the row's width,
 * never on an entity's state.
 */

/** How a skin turns a row's width into tracks. */
export interface TrackPolicy {
  /** The space between tracks, in px. */
  gap: number;
  /** An explicit `columns` count yields a track whenever tracks would get narrower than this. */
  min: number;
  /** With `columns` left out, tracks are at least this wide. */
  preferred: number;
  /** The most tracks an automatic row takes. */
  max: number;
}

/** How many tracks of at least `track` px fit in `width` px. Never fewer than one. */
const fit = (width: number, track: number, gap: number) => Math.max(1, Math.floor((width + gap) / (track + gap)));

/**
 * A row's tracks at a width: its `columns`, or fewer where a track would be narrower than the skin's minimum; left out,
 * as many as fit at the preferred width. An unknown width (not yet measured, or hidden) draws the columns as written.
 */
export function trackCount(width: number | undefined, columns: number | undefined, policy: TrackPolicy): number {
  if (!width || width <= 0) return columns ?? 1;
  return columns ? Math.min(columns, fit(width, policy.min, policy.gap)) : Math.min(policy.max, fit(width, policy.preferred, policy.gap));
}

/** The width in px of a block `span` tracks wide, in a row `width` px wide with `tracks` tracks. */
export const spanWidth = (width: number | undefined, tracks: number, span: number, gap: number) =>
  width && width > 0 ? ((width - (tracks - 1) * gap) / tracks) * span + (span - 1) * gap : undefined;

/** One card to place: its width in columns, its anchor, and its height in units at the span it is given. */
export interface PlaceEntry {
  width: number | "full";
  column?: number;
  height: number | ((span: number) => number);
}

/** Where one card goes, in grid lines counted from 1: `column` / span `span`, `row` / span `height`. */
export interface Placed {
  column: number;
  span: number;
  row: number;
  height: number;
}

export interface RowPlacement {
  tracks: number;
  /** One per entry, in the entries' order (the reading order). */
  cells: Placed[];
  /** The row's height in units. */
  rows: number;
  /** Whether the entries' `column` anchors held: the row has as many tracks as it was written for. */
  anchored: boolean;
}

/**
 * Place a row's entries on `tracks` tracks.
 *
 * - A `width` wider than the tracks is clamped to them; `full` is every track.
 * - Anchors hold only while the row has the tracks it was written for (its `columns`, or, left out, the last column
 *   an anchor reaches); with fewer, every entry flows by the rules below, in order.
 * - `normal` flow keeps a cursor: each entry takes the first free place at or after the previous entry's, reading
 *   left to right, then down, so the visual order is the YAML's. An anchored entry looks only in its column.
 * - `dense` flow starts every entry from the top left, so a later entry may fill an earlier hole.
 * - `bottom` alignment moves each group of columns no entry spans out of (a stack, or a stack and the cards spanning
 *   it) down to the row's bottom, by whole units, keeping the spacing inside it. Nothing stretches.
 */
export function placeRow(entries: readonly PlaceEntry[], { tracks, columns, flow = "normal", align = "top" }: {
  tracks: number;
  columns?: number;
  flow?: "normal" | "dense";
  align?: "top" | "bottom";
}): RowPlacement {
  const across = Math.max(1, Math.floor(tracks));
  const spanOf = (entry: PlaceEntry) => (entry.width === "full" ? across : Math.min(Math.max(1, Math.floor(entry.width)), across));
  const reach = Math.max(0, ...entries.map((entry) => (entry.column ? entry.column + (entry.width === "full" ? 1 : entry.width) - 1 : 0)));
  const written = columns ?? reach;
  const anchored = entries.some((entry) => entry.column) && across >= written;
  const taken: boolean[][] = [];
  const free = (row: number, column: number, span: number, height: number) => {
    for (let r = row; r < row + height; r++) for (let c = column; c < column + span; c++) if (taken[r]?.[c]) return false;
    return true;
  };
  let cursor = { row: 0, column: 0 };
  const cells = entries.map((entry): Placed => {
    const span = spanOf(entry);
    const height = Math.max(1, Math.floor(typeof entry.height === "function" ? entry.height(span) : entry.height));
    const start = flow === "dense" ? { row: 0, column: 0 } : cursor;
    const anchor = anchored && entry.column ? Math.min(entry.column - 1, across - span) : undefined;
    let place: { row: number; column: number } | undefined;
    for (let row = start.row; !place; row++) {
      const first = row === start.row ? start.column : 0;
      if (anchor !== undefined) {
        if (anchor >= first && free(row, anchor, span, height)) place = { row, column: anchor };
        continue;
      }
      for (let column = first; column + span <= across; column++) {
        if (free(row, column, span, height)) { place = { row, column }; break; }
      }
    }
    for (let r = place.row; r < place.row + height; r++) {
      taken[r] ??= [];
      for (let c = place.column; c < place.column + span; c++) taken[r][c] = true;
    }
    cursor = { row: place.row, column: place.column + span };
    return { column: place.column + 1, span, row: place.row + 1, height };
  });
  const rows = Math.max(0, ...cells.map((cell) => cell.row - 1 + cell.height));
  if (align === "bottom" && cells.length) {
    // Columns joined by a card that spans them move together.
    const group = Array.from({ length: across }, (_, i) => i);
    const root = (i: number): number => (group[i] === i ? i : (group[i] = root(group[i])));
    for (const cell of cells) for (let c = cell.column; c < cell.column - 1 + cell.span; c++) group[root(c)] = root(cell.column - 1);
    const bottom = new Map<number, number>();
    for (const cell of cells) {
      const key = root(cell.column - 1);
      bottom.set(key, Math.max(bottom.get(key) ?? 0, cell.row - 1 + cell.height));
    }
    for (const cell of cells) cell.row += rows - bottom.get(root(cell.column - 1))!;
  }
  return { tracks: across, cells, rows, anchored };
}

/** The energy sources an automatic layout reads: the house's electricity, in the order its power comes. */
const ELECTRICITY = ["grid", "solar", "battery"] as const;

/** The objects in a list of the preferences, or none. */
const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item)) : [];

/**
 * The house's power and energy meters for an automatic layout, from Home Assistant's energy preferences (`energy`,
 * `energy/get_prefs`'s answer). Power now first, each source's `stat_rate`: the grid's, then solar's, then the
 * batteries', each in the order the preferences list them. Then the meters: grid consumption, grid return, solar
 * production, battery out, battery in. Only electricity: gas, water and the devices under device consumption are left
 * out. A grid's meters and power are read flat, as Home Assistant keeps them now, or from the `flow_from`, `flow_to` and
 * `power` lists it kept before. An id is kept only when it is a `sensor.*` in `states` (an external statistic,
 * `opower:…`, has none) that isn't hidden, config or diagnostic, and only once. Nothing without preferences, and
 * nothing with none of these.
 */
export function energySensors({ states, entities = {}, energy }: RoomSensorInput): string[] {
  const sources = records((energy as { energy_sources?: unknown } | undefined)?.energy_sources);
  const of = (type: string) => sources.filter((source) => source.type === type);
  /** Each source's `key`, then its lists' (`nested`), source by source. */
  const ids = (list: Record<string, unknown>[], key: string, nested: readonly string[] = []) =>
    list.flatMap((source) => [source[key], ...nested.flatMap((field) => records(source[field]).map((item) => item[key]))]);
  const power = ELECTRICITY.flatMap((type) => ids(of(type), "stat_rate", ["power", "flow_from", "flow_to"]));
  const meters = [
    ...ids(of("grid"), "stat_energy_from", ["flow_from"]),
    ...ids(of("grid"), "stat_energy_to", ["flow_to"]),
    ...ids(of("solar"), "stat_energy_from"),
    ...ids(of("battery"), "stat_energy_from"),
    ...ids(of("battery"), "stat_energy_to"),
  ];
  const shown = (id: unknown): id is string =>
    typeof id === "string" && id.startsWith("sensor.") && id in states && !entities[id]?.hidden && !entities[id]?.entity_category;
  return [...new Set([...power, ...meters].filter(shown))];
}
