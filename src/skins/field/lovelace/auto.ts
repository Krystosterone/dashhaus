import { deviceCompanion, dysonFans, energySensors, friendlyName, groupByArea, numericSensors, placeColumns, roomSensors, safetySensors, sortByName, visibleEntities, wallAreas, wallFootprint } from "@dashhaus/core/lovelace/layout";
import type { AutoInput } from "@dashhaus/core/lovelace/layout";
import { kindOf } from "./config";
import type { FieldRow, ModuleConfig } from "./config";
import type { FieldFootprint } from "../shared/ui";

export type { AutoInput } from "@dashhaus/core/lovelace/layout";
export { areaName, groupByArea } from "@dashhaus/core/lovelace/layout";

/**
 * Every supported entity Field can draw, for a card without `cards` or `rows`, as the card its entity id picks: hidden and
 * config or diagnostic entities left out, sorted by name. The sensor card takes only room air: one per device, its
 * humidity and battery as companions (`roomSensors`). The weather card takes the first weather entity by name, as
 * orb's does, with `sun.sun` for night. Every input_boolean and switch is a toggle, every humidifier a humidifier, every
 * fan a fan (a Dyson's, found by the night-mode switch and filter sensor named after it, the dyson module, its heater
 * drawn by it and not on its own, `dysonFans`), every cover a cover, every media_player a media player, every vacuum a vacuum, every alarm_control_panel an alarm, every lock a lock with its device's battery (`deviceCompanion`), every `sensor.*_sleep_state` an Owlet sock (its readings are
 * found beside it, so they aren't drawn on their own), and every `sensor.*_voucher` a guest Wi-Fi code (its QR code and
 * buttons likewise), and every calendar a calendar. The binary sensor card takes only the safety glance, as orb's does: every door, window, leak and
 * smoke sensor (`safetySensors`), with its device's battery. Every camera is a camera, its still on a standard module.
 * The numeric card takes the room's air quality, one reading per
 * device (`numericSensors`: CO₂ first); power, energy and any other reading are added by hand, but for the house's own
 * meters, which `energyModules` finds. The dashboard groups them by area.
 */
export function autoModules(input: AutoInput): ModuleConfig[] {
  const { states } = input;
  // A Dyson's fan draws the dyson module, its device's companions with it; a Hot+Cool's heater is one of them.
  const dysons = dysonFans(input);
  const dyson = new Set(dysons.map((d) => d.fan));
  const dysonHeat = new Set(dysons.flatMap((d) => (d.heat ? [d.heat] : [])));
  const visible = visibleEntities(input, (entity) => kindOf(entity) !== undefined && !dysonHeat.has(entity));
  const cards = sortByName(visible.flatMap((entity): ModuleConfig[] => {
    const kind = dyson.has(entity) ? "dyson" : kindOf(entity);
    if (kind !== "lock") return kind ? [{ entity, kind }] : [];
    const battery = deviceCompanion(input, entity, "battery");
    return [{ entity, kind, ...(battery && { battery }) }];
  }), (module) => friendlyName(states, module.entity));
  const others = cards.filter((module) => module.kind !== "sensor" && module.kind !== "weather" && module.kind !== "binarySensor");
  const weather = cards.find((module) => module.kind === "weather");
  const sensors = roomSensors(input).map((room): ModuleConfig => ({ ...room, kind: "sensor" }));
  const safety = safetySensors(input).map((sensor): ModuleConfig => ({ ...sensor, kind: "binarySensor" }));
  const air = numericSensors(input).map((entity): ModuleConfig => ({ entity, kind: "numeric" }));
  return sortByName([...others, ...(weather ? [{ ...weather, sun: "sun.sun" }] : []), ...sensors, ...safety, ...air], (module) => friendlyName(states, module.entity));
}

/**
 * The house's power and energy meters from Home Assistant's energy preferences (`energySensors`: power now, then the
 * meters), as numeric modules in that order, leaving out any of `modules` already draws. Nothing without preferences.
 */
export function energyModules(input: AutoInput, modules: readonly ModuleConfig[] = []): ModuleConfig[] {
  const drawn = new Set(modules.map((module) => module.entity));
  return energySensors(input).filter((entity) => !drawn.has(entity)).map((entity): ModuleConfig => ({ entity, kind: "numeric" }));
}

/** The title of the automatic layout's row for the house's energy, as Orb's. */
const ENERGY = "Energy";

/**
 * The automatic layout's rows: one per area, titled with its name (`groupByArea`), modules by name, then the house's
 * `energy` under Energy, last and in its own order, not by area: the preferences land after the first draw, so nothing
 * above moves when they do. An area called Energy takes them instead, so the page never shows two rows of one name.
 */
export function areaRows(modules: readonly ModuleConfig[], energy: readonly ModuleConfig[] = []): FieldRow[] {
  const rows: FieldRow[] = groupByArea(modules).map((group) => ({ title: group.area, flow: "normal", align: "top", cards: group.modules.map((item) => ({ item, width: 1 })) }));
  if (!energy.length) return rows;
  const cards = energy.map((item) => ({ item, width: 1 }));
  const same = rows.find((row) => row.title?.toLowerCase() === ENERGY.toLowerCase());
  if (same) same.cards.push(...cards);
  else rows.push({ title: ENERGY, flow: "normal", align: "top", cards });
  return rows;
}

/**
 * The most areas side by side on Field's wall: three, as many of a row's 300 px tracks as fit its 1240 px page, so a
 * column's rows keep their names whole across the room (four would be 293 px). A narrower page takes fewer.
 */
export const WALL_COLUMNS = 3;

/**
 * The automatic layout one column per area, for a panel on a wall (`layout: wall`, spec/deploy.md → The wall layout):
 * the shared bands and areas (`wallAreas`), three areas across (`WALL_COLUMNS`), wrapping in `order` (Home
 * Assistant's, `areaOrder`) into further rows, and the modules with no area, the house's own, the last column of the first. Each column leads with
 * its whole modules and takes its 64 px rows under them, each kind in its band's order: what is read whole (a door,
 * a camera, a sock, the weather, a room's air), what is pressed a row (`wallFootprint`). A `footprint` the YAML sets
 * holds for every module instead. A row that mixes footprints stacks them by column (`stacks`, as the reader marks a
 * row it reads); one of a single footprint is a grid anchored column by column with `flow: dense`, so every column
 * starts at the top. The house's `energy` is its own row, last, under Energy, as `areaRows` has it; the weather and
 * the sun join the area named `outside`, saying so. Fewer than two areas: the whole modules, then the rows, each a
 * row of its own.
 */
export function areaColumns(modules: readonly ModuleConfig[], energy: readonly ModuleConfig[] = [], { outside, footprint, order }: { outside?: string; footprint?: FieldFootprint; order?: readonly string[] } = {}): FieldRow[] {
  const sized = (item: ModuleConfig): ModuleConfig => (footprint ? item : { ...item, footprint: wallFootprint(item.kind) });
  const own = (item: ModuleConfig) => item.footprint ?? footprint ?? "standard";
  // Whole modules first, then the rows, each in band order: a stable sort keeps it.
  const stack = (items: readonly ModuleConfig[]) => items.map(sized).sort((a, b) => Number(own(a) === "compact") - Number(own(b) === "compact"));
  const { areas, house } = wallAreas(modules, { card: (item) => item.kind, area: (item) => item.area, outside, order });
  const row = (cards: FieldRow["cards"], columns?: number): FieldRow => {
    const mixed = new Set(cards.map((entry) => own(entry.item))).size > 1;
    return { ...(columns && { columns }), flow: mixed || !columns ? "normal" : "dense", align: "top", cards, ...(mixed && { stacks: true }) };
  };
  const rows: FieldRow[] = areas.length
    ? placeColumns(areas.map((area) => stack(area.items).map((item) => (item.area ? item : { ...item, area: area.area }))), WALL_COLUMNS, stack(house))
      .map((columnRow) => row(columnRow.cards.map(({ card, column }) => ({ item: card, width: 1, column })), columnRow.columns))
    : (["standard", "compact"] as const).flatMap((size) => {
      const cards = stack(house).filter((item) => own(item) === size).map((item) => ({ item, width: 1 as const }));
      return cards.length ? [row(cards)] : [];
    });
  if (energy.length) rows.push({ title: ENERGY, flow: "normal", align: "top", cards: energy.map((item) => ({ item, width: 1 })) });
  return rows;
}
