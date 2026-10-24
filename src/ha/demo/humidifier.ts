import type { HaTransport, HassEntities, HassEntity } from "../types";
import { demoSendMessage } from "../demo";

const stamp = "2026-10-19T11:20:00Z";
const initial: HassEntities = {
  "humidifier.bedroom": {
    entity_id: "humidifier.bedroom",
    state: "on",
    attributes: { friendly_name: "Bedroom", device_class: "humidifier", action: "humidifying", current_humidity: 38, humidity: 45, min_humidity: 30, max_humidity: 80, mode: "normal", available_modes: ["normal", "eco", "sleep", "boost"] },
    last_changed: stamp,
    last_updated: stamp,
  },
  "humidifier.office": {
    entity_id: "humidifier.office",
    state: "off",
    attributes: { friendly_name: "Office", device_class: "dehumidifier", action: "off", current_humidity: 58, humidity: 50, min_humidity: 35, max_humidity: 70 },
    last_changed: stamp,
    last_updated: stamp,
  },
};

type Attributes = HassEntity["attributes"];
const humidity = (data: Record<string, unknown>) => {
  if (typeof data.humidity !== "number") throw new Error("humidity must be a number");
  return data.humidity;
};
/** What a service does to the state and the attributes it changes. */
const NEXT: Record<string, (state: string, data: Record<string, unknown>) => [string, Partial<Attributes>]> = {
  toggle: (state) => [state === "on" ? "off" : "on", {}],
  turn_on: () => ["on", {}],
  turn_off: () => ["off", {}],
  set_humidity: (state, data) => [state, { humidity: humidity(data) }],
  set_mode: (state, data) => [state, { mode: data.mode }],
};

/** A humidifier works below its target, a dehumidifier above it. */
function action(state: string, a: Attributes) {
  if (state !== "on") return "off";
  const cur = a.current_humidity as number, target = a.humidity as number;
  if (a.device_class === "dehumidifier") return cur > target ? "drying" : "idle";
  return cur < target ? "humidifying" : "idle";
}

/** Storybook-only `humidifier` transport: the same store and service path as a host transport, answered locally. */
export function createDemoHumidifierHaTransport(seed: HassEntities = initial): HaTransport {
  let entities: HassEntities = Object.fromEntries(Object.entries(seed).map(([id, e]) => [id, { ...e, attributes: { ...e.attributes } }]));
  const listeners = new Set<(next: HassEntities) => void>();
  const publish = () => listeners.forEach((listener) => listener({ ...entities }));

  return {
    subscribeEntities(listener) {
      listeners.add(listener);
      queueMicrotask(() => listener({ ...entities }));
      return () => { listeners.delete(listener); };
    },
    async callService(domain, service, serviceData = {}) {
      if (domain !== "humidifier" || !NEXT[service]) throw new Error(`Unsupported demo service: ${domain}.${service}`);
      const entityId = serviceData.entity_id;
      if (typeof entityId !== "string" || !entities[entityId]) throw new Error("Demo entity not found");
      const current = entities[entityId];
      const now = new Date().toISOString();
      const [state, changed] = NEXT[service](current.state, serviceData);
      const attributes = { ...current.attributes, ...changed };
      const next: HassEntity = { ...current, attributes: { ...attributes, action: action(state, attributes) }, state, last_changed: state === current.state ? current.last_changed : now, last_updated: now };
      entities = { ...entities, [entityId]: next };
      publish();
      return { success: true };
    },
    sendMessage: (type, payload = {}) => demoSendMessage(entities, type, payload),
  };
}
