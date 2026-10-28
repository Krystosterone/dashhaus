import type { AutoEntityEntry } from "./element";

/** What finding room sensors reads from `hass`: states for device classes and names, the entity registry for devices. */
export interface RoomSensorInput {
  states: Record<string, { attributes: Record<string, unknown> }>;
  entities?: Record<string, AutoEntityEntry>;
}

/** One device's room air: its primary sensor, with the humidity and battery sensors on the same device. */
export interface RoomSensor {
  entity: string;
  humidity?: string;
  battery?: string;
}

const deviceClass = (s: { attributes: Record<string, unknown> } | undefined) => (typeof s?.attributes.device_class === "string" ? s.attributes.device_class : undefined);

/**
 * Room air for an automatic layout, one per device: every visible temperature sensor, with the humidity and battery
 * sensors on its device as companions, then every humidity sensor on a device that has no temperature. Each group
 * sorted by name. Companions may be diagnostic entities (batteries usually are); only hidden ones are left out.
 *
 * Orb's `auto.ts` can only `import type` (scripts/deploy.mjs imports it through Node), so it repeats this; its
 * test holds the two to the same result.
 */
export function roomSensors({ states, entities = {} }: RoomSensorInput): RoomSensor[] {
  const name = (id: string) => String(states[id]?.attributes.friendly_name ?? id);
  const sensors = Object.keys(states).filter((id) => id.startsWith("sensor.") && !entities[id]?.hidden);
  const visible = sensors.filter((id) => !entities[id]?.entity_category);
  const deviceOf = (id: string) => entities[id]?.device_id ?? undefined;
  const companion = (device: string | undefined, cls: string) => (
    device ? sensors.find((id) => deviceOf(id) === device && deviceClass(states[id]) === cls) : undefined
  );
  const taken = new Set<string>();
  const rooms: RoomSensor[] = [];
  for (const cls of ["temperature", "humidity"]) {
    for (const id of visible.filter((s) => deviceClass(states[s]) === cls).sort((a, b) => name(a).localeCompare(name(b)))) {
      const device = deviceOf(id);
      if (taken.has(id) || (device && taken.has(`device:${device}`))) continue;
      if (device) taken.add(`device:${device}`);
      taken.add(id);
      const humidity = cls === "temperature" ? companion(device, "humidity") : undefined;
      const battery = companion(device, "battery");
      rooms.push({ entity: id, ...(humidity && { humidity }), ...(battery && { battery }) });
    }
  }
  return rooms;
}
