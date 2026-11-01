import { useMemo } from "react";
import type { HaStore } from "./types";
import { useHaRequest } from "./useHaRequest";
import { finiteNumber, isRecord, stringList, stringValue } from "./util";

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** An area from `config/area_registry/list`. Areas with no id or name are left out. */
export interface HaAreaRegistryEntry {
  id: string;
  name: string;
  icon?: string;
  floorId?: string;
  labels: string[];
  aliases: string[];
}

/** A floor from `config/floor_registry/list`. Floors with no id or name are left out. */
export interface HaFloorRegistryEntry {
  id: string;
  name: string;
  level?: number;
  icon?: string;
  aliases: string[];
}

/** A device from `config/device_registry/list`. */
export interface HaDeviceRegistryEntry {
  id: string;
  name?: string;
  nameByUser?: string;
  areaId?: string;
  manufacturer?: string;
  model?: string;
  disabledBy?: string;
}

/** One entity from `config/entity_registry/list_for_display`. */
export interface HaEntityRegistryEntry {
  entityId: string;
  /** The entity's own area, when it sets one. `membership` adds the device fallback. */
  areaId?: string;
  deviceId?: string;
  platform?: string;
  entityCategory?: string;
  hidden: boolean;
}

export interface HaRegistry {
  areas: readonly HaAreaRegistryEntry[];
  floors: readonly HaFloorRegistryEntry[];
  devices: readonly HaDeviceRegistryEntry[];
  entities: ReadonlyMap<string, HaEntityRegistryEntry>;
  /** Every entity's area id: its own, else its device's. Unknown areas remain, by id. */
  membership: ReadonlyMap<string, string>;
}

/** One area with the entity ids that belong to it. */
export interface HaAreaEntities {
  area: HaAreaRegistryEntry;
  entityIds: readonly string[];
}

function readAreas(payload: unknown): HaAreaRegistryEntry[] {
  const areas: HaAreaRegistryEntry[] = [];
  for (const row of list(payload)) {
    if (!isRecord(row)) continue;
    const id = stringValue(row.area_id);
    const name = stringValue(row.name);
    if (!id || !name) continue;
    areas.push({
      id,
      name,
      icon: stringValue(row.icon),
      floorId: stringValue(row.floor_id),
      labels: stringList(row.labels),
      aliases: stringList(row.aliases),
    });
  }
  return areas;
}

function readFloors(payload: unknown): HaFloorRegistryEntry[] {
  const floors: HaFloorRegistryEntry[] = [];
  for (const row of list(payload)) {
    if (!isRecord(row)) continue;
    const id = stringValue(row.floor_id);
    const name = stringValue(row.name);
    if (!id || !name) continue;
    floors.push({ id, name, level: finiteNumber(row.level), icon: stringValue(row.icon), aliases: stringList(row.aliases) });
  }
  return floors;
}

function readDevices(payload: unknown): HaDeviceRegistryEntry[] {
  const devices: HaDeviceRegistryEntry[] = [];
  for (const row of list(payload)) {
    if (!isRecord(row)) continue;
    const id = stringValue(row.id);
    if (!id) continue;
    devices.push({
      id,
      name: stringValue(row.name),
      nameByUser: stringValue(row.name_by_user),
      areaId: stringValue(row.area_id),
      manufacturer: stringValue(row.manufacturer),
      model: stringValue(row.model),
      disabledBy: stringValue(row.disabled_by),
    });
  }
  return devices;
}

function readEntities(payload: unknown): Map<string, HaEntityRegistryEntry> {
  const entities = new Map<string, HaEntityRegistryEntry>();
  const categories = isRecord(payload) && isRecord(payload.entity_categories) ? payload.entity_categories : {};
  for (const row of list(isRecord(payload) ? payload.entities : undefined)) {
    if (!isRecord(row)) continue;
    const entityId = stringValue(row.ei);
    if (!entityId) continue;
    const categoryKey = row.ec;
    const category = (typeof categoryKey === "string" || typeof categoryKey === "number")
      ? stringValue(categories[categoryKey]) ?? "other"
      : undefined;
    entities.set(entityId, {
      entityId,
      areaId: stringValue(row.ai),
      deviceId: stringValue(row.di),
      platform: stringValue(row.pl),
      entityCategory: category,
      hidden: row.hb === true,
    });
  }
  return entities;
}

/**
 * Map entity ids to area ids from the entity and device registries: an entity's own area wins, otherwise it
 * inherits its device's area. Rows without an entity id or a usable area are left out.
 */
export function areaMembership(entityRegistry: unknown, deviceRegistry: unknown): Map<string, string> {
  const deviceAreas = new Map<string, string>();
  for (const device of list(deviceRegistry)) {
    if (!isRecord(device)) continue;
    const id = stringValue(device.id);
    const areaId = stringValue(device.area_id);
    if (id && areaId) deviceAreas.set(id, areaId);
  }
  const membership = new Map<string, string>();
  for (const entity of list(isRecord(entityRegistry) ? entityRegistry.entities : undefined)) {
    if (!isRecord(entity)) continue;
    const entityId = stringValue(entity.ei);
    const deviceId = stringValue(entity.di);
    const areaId = stringValue(entity.ai) ?? (deviceId ? deviceAreas.get(deviceId) : undefined);
    if (entityId && areaId) membership.set(entityId, areaId);
  }
  return membership;
}

/**
 * Map entity ids to area names from the three displayed registry payloads. Kept as the name-only view for callers
 * that do not need the entity ids; `useHaRegistry` and `useHaAreas` are the richer hooks.
 */
export function areaNamesFromRegistries(entityRegistry: unknown, deviceRegistry: unknown, areaRegistry: unknown): Map<string, string> {
  const names = new Map(readAreas(areaRegistry).map((area) => [area.id, area.name]));
  const result = new Map<string, string>();
  for (const [entityId, areaId] of areaMembership(entityRegistry, deviceRegistry)) {
    const name = names.get(areaId);
    if (name) result.set(entityId, name);
  }
  return result;
}

/** Read the four registry payloads into the typed shape the hooks return. Pure. */
export function readRegistries(
  entityRegistry: unknown,
  deviceRegistry: unknown,
  areaRegistry: unknown,
  floorRegistry: unknown = [],
): HaRegistry {
  return {
    areas: readAreas(areaRegistry),
    floors: readFloors(floorRegistry),
    devices: readDevices(deviceRegistry),
    entities: readEntities(entityRegistry),
    membership: areaMembership(entityRegistry, deviceRegistry),
  };
}

async function fetchRegistry(store: HaStore) {
  const [entities, devices, areas, floors] = await Promise.all([
    store.callApi("config/entity_registry/list_for_display"),
    store.callApi("config/device_registry/list"),
    store.callApi("config/area_registry/list"),
    // A transport that predates the floor registry must not take the other three down.
    store.callApi("config/floor_registry/list").catch(() => []),
  ]);
  return readRegistries(entities, devices, areas, floors);
}

/**
 * The Home Assistant registries, typed, read once per connection generation and shared by every caller. Resolves to
 * `undefined` while connecting, after a failure, and when the transport lacks generic commands. It depends on
 * registry data only, so an entity changing state never re-reads or recomputes it.
 */
export function useHaRegistry(): HaRegistry | undefined {
  const { value } = useHaRequest("registry", fetchRegistry, { cache: true });
  return value;
}

/**
 * Every area with the entity ids that belong to it, from the same cached registry read. The entity ids keep the
 * entity registry's order, and an entity that inherits its device's area is grouped there. Areas with no entities
 * are still returned, with an empty list.
 */
export function useHaAreas(): readonly HaAreaEntities[] | undefined {
  const registry = useHaRegistry();
  return useMemo(() => {
    if (!registry) return undefined;
    const groups = registry.areas.map((area) => ({ area, entityIds: [] as string[] }));
    const byArea = new Map(groups.map((group) => [group.area.id, group]));
    for (const [entityId, areaId] of registry.membership) byArea.get(areaId)?.entityIds.push(entityId);
    return groups;
  }, [registry]);
}

/**
 * Resolve an entity's Home Assistant area name. The registries are shared with every tile; any failure (including a
 * transport without `sendMessage`) resolves to undefined and never touches action state.
 */
export function useHaArea(entityId: string): string | undefined {
  const registry = useHaRegistry();
  return useMemo(() => {
    if (!registry) return undefined;
    const areaId = registry.membership.get(entityId);
    return areaId ? registry.areas.find((area) => area.id === areaId)?.name : undefined;
  }, [registry, entityId]);
}
