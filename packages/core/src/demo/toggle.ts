import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import { demoSendMessage } from "../demo";

const stamp = "2026-10-19T11:20:00Z";
const initial: HassEntities = {
  "input_boolean.guest_mode": {
    entity_id: "input_boolean.guest_mode",
    state: "on",
    attributes: { friendly_name: "Guest" },
    last_changed: stamp,
    last_updated: stamp,
  },
  "input_boolean.dnd": {
    entity_id: "input_boolean.dnd",
    state: "off",
    attributes: { friendly_name: "Quiet" },
    last_changed: stamp,
    last_updated: stamp,
  },
  "switch.porch": {
    entity_id: "switch.porch",
    state: "on",
    attributes: { friendly_name: "Porch" },
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
};

function clone(entities: HassEntities): HassEntities {
  return Object.fromEntries(Object.entries(entities).map(([id, entity]) => [id, {
    ...entity,
    attributes: { ...entity.attributes },
  }]));
}

/**
 * Storybook-only toggle transport simulating `toggle` for both input_boolean and switch, using the
 * same store and service path as a host transport.
 */
export function createDemoToggleHaTransport(seed: HassEntities = initial): HaTransport {
  let entities = clone(seed);
  const listeners = new Set<(next: HassEntities) => void>();
  const publish = () => listeners.forEach((listener) => listener({ ...entities }));

  return {
    subscribeEntities(listener) {
      listeners.add(listener);
      queueMicrotask(() => listener({ ...entities }));
      return () => { listeners.delete(listener); };
    },
    async callService(domain, service, serviceData = {}) {
      if (domain !== "input_boolean" && domain !== "switch") throw new Error(`Unsupported demo domain: ${domain}`);
      if (service !== "toggle") throw new Error(`Unsupported demo service: ${domain}.${service}`);
      const entityId = serviceData.entity_id;
      if (typeof entityId !== "string" || !entities[entityId]) throw new Error("Demo entity not found");
      const current = entities[entityId];
      const now = new Date().toISOString();
      const next: HassEntity = {
        ...current,
        attributes: { ...current.attributes },
        state: current.state === "on" ? "off" : "on",
        last_changed: now,
        last_updated: now,
      };
      entities = { ...entities, [entityId]: next };
      publish();
      return { success: true };
    },
    sendMessage: (type, payload = {}) => demoSendMessage(entities, type, payload),
  };
}
