import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import type { DemoHistoryRow } from "./messages";
import { createDemoTransport } from "./transport";

const stamp = "2026-10-19T11:20:00Z";
const reading = (entity_id: string, state: string, friendly_name: string): HassEntity => ({
  entity_id,
  state,
  attributes: { friendly_name, unit_of_measurement: "__unit__", state_class: "measurement" },
  last_changed: stamp,
  last_updated: stamp,
});

const initial: HassEntities = {
  "__domain__.living_room": reading("__domain__.living_room", "42", "Living room"),
  "__domain__.office": reading("__domain__.office", "7.5", "Office"),
};

/** Today at a local time, in epoch seconds, like the recorder's compressed rows. */
const at = (hour: number, minute = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).getTime() / 1000;
};

/** A morning around each entity's current value, so the Today strip looks like a real day in its own unit. */
function history(entities: HassEntities, entityIds: readonly string[]): Record<string, DemoHistoryRow[]> {
  const result: Record<string, DemoHistoryRow[]> = {};
  for (const id of entityIds) {
    const entity = entities[id];
    const value = Number(entity?.state);
    if (!entity) continue;
    result[id] = Number.isFinite(value)
      ? [[1, 0.85], [6, 0.9], [8, 1.1], [10, 1]].map(([hour, f]) => ({ s: String(Math.round(value * f * 10) / 10), a: entity.attributes, lu: at(hour) }))
      : [{ s: entity.state, a: entity.attributes, lu: at(8) }];
  }
  return result;
}

/** Storybook-only `__domain__` transport: the real store, mapper and history path, answered locally. Read-only. */
export function createDemo__Name__HaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({ seed, services: {}, refuse: (domain, service) => new Error(`The __label__ is read-only: ${domain}.${service}`), history });
}
