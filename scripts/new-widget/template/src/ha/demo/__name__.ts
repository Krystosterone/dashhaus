import type { HaTransport, HassEntities, HassEntity } from "../types";
import { demoSendMessage } from "../demo";

const stamp = "2026-10-19T11:20:00Z";
const initial: HassEntities = {
  "__domain__.bedroom": {
    entity_id: "__domain__.bedroom",
    state: "on",
    attributes: { friendly_name: "Bedroom" },
    last_changed: stamp,
    last_updated: stamp,
  },
  "__domain__.office": {
    entity_id: "__domain__.office",
    state: "off",
    attributes: { friendly_name: "Office" },
    last_changed: stamp,
    last_updated: stamp,
  },
};

const NEXT: Record<string, (state: string) => string> = {
  toggle: (state) => (state === "on" ? "off" : "on"),
  turn_on: () => "on",
  turn_off: () => "off",
};

/** Storybook-only `__domain__` transport: the same store and service path as a host transport, answered locally. */
export function createDemo__Name__HaTransport(seed: HassEntities = initial): HaTransport {
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
      if (domain !== "__domain__" || !NEXT[service]) throw new Error(`Unsupported demo service: ${domain}.${service}`);
      const entityId = serviceData.entity_id;
      if (typeof entityId !== "string" || !entities[entityId]) throw new Error("Demo entity not found");
      const current = entities[entityId];
      const now = new Date().toISOString();
      const next: HassEntity = { ...current, attributes: { ...current.attributes }, state: NEXT[service](current.state), last_changed: now, last_updated: now };
      entities = { ...entities, [entityId]: next };
      publish();
      return { success: true };
    },
    sendMessage: (type, payload = {}) => demoSendMessage(entities, type, payload),
  };
}
