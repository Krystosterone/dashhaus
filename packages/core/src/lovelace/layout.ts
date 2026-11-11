import type { AutoEntityEntry } from "./element";
import type { BinarySensorClass } from "../entities/binarySensor/types";
import type { NumericClass } from "../entities/numeric/types";
import type { EnergyPrefs } from "../ha/energy";
import type { Raw, Reader } from "./schema";

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
  /** The area registry (`hass.areas`), keyed in Home Assistant's own order, with each area's floor. */
  areas?: Record<string, { name: string; floor_id?: string | null }>;
  /** The floor registry (`hass.floors`), keyed in Home Assistant's own order: with `areas`, the wall's (`areaOrder`). */
  floors?: Record<string, object>;
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
 * `states` and `entities` are read as snapshots, the way `hass` hands them out: each pair's devices are indexed once and
 * kept for as long as the objects live, so pass new objects for a changed house rather than editing them in place.
 */
export function deviceCompanion({ states, entities = {} }: RoomSensorInput, entity: string, cls: string, domain = "sensor"): string | undefined {
  const device = entities[entity]?.device_id;
  if (!device) return undefined;
  return devicesIndex(states, entities).get(device)?.find((id) => id !== entity && id.startsWith(`${domain}.`) && !entities[id]?.hidden && deviceClass(states[id]) === cls);
}

/** Each `states`/`entities` pair's device → entity ids, in `states`' key order, built once per layout. */
const deviceIndexes = new WeakMap<RoomSensorInput["states"], WeakMap<Record<string, AutoEntityEntry>, Map<string, string[]>>>();

/**
 * Every device's entity ids, in `states`' own key order, so a companion lookup reads one device's entities and not the
 * whole house. Kept per pair of objects: `hass` replaces `states` and `entities` on a change rather than editing them.
 */
function devicesIndex(states: RoomSensorInput["states"], entities: Record<string, AutoEntityEntry>): Map<string, string[]> {
  let byEntities = deviceIndexes.get(states);
  if (!byEntities) deviceIndexes.set(states, (byEntities = new WeakMap()));
  let index = byEntities.get(entities);
  if (!index) {
    index = new Map();
    for (const id of Object.keys(states)) {
      const device = entities[id]?.device_id;
      if (!device) continue;
      const list = index.get(device);
      if (list) list.push(id);
      else index.set(device, [id]);
    }
    byEntities.set(entities, index);
  }
  return index;
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
 * The wall (spec/deploy.md → The wall layout): one column per area, for a panel on a wall. Every skin's automatic wall
 * uses the same bands, the same areas and the same columns; each skin only orders a column's stack in its own idiom
 * and draws it.
 */

/** A wall column's bands, the most pressing first: what is pressed, what guards the house, what it looks like, the household's status, then the glance. */
export type WallBand = "actions" | "security" | "cameras" | "status" | "glance";

/**
 * Each band's cards, by the card name every skin shares (`light`, `binarySensor`), in the order a column stacks them:
 * the automatic layout's bands (spec/deploy.md → The automatic layout's order), within one area. A card in no band
 * still goes in its column, after the glance.
 */
export const WALL_BANDS: Readonly<Record<WallBand, readonly string[]>> = {
  actions: [
    "climate",
    "cover",
    "light",
    "toggle",
    "sound",
    "humidifier",
    "fan",
    "dyson",
    "mediaPlayer",
    "vacuum",
    // new-card: wall actions
  ],
  security: ["alarm", "lock", "binarySensor"],
  cameras: ["camera"],
  status: ["owlet", "guestWifi", "calendar"],
  glance: ["weather", "sun", "sensor", "numeric"],
};

const WALL_ORDER: readonly string[] = Object.values(WALL_BANDS).flat();
/** The cards a person presses on a wall: every action, and the alarm and the locks that guard the house. */
const WALL_PRESSED: readonly string[] = [...WALL_BANDS.actions, "alarm", "lock"];

/** A card's band on a wall, or none for a card in no band, which goes after the glance. */
export function wallBand(card: string): WallBand | undefined {
  return (Object.keys(WALL_BANDS) as WallBand[]).find((band) => WALL_BANDS[band].includes(card));
}

/**
 * A card's footprint on a wall: `compact` for what is pressed (the actions, the alarm, a lock), `standard` for what is
 * read across the room (a door, a camera's still, a sock, the weather, a room's air) and any card in no band. No
 * featured hero.
 */
export const wallFootprint = (card: string): "compact" | "standard" => (WALL_PRESSED.includes(card) ? "compact" : "standard");

/** The name of the house's area called Outside, as Home Assistant spells it, where it has one. */
export function outsideArea(input: Pick<AutoInput, "areas">): string | undefined {
  return Object.values(input.areas ?? {}).find((area) => area.name.trim().toLowerCase() === "outside")?.name;
}

/**
 * The house's area names in Home Assistant's own order, the one a person sets under Settings → Areas, labels & zones
 * → Reorder and Home Assistant's own areas dashboard follows: the areas of each floor in floor order, then the areas
 * on no floor, each in the area registry's order. The registries keep that order and the frontend keys `hass.areas`
 * and `hass.floors` in it (an id that reads as a whole number, as `"101"`, sorts first among its keys, as JavaScript
 * keeps them). An area whose floor isn't in `floors` counts as on none.
 */
export function areaOrder(input: Pick<AutoInput, "areas" | "floors">): string[] {
  const floors = Object.keys(input.floors ?? {});
  const floorOf = (floor: string | null | undefined) => {
    const at = floor ? floors.indexOf(floor) : -1;
    return at < 0 ? floors.length : at;
  };
  return Object.values(input.areas ?? {})
    .map((area, at) => ({ name: area.name, floor: floorOf(area.floor_id), at }))
    .sort((a, b) => a.floor - b.floor || a.at - b.at)
    .map((area) => area.name);
}

/** The arrangements an automatic layout takes (a skin's YAML `layout`): `wall`, one column per area. */
export const AUTO_LAYOUTS = ["wall"] as const;
export type AutoLayout = (typeof AUTO_LAYOUTS)[number];

/**
 * A skin's top-level `layout`: how its automatic layout arranges the house. It is the automatic layout's, so a page
 * laid out in YAML (`cards`, `rows`) or with `pages` is refused it, with the key to leave out.
 */
export function readAutoLayout(read: Reader, raw: Raw): AutoLayout | undefined {
  if (raw.layout == null) return undefined;
  const layout = read.choice(raw, "layout", "", AUTO_LAYOUTS);
  for (const key of ["cards", "rows", "pages"]) {
    if (raw[key] != null) read.problem("layout", `"layout" lays the house out automatically: leave out "${key}", or leave out "layout"`);
  }
  return layout;
}

/** One area on a wall: its name and its cards, in band order. */
export interface WallArea<I> {
  area: string;
  items: I[];
}

/** A house as a wall's areas, and the house's own cards, the ones in no area. */
export interface WallAreas<I> {
  areas: WallArea<I>[];
  house: I[];
}

/**
 * A house's cards as a wall's areas: one per area that has a card, in `order` (Home Assistant's, from `areaOrder`), an
 * area it doesn't name (one the YAML's `area:` made up) after them by name, and the house's own cards, those in
 * no area, each list in band order (`WALL_BANDS`, then the cards' own order). The weather and the sun, which have no
 * area, join the area called `outside` where the house has one (`outsideArea`), and are the house's otherwise. With
 * fewer than two areas a column per area says nothing, so there are none, and every card is the house's, in band
 * order, for the skin to flow across the page.
 */
export function wallAreas<I>(items: readonly I[], { card, area, outside, order = [] }: {
  /** The card that draws an item, by its shared name. */
  card: (item: I) => string;
  /** An item's area name, from the YAML or Home Assistant's registries. */
  area: (item: I) => string | undefined;
  outside?: string;
  /** The areas' order, by name (`areaOrder`), compared without case or the spaces around it. */
  order?: readonly string[];
}): WallAreas<I> {
  const placed = [...items];
  const rank = (item: I) => {
    const at = WALL_ORDER.indexOf(card(item));
    return at < 0 ? WALL_ORDER.length : at;
  };
  const inOrder = (list: readonly I[]) => [...list].sort((a, b) => rank(a) - rank(b));
  const areaOf = (item: I) => area(item) ?? (outside && (card(item) === "weather" || card(item) === "sun") ? outside : undefined);
  const groups = groupByArea(placed.map((item) => ({ item, area: areaOf(item) })));
  const key = (name: string) => name.trim().toLowerCase();
  const ranks = order.map(key);
  const at = (name: string) => {
    const rank = ranks.indexOf(key(name));
    return rank < 0 ? ranks.length : rank;
  };
  // Grouped by name, so a stable sort leaves the areas `order` doesn't name in name order, after the rest.
  const areas = groups
    .flatMap((group) => (group.area == null ? [] : [{ area: group.area, items: inOrder(group.modules.map((entry) => entry.item)) }]))
    .sort((a, b) => at(a.area) - at(b.area));
  if (areas.length < 2) return { areas: [], house: inOrder(placed) };
  return { areas, house: inOrder(groups.find((group) => group.area == null)?.modules.map((entry) => entry.item) ?? []) };
}

/** One row of a wall: `columns` columns, each card in the column it was given. */
export interface ColumnRow<C> {
  columns: number;
  cards: { card: C; column: number }[];
}

/**
 * Columns side by side in rows of at most `most`, wrapping in order into further rows, and `last`, when it has any
 * cards, as the last column of the first row, never wrapped: a wall's areas, then the house's own. Every row is as
 * many columns as the first, so the columns line up down the page; a row's cards run column by column, each column's
 * in its order.
 */
export function placeColumns<C>(columns: readonly (readonly C[])[], most: number, last: readonly C[] = []): ColumnRow<C>[] {
  const across = Math.max(1, Math.floor(most));
  const first = last.length ? Math.max(1, across - 1) : across;
  const rows: (readonly C[])[][] = [[...columns.slice(0, first), ...(last.length ? [last] : [])]];
  for (let i = first; i < columns.length; i += across) rows.push(columns.slice(i, i + across));
  const width = rows[0].length;
  return rows
    .filter((row) => row.some((column) => column.length))
    .map((row) => ({ columns: Math.max(1, width), cards: row.flatMap((column, i) => column.map((card) => ({ card, column: i + 1 }))) }));
}

/** Two area names the same, as a person reads them: case and the spaces around them don't count. */
const sameArea = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The area each column of a row names, where it names one (spec/deploy.md → The wall layout → A column names its
 * area): an untitled row whose every card is anchored to a column at width 1, each column's area where all its cards
 * share one (`areaOf`: the card's own, or Home Assistant's), and `undefined` at a column of several or none. None for
 * any other row, or one with no column of one area. Every skin's renderer heads its columns from it.
 */
export function columnAreas<I>(
  row: { title?: string; columns?: number; cards: readonly { item: I; column?: number; width?: number | "full" }[] },
  areaOf: (item: I) => string | undefined,
): (string | undefined)[] | undefined {
  if (row.title || !row.cards.length || row.cards.some((entry) => !entry.column || entry.width !== 1)) return undefined;
  const columns = Math.max(row.columns ?? 0, ...row.cards.map((entry) => entry.column ?? 1));
  const areas = Array.from({ length: columns }, (_, c) => {
    const named = row.cards.filter((entry) => entry.column === c + 1).map((entry) => areaOf(entry.item));
    const [first] = named;
    return first && named.every((area) => area && sameArea(area, first)) ? first : undefined;
  });
  return areas.some(Boolean) ? areas : undefined;
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
