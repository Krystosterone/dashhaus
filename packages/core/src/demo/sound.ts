import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import { demoSendMessage } from "../demo";

const stamp = "2026-10-19T11:20:00Z";
const initial: HassEntities = {
  "switch.bedroom": {
    entity_id: "switch.bedroom",
    state: "on",
    attributes: { friendly_name: "Bedroom" },
    last_changed: stamp,
    last_updated: stamp,
  },
  "switch.office": {
    entity_id: "switch.office",
    state: "off",
    attributes: { friendly_name: "Office" },
    last_changed: stamp,
    last_updated: stamp,
  },
  "switch.nursery_music": {
    entity_id: "switch.nursery_music",
    state: "on",
    attributes: { friendly_name: "Nursery Music", icon: "mdi:music" },
    last_changed: stamp,
    last_updated: stamp,
  },
  "number.nursery_volume": {
    entity_id: "number.nursery_volume",
    state: "62.0",
    attributes: { friendly_name: "Nursery Volume", min: 0, max: 100, step: 1, mode: "auto" },
    last_changed: stamp,
    last_updated: stamp,
  },
};

const NEXT: Record<string, (state: string) => string> = {
  toggle: (state) => (state === "on" ? "off" : "on"),
  turn_on: () => "on",
  turn_off: () => "off",
};

/** Storybook-only `switch` and volume `number` transport: the same store and service path as a host transport, answered locally. */
export function createDemoSoundHaTransport(seed: HassEntities = initial): HaTransport {
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
      const volume = domain === "number" && service === "set_value" && typeof serviceData.value === "number";
      if (!volume && (domain !== "switch" || !NEXT[service])) throw new Error(`Unsupported demo service: ${domain}.${service}`);
      const entityId = serviceData.entity_id;
      if (typeof entityId !== "string" || !entities[entityId]) throw new Error("Demo entity not found");
      const current = entities[entityId];
      const now = new Date().toISOString();
      const state = volume ? String(serviceData.value) : NEXT[service](current.state);
      const next: HassEntity = { ...current, attributes: { ...current.attributes }, state, last_changed: now, last_updated: now };
      entities = { ...entities, [entityId]: next };
      publish();
      return { success: true };
    },
    sendMessage: (type, payload = {}) => demoSendMessage(entities, type, payload),
  };
}
