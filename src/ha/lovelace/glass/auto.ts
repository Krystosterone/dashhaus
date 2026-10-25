import type { AutoInput } from "../auto";
import { GLASS_DOMAIN } from "./config";
import type { GlassCardConfig, GlassKind } from "./config";

/** Home's order: the weather, then comfort, then modes, then the rooms' lights and switches. */
const ORDER: readonly string[] = ["weather", "climate", "input_boolean", "light", "switch"];

/** An entity's area name from the frontend's registries: its own area, else its device's. */
export function areaName(input: AutoInput, entityId: string): string | undefined {
  const entry = input.entities?.[entityId];
  const areaId = entry?.area_id ?? (entry?.device_id ? input.devices?.[entry.device_id]?.area_id : undefined);
  return areaId ? input.areas?.[areaId]?.name : undefined;
}

/**
 * Every entity glass can draw, for a card without `cards`: hidden and config or diagnostic entities left out,
 * one weather (the first by name), the rest in Home's order and then by name.
 */
export function autoGlassCards(input: AutoInput): GlassCardConfig[] {
  const { states, entities = {} } = input;
  const name = (id: string) => String(states[id]?.attributes.friendly_name ?? id);
  const ids = Object.keys(states)
    .filter((id) => {
      const entry = entities[id];
      return !entry?.hidden && !entry?.entity_category && ORDER.includes(id.slice(0, id.indexOf(".")));
    })
    .sort((a, b) => ORDER.indexOf(a.slice(0, a.indexOf("."))) - ORDER.indexOf(b.slice(0, b.indexOf("."))) || name(a).localeCompare(name(b)));
  const weather = ids.find((id) => id.startsWith("weather."));
  return ids
    .filter((id) => !id.startsWith("weather.") || id === weather)
    .map((entity) => ({ entity, kind: GLASS_DOMAIN[entity.slice(0, entity.indexOf("."))] as GlassKind }));
}
