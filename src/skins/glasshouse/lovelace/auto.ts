import { friendlyName, groupByArea, roomSensors, sortByName, visibleEntities } from "@dashhaus/core/lovelace/layout";
import type { AutoInput } from "@dashhaus/core/lovelace/layout";
import { glasshouseKindOf, GLASSHOUSE_CARDS } from "./registry";
import type { CardConfig, RowLayoutConfig } from "./config";

export type { AutoInput } from "@dashhaus/core/lovelace/layout";
export { areaName, groupByArea } from "@dashhaus/core/lovelace/layout";

/** Every supported visible entity, with room sensors reduced to one Card per device (its humidity and battery as
 * companions) and one weather Card. */
export function autoCards(input: AutoInput): CardConfig[] {
  const { states } = input;
  const visible = visibleEntities(input, (entity) => glasshouseKindOf(entity) !== undefined);
  const cards = sortByName(visible.flatMap((entity): CardConfig[] => {
    const kind = glasshouseKindOf(entity);
    return kind ? [{ entity, kind }] : [];
  }), (card) => friendlyName(states, card.entity));
  const others = cards.filter((card) => card.kind !== "sensor" && card.kind !== "weather");
  const weather = cards.find((card) => card.kind === "weather");
  const sensors = "sensor" in GLASSHOUSE_CARDS ? roomSensors(input).map(({ entity, ...companions }): CardConfig => ({ entity, kind: "sensor", ...(Object.keys(companions).length && { companions }) })) : [];
  return sortByName([...others, ...(weather ? [weather] : []), ...sensors], (card) => friendlyName(states, card.entity));
}

/** The automatic layout by area: a row per area, titled with its name, Cards by name. */
export const areaRows = (cards: readonly CardConfig[]): RowLayoutConfig[] =>
  groupByArea(cards).map((group) => ({ title: group.area, flow: "normal", align: "top", cards: group.modules.map((item) => ({ item, width: 1 })) }));

/** Where each kind goes in Glasshouse's own automatic layout, and how wide it is drawn. */
const GLASS_ROWS: { title: string; kinds: readonly string[]; footprint?: "compact" }[] = [
  { title: "Overview", kinds: ["weather", "climate", "lock"] },
  { title: "Rooms", kinds: ["sensor"] },
  { title: "Devices", kinds: ["light", "toggle"], footprint: "compact" },
];

/**
 * Glasshouse's automatic layout, after the reference: an Overview of the outdoors (two tracks wide), the thermostats
 * and the locks; then Rooms, one air card per room; then Devices, every light and switch as a compact row with its
 * switch, ordered by area. Any other kind gets a row of its own after them. Empty rows are left out.
 */
export function glassRows(cards: readonly CardConfig[]): RowLayoutConfig[] {
  const byArea = (a: CardConfig, b: CardConfig) => (a.area ?? "\uffff").localeCompare(b.area ?? "\uffff");
  const placed = new Set<string>(GLASS_ROWS.flatMap((row) => row.kinds));
  const rows = GLASS_ROWS.map(({ title, kinds, footprint }) => {
    const own = cards.filter((card) => kinds.includes(card.kind)).sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || (footprint ? byArea(a, b) : 0));
    return {
      title,
      flow: "normal" as const,
      align: "top" as const,
      cards: own.map((card) => ({ item: footprint ? { ...card, footprint } : card, width: card.kind === "weather" ? 2 : 1 })),
    };
  });
  const others = groupByArea(cards.filter((card) => !placed.has(card.kind))).map((group) => ({ title: group.area, flow: "normal" as const, align: "top" as const, cards: group.modules.map((item) => ({ item, width: 1 })) }));
  return [...rows, ...others].filter((row) => row.cards.length > 0);
}
