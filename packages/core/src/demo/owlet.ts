import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import { demoSendMessage } from "../demo";
import type { DemoHistoryRow } from "../demo";

const stamp = new Date().toISOString();
const sensor = (entity_id: string, state: string, attributes: Record<string, unknown>): HassEntity => ({ entity_id, state, attributes, last_changed: stamp, last_updated: stamp });

const DEVICE = "owlet_sock_ac000w0123";
const BASE = `sensor.${DEVICE}`;
const binary = (suffix: string, name: string): [string, HassEntity] => [`binary_sensor.${DEVICE}_${suffix}`, { entity_id: `binary_sensor.${DEVICE}_${suffix}`, state: "off", attributes: { friendly_name: `Owlet Sock AC000W0123 ${name}` }, last_changed: stamp, last_updated: stamp }];

/** The demo sock: its three sensors, its charging sensor, its ten alert sensors, all quiet, and its base station, on. */
export const OWLET_DEMO_ENTITIES: HassEntities = {
  [`${BASE}_sleep_state`]: sensor(`${BASE}_sleep_state`, "deep_sleep", { friendly_name: "Owlet Sock AC000W0123 Sleep state", device_class: "enum", options: ["unknown", "awake", "light_sleep", "deep_sleep"] }),
  [`${BASE}_heart_rate`]: sensor(`${BASE}_heart_rate`, "121", { friendly_name: "Owlet Sock AC000W0123 Heart rate", unit_of_measurement: "bpm", state_class: "measurement" }),
  [`${BASE}_o2_saturation`]: sensor(`${BASE}_o2_saturation`, "98", { friendly_name: "Owlet Sock AC000W0123 O2 saturation", unit_of_measurement: "%", state_class: "measurement" }),
  ...Object.fromEntries([
    binary("charging", "Charging"),
    binary("critical_oxygen_alert", "Critical oxygen alert"),
    binary("low_oxygen_alert", "Low oxygen alert"),
    binary("high_oxygen_alert", "High oxygen alert"),
    binary("low_heart_rate_alert", "Low heart rate alert"),
    binary("high_heart_rate_alert", "High heart rate alert"),
    binary("sock_off", "Sock off"),
    binary("sock_disconnected_alert", "Sock disconnected alert"),
    binary("lost_power_alert", "Lost power alert"),
    binary("critical_battery_alert", "Critical battery alert"),
    binary("low_battery_alert", "Low battery alert"),
  ]),
  [`switch.${DEVICE}_base_station_on`]: sensor(`switch.${DEVICE}_base_station_on`, "on", { friendly_name: "Owlet Sock AC000W0123 Base station on" }),
};

/** The demo sock with some entities' states changed: `{ "binary_sensor.…_low_oxygen_alert": "on" }`. */
export function owletDemoEntities(states: Record<string, string>): HassEntities {
  return Object.fromEntries(Object.entries(OWLET_DEMO_ENTITIES).map(([id, e]) => [id, states[id] != null ? { ...e, state: states[id] } : e]));
}

/** Today at a local time, in epoch seconds, like the recorder's compressed rows. */
const at = (hour: number, minute = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).getTime() / 1000;
};

/** A night and a morning nap per sock entity, so the sheet's strips look like a real day. */
const NIGHT: Record<string, Array<[number, string]>> = {
  sleep_state: [[0, "deep_sleep"], [2, "light_sleep"], [3, "deep_sleep"], [5, "light_sleep"], [7, "awake"], [9, "light_sleep"], [10, "deep_sleep"]],
  heart_rate: [[0, "118"], [2, "124"], [3, "116"], [5, "127"], [7, "146"], [9, "131"], [10, "121"]],
  o2_saturation: [[0, "98"], [2, "97"], [3, "98"], [5, "97"], [7, "99"], [9, "98"], [10, "98"]],
};

function history(entities: HassEntities, entityIds: readonly string[]): Record<string, DemoHistoryRow[]> {
  const result: Record<string, DemoHistoryRow[]> = {};
  for (const id of entityIds) {
    const entity = entities[id];
    const night = Object.entries(NIGHT).find(([suffix]) => id.endsWith(`_${suffix}`))?.[1];
    if (entity && night) result[id] = night.map(([hour, s]) => ({ s, a: entity.attributes, lu: at(hour) }));
  }
  return result;
}

/** A heart rate that wanders like a sleeping baby's, between 112 and 136 bpm. */
const nextHeartRate = (bpm: number) => Math.min(136, Math.max(112, bpm + Math.round(Math.random() * 6 - 3)));

/**
 * Storybook-only Owlet transport: one sock's three sensors through the real store, mapper and history path.
 * Like the integration, it sends a new heart rate every 5 s (`tickMs`; 0 to freeze), so the tile shows live.
 * Its one switch is the base station's: `switch.turn_on` and `turn_off` on it apply, every other call is refused.
 */
export function createDemoOwletHaTransport(seed: HassEntities = OWLET_DEMO_ENTITIES, tickMs = 5000): HaTransport {
  let entities: HassEntities = Object.fromEntries(Object.entries(seed).map(([id, e]) => [id, { ...e, attributes: { ...e.attributes } }]));
  const listeners = new Set<(next: HassEntities) => void>();
  let timer: ReturnType<typeof setInterval> | undefined;
  const tick = () => {
    const id = Object.keys(entities).find((key) => key.endsWith("_heart_rate"));
    const current = id ? entities[id] : undefined;
    if (!id || !current || !Number.isFinite(Number(current.state))) return;
    const now = new Date().toISOString();
    entities = { ...entities, [id]: { ...current, state: String(nextHeartRate(Number(current.state))), last_changed: now, last_updated: now } };
    listeners.forEach((listener) => listener({ ...entities }));
  };
  return {
    subscribeEntities(listener) {
      listeners.add(listener);
      queueMicrotask(() => listener({ ...entities }));
      if (tickMs > 0 && !timer) timer = setInterval(tick, tickMs);
      return () => {
        listeners.delete(listener);
        if (!listeners.size && timer) { clearInterval(timer); timer = undefined; }
      };
    },
    async callService(domain, service, data = {}) {
      const id = data.entity_id;
      const current = typeof id === "string" ? entities[id] : undefined;
      if (domain !== "switch" || (service !== "turn_on" && service !== "turn_off") || !current || !String(id).endsWith("_base_station_on")) {
        throw new Error(`The Owlet sock is read-only: ${domain}.${service}`);
      }
      const now = new Date().toISOString();
      entities = { ...entities, [String(id)]: { ...current, state: service === "turn_on" ? "on" : "off", last_changed: now, last_updated: now } };
      listeners.forEach((listener) => listener({ ...entities }));
    },
    sendMessage: async (type, payload = {}) => {
      if (type !== "history/history_during_period") return demoSendMessage(entities, type, payload);
      const ids = payload.entity_ids;
      if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) throw new Error("Demo history entity_ids missing");
      return history(entities, ids);
    },
  };
}
