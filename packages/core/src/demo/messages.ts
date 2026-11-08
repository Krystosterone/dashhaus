import type { HassEntities, HassEntity } from "../ha/types";

/** One compressed `history/history_during_period` row: state, attributes, last-updated epoch seconds. */
export interface DemoHistoryRow {
  s: string;
  a: Record<string, unknown>;
  lu: number;
}

/** Every seeded demo entity resolves to this one area, so `useHaArea` has a name to show. */
export const DEMO_AREA_ID = "living_room";
export const DEMO_AREA_NAME = "Living room";

export function demoAreaRegistry(): Array<{ area_id: string; name: string; floor_id: string }> {
  return [{ area_id: DEMO_AREA_ID, name: DEMO_AREA_NAME, floor_id: "ground" }];
}

/** `config/floor_registry/list`: the demo's one area sits on one floor. */
export function demoFloorRegistry(): Array<{ floor_id: string; name: string; level: number }> {
  return [{ floor_id: "ground", name: "Ground floor", level: 0 }];
}

export const DEMO_DEVICE_ID = "demo_device";

/** `config/entity_registry/list_for_display`: every demo entity inherits its area from one device. */
export function demoEntityRegistry(entities: HassEntities) {
  return { entity_categories: {}, entities: Object.keys(entities).map((ei) => ({ ei, di: DEMO_DEVICE_ID, pl: "demo" })) };
}

export function demoDeviceRegistry(): Array<{ id: string; area_id: string }> {
  return [{ id: DEMO_DEVICE_ID, area_id: DEMO_AREA_ID }];
}

/** Today's local date at a fixed morning hour, in epoch seconds. */
function morningEpoch(hour: number, minute = 0): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).getTime() / 1000;
}

function historyRecord(entity: HassEntity, state: string, when: number, attributes: Record<string, unknown> = {}): DemoHistoryRow {
  return { s: state, a: { ...entity.attributes, ...attributes }, lu: when };
}

/** A small realistic day of 2-3 transitions spread across the local morning, per domain. */
function synthesizeHistory(entity: HassEntity): DemoHistoryRow[] {
  const domain = entity.entity_id.slice(0, entity.entity_id.indexOf("."));
  if (domain === "light") {
    return [
      historyRecord(entity, "off", morningEpoch(6, 30)),
      historyRecord(entity, "on", morningEpoch(8), { brightness: entity.attributes.brightness }),
      historyRecord(entity, "on", morningEpoch(9, 30), { brightness: 96 }),
    ];
  }
  if (domain === "cover") {
    return [
      historyRecord(entity, "closed", morningEpoch(6, 30), { current_position: 0 }),
      historyRecord(entity, "opening", morningEpoch(8), { current_position: 45 }),
      historyRecord(entity, "open", morningEpoch(9, 30), { current_position: 100 }),
    ];
  }
  if (domain === "climate") {
    return [
      historyRecord(entity, "heat", morningEpoch(6), { hvac_action: "heating" }),
      historyRecord(entity, "heat", morningEpoch(8), { hvac_action: "idle" }),
      historyRecord(entity, entity.state, morningEpoch(9, 30), { hvac_action: "heating" }),
    ];
  }
  if (domain === "sensor") {
    const unit = typeof entity.attributes.unit_of_measurement === "string" ? entity.attributes.unit_of_measurement : "";
    return [
      historyRecord(entity, "20.1", morningEpoch(7), { unit_of_measurement: unit }),
      historyRecord(entity, "20.8", morningEpoch(8, 30), { unit_of_measurement: unit }),
      historyRecord(entity, entity.state, morningEpoch(9, 45), { unit_of_measurement: unit }),
    ];
  }
  if (domain === "weather") {
    return [
      historyRecord(entity, "cloudy", morningEpoch(7), { temperature: 18.5 }),
      historyRecord(entity, "partlycloudy", morningEpoch(8, 30), { temperature: 20 }),
      historyRecord(entity, entity.state, morningEpoch(9, 45), { temperature: entity.attributes.temperature }),
    ];
  }
  if (domain === "input_boolean" || domain === "switch" || entity.state === "on" || entity.state === "off") {
    return [
      historyRecord(entity, "off", morningEpoch(6, 30)),
      historyRecord(entity, "on", morningEpoch(8)),
      historyRecord(entity, entity.state, morningEpoch(9, 30)),
    ];
  }
  if (domain === "vacuum") {
    return [
      historyRecord(entity, "docked", morningEpoch(6, 30)),
      historyRecord(entity, "cleaning", morningEpoch(8)),
      historyRecord(entity, "docked", morningEpoch(9)),
      historyRecord(entity, entity.state, morningEpoch(11, 20)),
    ];
  }
  if (domain === "alarm_control_panel") {
    return [
      historyRecord(entity, "disarmed", morningEpoch(6, 30)),
      historyRecord(entity, "armed_home", morningEpoch(8)),
      historyRecord(entity, entity.state, morningEpoch(9, 30)),
    ];
  }
  return [
    historyRecord(entity, entity.state, morningEpoch(8)),
    historyRecord(entity, entity.state, morningEpoch(9, 30)),
  ];
}

/** Rows keyed by entity id, like `history/history_during_period`; entities without history are left out. */
export function demoHistoryDuringPeriod(entities: HassEntities, entityIds: readonly string[]): Record<string, DemoHistoryRow[]> {
  const result: Record<string, DemoHistoryRow[]> = {};
  for (const id of entityIds) {
    const entity = entities[id];
    if (entity) result[id] = synthesizeHistory(entity);
  }
  return result;
}

/**
 * The demo home's location, `get_config`'s: Montréal's latitude, and the longitude whose solar noon is the local
 * zone's midday, so the sun rises and sets at believable local times wherever the stories are drawn.
 */
export function demoConfig() {
  return { location_name: "Home", latitude: 45.5, longitude: -new Date().getTimezoneOffset() / 4 };
}

/** Handle the generic websocket commands a demo transport supports: history reads, the registries and the configuration. */
export async function demoSendMessage(
  entities: HassEntities,
  type: string,
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  if (type === "history/history_during_period") {
    const entityIds = payload.entity_ids;
    if (!Array.isArray(entityIds) || !entityIds.every((id) => typeof id === "string")) throw new Error("Demo history entity_ids missing");
    return demoHistoryDuringPeriod(entities, entityIds);
  }
  if (type === "config/entity_registry/list_for_display") return demoEntityRegistry(entities);
  if (type === "config/device_registry/list") return demoDeviceRegistry();
  if (type === "config/area_registry/list") return demoAreaRegistry();
  if (type === "config/floor_registry/list") return demoFloorRegistry();
  if (type === "get_config") return demoConfig();
  throw new Error(`Unsupported demo command: ${type}`);
}
