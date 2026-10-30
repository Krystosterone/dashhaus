import type { AutoEntityEntry } from "../../../ha/lovelace/element";
import { roomSensors } from "../../../ha/lovelace/rooms";
import { __skinVar__KindOf, __SKIN_CONST___CARDS } from "./registry";
import type { CardConfig, SectionConfig } from "./config";

export interface AutoInput {
  states: Record<string, { attributes: Record<string, unknown> }>;
  entities?: Record<string, AutoEntityEntry>;
  devices?: Record<string, { area_id?: string | null }>;
  areas?: Record<string, { name: string }>;
}

export function areaName(input: AutoInput, entityId: string): string | undefined {
  const entry = input.entities?.[entityId];
  const areaId = entry?.area_id ?? (entry?.device_id ? input.devices?.[entry.device_id]?.area_id : undefined);
  return areaId ? input.areas?.[areaId]?.name : undefined;
}

/** Every supported visible entity, with room sensors reduced to one Card per device and one weather Card. */
export function autoCards(input: AutoInput): CardConfig[] {
  const { states, entities = {} } = input;
  const name = (card: CardConfig) => String(states[card.entity]?.attributes.friendly_name ?? card.entity);
  const visible = Object.keys(states).flatMap((entity): CardConfig[] => {
    const entry = entities[entity];
    const kind = __skinVar__KindOf(entity);
    return !entry?.hidden && !entry?.entity_category && kind ? [{ entity, kind }] : [];
  }).sort((a, b) => name(a).localeCompare(name(b)));
  const others = visible.filter((card) => card.kind !== "sensor" && card.kind !== "weather");
  const weather = visible.find((card) => card.kind === "weather");
  const sensors = "sensor" in __SKIN_CONST___CARDS ? roomSensors(input).map(({ entity }) => ({ entity, kind: "sensor" })) : [];
  return [...others, ...(weather ? [weather] : []), ...sensors].sort((a, b) => name(a).localeCompare(name(b)));
}

export function groupByArea<M extends { area?: string }>(cards: readonly M[]) {
  const groups = new Map<string | undefined, M[]>();
  for (const card of cards) groups.set(card.area, [...(groups.get(card.area) ?? []), card]);
  return [...groups.entries()].sort(([a], [b]) => a == null ? 1 : b == null ? -1 : a.localeCompare(b)).map(([area, list]) => ({ area, cards: list }));
}

export const areaSections = (cards: readonly CardConfig[]): SectionConfig[] => groupByArea(cards).map((group) => ({ kind: "section", title: group.area, cards: group.cards }));
