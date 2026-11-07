import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import type { DemoHistoryRow } from "./messages";
import { createDemoTransport } from "./transport";

const stamp = "2026-10-19T11:20:00Z";
const reading = (entity_id: string, state: string, attributes: Record<string, unknown>): HassEntity => ({
  entity_id,
  state,
  attributes,
  last_changed: stamp,
  last_updated: stamp,
});

const initial: HassEntities = {
  "sensor.living_room_co2": reading("sensor.living_room_co2", "650", { friendly_name: "Living room CO₂", unit_of_measurement: "ppm", device_class: "carbon_dioxide", state_class: "measurement" }),
  "sensor.dishwasher_power": reading("sensor.dishwasher_power", "1840", { friendly_name: "Dishwasher", unit_of_measurement: "W", device_class: "power", state_class: "measurement" }),
  "sensor.house_energy": reading("sensor.house_energy", "1523.3", { friendly_name: "House energy", unit_of_measurement: "kWh", device_class: "energy", state_class: "total_increasing" }),
  "sensor.grid_power": reading("sensor.grid_power", "-1240", { friendly_name: "Grid", unit_of_measurement: "W", device_class: "power", state_class: "measurement" }),
};

/** Each entity's morning, by hour from midnight: what the recorder would hold for a real day in its own unit. */
const MORNING: Record<string, number[]> = {
  "sensor.living_room_co2": [520, 490, 470, 540, 780, 940, 720],
  "sensor.dishwasher_power": [1, 1, 1, 1, 1, 12, 1460],
  "sensor.house_energy": [1514.7, 1515.3, 1515.9, 1516.8, 1518.1, 1520.6, 1521.9],
  "sensor.grid_power": [310, 280, 280, 420, 180, -820, -1110],
};
const HOURS = [0, 2, 4, 6, 7, 9, 10];

/** Today at a local time, in epoch seconds, like the recorder's compressed rows. */
const at = (hour: number, minute = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).getTime() / 1000;
};

function history(entities: HassEntities, entityIds: readonly string[]): Record<string, DemoHistoryRow[]> {
  const result: Record<string, DemoHistoryRow[]> = {};
  for (const id of entityIds) {
    const entity = entities[id];
    if (!entity) continue;
    const morning = MORNING[id];
    result[id] = morning
      ? morning.map((value, i) => ({ s: String(value), a: entity.attributes, lu: at(HOURS[i]) }))
      : [{ s: entity.state, a: entity.attributes, lu: at(8) }];
  }
  return result;
}

/** Storybook-only `sensor` transport for numeric readings: the real store, mapper and history path, answered locally. Read-only. */
export function createDemoNumericHaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({ seed, services: {}, refuse: (domain, service) => new Error(`A numeric reading is read-only: ${domain}.${service}`), history });
}
