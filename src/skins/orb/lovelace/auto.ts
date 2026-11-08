// Self-contained on purpose: the repo's dashboard.config.mjs imports this file through Node's type stripping for
// deploy. It may import @dashhaus/core/lovelace/layout, the package's pure layout entry, and nothing that reaches React.

import { areaId, areaName, byName, deviceCompanion, domainOf, dysonFans, energySensors, numericSensors, outsideArea, placeColumns, placeSection, roomSensors, safetySensors, visibleEntities, wallAreas, wallFootprint } from "@dashhaus/core/lovelace/layout";
import type { AutoInput as LayoutInput } from "@dashhaus/core/lovelace/layout";

export type { AutoInput, AutoState } from "@dashhaus/core/lovelace/layout";

type Card = string | Record<string, unknown>;
interface Row { title: string; columns?: number; cards: Card[] }
/** A wall's row: untitled, one column per area, or the Energy row. */
interface WallRow { title?: string; columns?: number; flow?: "dense"; cards: Card[] }

/**
 * An Owlet sock's sleep state sensor: config.ts's SHARED_KINDS draws it as the owlet card. This file imports only
 * the package's pure layout entry (deploy runs it through Node), so the pattern is repeated; auto.test.ts fails
 * when the two drift apart.
 */
const OWLET = /^sensor\.\w+_sleep_state$/;
/** UniFi Hotspot Manager's guest Wi-Fi code: SHARED_KINDS draws it as the guestWifi card, its pattern repeated here too. */
const VOUCHER = /^sensor\.\w+_voucher$/;

/** Each control domain's card, by the name every skin shares, for the wall's bands (`WALL_BANDS`). */
const CONTROL_CARDS: Record<string, string> = {
  cover: "cover",
  light: "light",
  switch: "toggle",
  humidifier: "humidifier",
  fan: "fan",
  media_player: "mediaPlayer",
  vacuum: "vacuum",
  // new-card: auto control cards
};

/** Everything the automatic layout finds in a house, each list by name, before it is laid out. */
function discover(input: LayoutInput) {
  const { states } = input;
  const visible = visibleEntities(input);
  const sorted = (ids: string[]) => ids.sort(byName(states));
  const ofDomain = (...domains: string[]) => sorted(visible.filter((id) => domains.includes(domainOf(id))));
  // Controls, by name.
  const controls = ofDomain(
    "cover",
    "light",
    "switch",
    "humidifier",
    "fan",
    "media_player",
    "vacuum",
    // new-card: auto controls
  );
  // A Dyson's fan draws the dyson card, its device's companions with it; a Hot+Cool's heater is one of them.
  const found = dysonFans(input);
  const dysonHeat = new Set(found.flatMap((d) => (d.heat ? [d.heat] : [])));
  return {
    alarms: ofDomain("alarm_control_panel"),
    // Locks join the alarm under Security, each with its device's battery where it has one.
    locks: ofDomain("lock").map((entity) => {
      const battery = deviceCompanion(input, entity, "battery");
      return { entity, footprint: "compact", ...(battery && { battery }) } as Record<string, unknown> & { entity: string };
    }),
    // Then the safety glance: doors, windows, leaks and smoke (`SAFETY_CLASSES`), each with its device's battery.
    safety: safetySensors(input).map(({ entity, battery }) => ({ entity, footprint: "compact", ...(battery && { battery }) }) as Record<string, unknown> & { entity: string }),
    // Cameras, each at its standard footprint so its still shows (a compact row never draws one), by name.
    cameras: ofDomain("camera"),
    weather: ofDomain("weather")[0] as string | undefined,
    // The sun, beside the weather: when it next sets or rises.
    sun: ofDomain("sun")[0] as string | undefined,
    climate: ofDomain("climate").filter((id) => !dysonHeat.has(id)),
    dysons: new Set(found.map((d) => d.fan)),
    // Room air: one card per device with a temperature (or, failing that, humidity) reading.
    rooms: roomSensors(input).map(({ entity, humidity, battery }): Card => (
      humidity || battery ? { entity, ...(humidity && { humidity }), ...(battery && { battery }) } : entity
    )),
    // Then the room's air quality, one numeric reading per device (`NUMERIC_CLASSES`: CO₂ first). The sensor card stays
    // the domain's default, so these name their card.
    quality: numericSensors(input).map((entity): Card => ({ entity, card: "numeric" })),
    modes: ofDomain("input_boolean"),
    socks: sorted(visible.filter((id) => OWLET.test(id))),
    wifi: sorted(visible.filter((id) => VOUCHER.test(id))),
    calendars: ofDomain("calendar"),
    controls,
  };
}

/** How `autoDashboard` lays the house out. */
export interface AutoOptions {
  /**
   * `wall`: one column per area, for a panel on a wall (spec/deploy.md → The wall layout). Left out, the bands as
   * titled rows, the most pressing first.
   */
  layout?: "wall";
}

/**
 * A starting dashboard config for a house, as titled `rows`: actionable rows first, then household status, then
 * the outside, room and energy glance. Automatic discovery cannot know which controls a person uses most,
 * so it keeps all discovered actions in deterministic domain/area order for the person to refine.
 * No featured hero is chosen; compact rows carry secondary controls. `layout: "wall"` lays the same cards out one
 * column per area instead (`wallDashboard`). Either way it is a layout only: `viewing` and `nav` are the caller's.
 */
export function autoDashboard(input: LayoutInput, title = "Home", { layout }: AutoOptions = {}): Record<string, unknown> {
  if (layout === "wall") return wallDashboard(input, title);
  const { areas = {} } = input;
  const areaOf = (id: string) => {
    const area = areaId(input, id);
    return area && areas[area] ? area : undefined;
  };
  const { alarms, locks, safety, cameras, weather, sun, climate, dysons, rooms, quality, modes, socks, wifi, calendars, controls } = discover(input);

  const rows: Row[] = [];
  // One row per title: a row that would repeat one (an area called Nursery or Outside) joins it, so the page never
  // shows two rows of one name, and a nav to one never lands on the other.
  const place = (row: Row) => placeSection(rows, row);

  if (climate.length) {
    place({ title: "Comfort", cards: climate.map((entity, i) => (i === 0 ? entity : { entity, footprint: "compact" })) });
  }

  const air: Card[] = [...rooms, ...quality];

  if (modes.length) place({ title: "Modes", columns: 2, cards: modes.map((entity) => ({ entity, footprint: "compact" })) });

  // Controls, one row per area, then whatever has no area.
  const groups = new Map<string, string[]>();
  for (const id of controls) {
    const key = areaOf(id) ?? "";
    groups.set(key, [...(groups.get(key) ?? []), id]);
  }
  const order = [
    "cover",
    "light",
    "switch",
    "humidifier",
    "fan",
    "media_player",
    "vacuum",
    // new-card: auto order
  ];
  const areaIds = [...groups.keys()].filter(Boolean).sort((a, b) => areas[a].name.localeCompare(areas[b].name));
  for (const key of [...areaIds, ""]) {
    const ids = groups.get(key);
    if (!ids) continue;
    ids.sort((a, b) => order.indexOf(domainOf(a)) - order.indexOf(domainOf(b)));
    place({ title: key ? areas[key].name : "Other", cards: ids.map((entity) => ({ entity, footprint: "compact", ...(dysons.has(entity) && { card: "dyson" }) })) });
  }

  // Automatic discovery cannot infer true frequency. It puts every action first, then the status bands, the most
  // pressing first, then read-only environmental context; authored dashboards pin their actual frequent actions. A
  // row for a new kind goes at the end of its band (spec/deploy.md → The automatic layout's order).
  // Safety and security.
  if (alarms.length || locks.length || safety.length) place({ title: "Security", cards: [...alarms.map((entity) => ({ entity, footprint: "compact" })), ...locks, ...safety] });
  // Security-adjacent: what the doors and the nursery look like, right after what guards them.
  if (cameras.length) place({ title: "Cameras", cards: cameras });
  // Household status: the nursery, then the guest Wi-Fi code a visitor reads, then the calendars; a new household-status
  // row goes after them.
  if (socks.length) place({ title: "Nursery", cards: socks });
  if (wifi.length) place({ title: "Guests", cards: wifi });
  // Every calendar, what's next and when: after the guests, before the glance.
  if (calendars.length) place({ title: "Calendar", cards: calendars });
  // The glance.
  if (weather || sun) place({ title: "Outside", cards: [weather, sun].filter((id): id is string => id !== undefined) });
  if (air.length) place({ title: "Rooms", cards: air });
  // Then the house's power and energy meters from Home Assistant's energy preferences (`energySensors`), last: they
  // land after the first draw, so nothing above moves when they do. Standard, so a meter's today says what it rose.
  const energy = energyRow(input, rows.flatMap((row) => row.cards));
  if (energy) place(energy);

  // Nothing to place yet (entities still loading, or no supported domain): stay in automatic mode.
  return rows.length ? { type: "custom:dashhaus-orb", title, rows } : { type: "custom:dashhaus-orb", title };
}

const entityOf = (card: Card) => (typeof card === "string" ? card : card.entity as string);

/** The Energy row: the house's meters from its energy preferences, as numeric cards, less any `placed` already draws. */
function energyRow(input: LayoutInput, placed: readonly Card[]): Row | undefined {
  const drawn = new Set(placed.map(entityOf));
  const energy = energySensors(input).filter((entity) => !drawn.has(entity));
  return energy.length ? { title: "Energy", cards: energy.map((entity) => ({ entity, card: "numeric" })) } : undefined;
}

/**
 * The most areas side by side on Orb's wall: three, so at 1280 px each column is about 410 px and a compact card keeps
 * its inline control and names (it gives way under 320 px); four would be 306.
 */
export const WALL_COLUMNS = 3;

/** One wall card: its card config, and the card every skin's bands know it by. */
interface WallCard { config: Card; card: string }

/**
 * The house one column per area, for a panel on a wall (spec/deploy.md → The wall layout): every card the automatic
 * layout finds, in the shared bands and areas (`wallAreas`), each area a column in its band order, what is pressed
 * compact and what is read standard (`wallFootprint`), three areas across (`WALL_COLUMNS`), wrapping in area-name
 * order into further rows, and the house's own cards, those in no area, the last column of the first. Each row is
 * anchored column by column with `flow: dense`, so every column starts at the top; narrower than the row's columns,
 * the anchors release and it reads area by area. The house's energy meters are their own row, last, as always. Fewer
 * than two areas: one row, every card in band order.
 */
function wallDashboard(input: LayoutInput, title: string): Record<string, unknown> {
  const { alarms, locks, safety, cameras, weather, sun, climate, rooms, quality, modes, socks, wifi, calendars, controls } = discover(input);
  const id = (card: string) => (config: Card): WallCard => ({ config, card });
  const cards: WallCard[] = [
    ...climate.map(id("climate")),
    ...modes.map(id("toggle")),
    ...controls.map((entity) => ({ config: entity, card: CONTROL_CARDS[domainOf(entity)] })),
    ...alarms.map(id("alarm")),
    ...locks.map(id("lock")),
    ...safety.map(id("binarySensor")),
    ...cameras.map(id("camera")),
    ...socks.map(id("owlet")),
    ...wifi.map(id("guestWifi")),
    ...calendars.map(id("calendar")),
    ...(weather ? [id("weather")(weather)] : []),
    ...(sun ? [id("sun")(sun)] : []),
    ...rooms.map(id("sensor")),
    ...quality.map(id("numeric")),
  ];
  const { areas, house } = wallAreas(cards, { card: (item) => item.card, area: (item) => areaName(input, entityOf(item.config)), outside: outsideArea(input) });
  /** A card as the wall writes it: its column's area where it has none of its own (the weather and the sun in Outside). */
  const written = (item: WallCard, column?: number, area?: string): Card => {
    // The wall sets the footprint, so a card's own (a lock's compact) gives way to it.
    const { entity, ...rest } = typeof item.config === "string" ? { entity: item.config } : item.config;
    delete rest.footprint;
    const own = area && !areaName(input, entity as string) ? { area } : {};
    const compact = wallFootprint(item.card) === "compact" ? { footprint: "compact" } : {};
    const placed = { entity, ...(column && { column }), ...compact, ...rest, ...own };
    return Object.keys(placed).length === 1 ? (entity as string) : placed;
  };
  const rows: WallRow[] = areas.length
    ? placeColumns<{ item: WallCard; area?: string }>(areas.map((area) => area.items.map((item) => ({ item, area: area.area }))), WALL_COLUMNS, house.map((item) => ({ item })))
      .map((row) => ({ columns: row.columns, flow: "dense", cards: row.cards.map(({ card, column }) => written(card.item, column, card.area)) }))
    : house.length ? [{ cards: house.map((item) => written(item)) }] : [];
  const energy = energyRow(input, rows.flatMap((row) => row.cards));
  if (energy) rows.push(energy);
  return rows.length ? { type: "custom:dashhaus-orb", title, rows } : { type: "custom:dashhaus-orb", title, layout: "wall" };
}
