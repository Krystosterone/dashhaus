import { friendlyName, groupByArea, roomSensors, sortByName, visibleEntities } from "@dashhaus/dashboard/layout";
import type { AutoInput } from "@dashhaus/dashboard/layout";
import { lcarsKindOf, LCARS_CARDS } from "./registry";
import type { CardConfig, SectionConfig } from "./config";

export type { AutoInput } from "@dashhaus/dashboard/layout";
export { areaName, groupByArea } from "@dashhaus/dashboard/layout";

/** Every supported visible entity, with room sensors reduced to one Card per device and one weather Card. */
export function autoCards(input: AutoInput): CardConfig[] {
  const { states } = input;
  const visible = visibleEntities(input, (entity) => lcarsKindOf(entity) !== undefined);
  const cards = sortByName(visible.flatMap((entity): CardConfig[] => {
    const kind = lcarsKindOf(entity);
    return kind ? [{ entity, kind }] : [];
  }), (card) => friendlyName(states, card.entity));
  const others = cards.filter((card) => card.kind !== "sensor" && card.kind !== "weather");
  const weather = cards.find((card) => card.kind === "weather");
  const sensors = "sensor" in LCARS_CARDS ? roomSensors(input).map(({ entity, humidity, battery }) => ({ entity, kind: "sensor", humidity, battery })) : [];
  return sortByName([...others, ...(weather ? [weather] : []), ...sensors], (card) => friendlyName(states, card.entity));
}

export const areaSections = (cards: readonly CardConfig[]): SectionConfig[] =>
  groupByArea(cards).map((group) => ({ kind: "section", title: group.area, cards: group.modules }));
