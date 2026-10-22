import { useMemo } from "react";
import type { HaStore } from "./types";
import { useHaRequest } from "./useHaRequest";
import { isRecord, stringValue } from "./util";

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Map entity ids to area names from three registry payloads:
 * - `config/entity_registry/list_for_display` → `{ entities: [{ ei, ai?, di? }] }`
 * - `config/device_registry/list` → `[{ id, area_id }]`
 * - `config/area_registry/list` → `[{ area_id, name }]`
 *
 * An entity's own area wins; otherwise it inherits its device's area, which is how most entities
 * get one. Entities without either, unknown areas, and empty names are left out.
 */
export function areaNamesFromRegistries(entityRegistry: unknown, deviceRegistry: unknown, areaRegistry: unknown): Map<string, string> {
  const areaNames = new Map<string, string>();
  for (const area of list(areaRegistry)) {
    if (!isRecord(area)) continue;
    const id = stringValue(area.area_id);
    const name = stringValue(area.name);
    if (id && name) areaNames.set(id, name);
  }
  const deviceAreas = new Map<string, string>();
  for (const device of list(deviceRegistry)) {
    if (!isRecord(device)) continue;
    const id = stringValue(device.id);
    const areaId = stringValue(device.area_id);
    if (id && areaId) deviceAreas.set(id, areaId);
  }
  const result = new Map<string, string>();
  for (const entity of list(isRecord(entityRegistry) ? entityRegistry.entities : undefined)) {
    if (!isRecord(entity)) continue;
    const entityId = stringValue(entity.ei);
    const deviceId = stringValue(entity.di);
    const areaId = stringValue(entity.ai) ?? (deviceId ? deviceAreas.get(deviceId) : undefined);
    const name = areaId ? areaNames.get(areaId) : undefined;
    if (entityId && name) result.set(entityId, name);
  }
  return result;
}

async function fetchAreaNames(store: HaStore) {
  const [entities, devices, areas] = await Promise.all([
    store.callApi("config/entity_registry/list_for_display"),
    store.callApi("config/device_registry/list"),
    store.callApi("config/area_registry/list"),
  ]);
  return areaNamesFromRegistries(entities, devices, areas);
}

/**
 * Resolve an entity's Home Assistant area name. The registries are read once per connection
 * generation and shared by every tile; any failure (including a transport without `sendMessage`)
 * resolves to undefined and never touches action state.
 */
export function useHaArea(entityId: string): string | undefined {
  const { value } = useHaRequest("registry:area-names", fetchAreaNames, { cache: true });
  return useMemo(() => value?.get(entityId), [value, entityId]);
}
