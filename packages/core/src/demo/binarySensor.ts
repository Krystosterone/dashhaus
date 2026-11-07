import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import type { DemoHistoryRow } from "./messages";
import { createDemoTransport } from "./transport";

const stamp = "2026-10-19T11:20:00Z";
const contact = (entity_id: string, state: string, friendly_name: string, device_class: string): HassEntity => ({
  entity_id,
  state,
  attributes: { friendly_name, device_class },
  last_changed: stamp,
  last_updated: stamp,
});

const initial: HassEntities = {
  "binary_sensor.patio_door": contact("binary_sensor.patio_door", "off", "Patio door", "door"),
  "sensor.patio_door_battery": {
    entity_id: "sensor.patio_door_battery",
    state: "64",
    attributes: { friendly_name: "Patio door battery", device_class: "battery", unit_of_measurement: "%" },
    last_changed: stamp,
    last_updated: stamp,
  },
  "binary_sensor.bedroom_window": contact("binary_sensor.bedroom_window", "on", "Bedroom window", "window"),
  "binary_sensor.kitchen_leak": contact("binary_sensor.kitchen_leak", "off", "Under the sink", "moisture"),
  "binary_sensor.hallway_smoke": contact("binary_sensor.hallway_smoke", "off", "Hallway smoke", "smoke"),
};

/** Today at a local time, in epoch seconds, like the recorder's compressed rows. */
const at = (hour: number, minute = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).getTime() / 1000;
};

/** A morning of a sensor's own: off overnight, on twice (a door opened, a window aired), then as it is now. */
function history(entities: HassEntities, entityIds: readonly string[]): Record<string, DemoHistoryRow[]> {
  const result: Record<string, DemoHistoryRow[]> = {};
  for (const id of entityIds) {
    const entity = entities[id];
    if (!entity) continue;
    const row = (s: string, hour: number, minute = 0): DemoHistoryRow => ({ s, a: entity.attributes, lu: at(hour, minute) });
    result[id] = [row("off", 0), row("on", 7, 40), row("off", 7, 52), row("on", 8, 15), row("off", 8, 30), row(entity.state, 9, 30)];
  }
  return result;
}

/**
 * Storybook-only `binary_sensor` transport: the real store, mapper and history path, answered locally, with a door's
 * battery on the same device. Read-only.
 */
export function createDemoBinarySensorHaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({ seed, services: {}, refuse: (domain, service) => new Error(`The binary sensor is read-only: ${domain}.${service}`), history });
}
