import type { HaTransport, HassEntity, HassEntities } from "../ha/types";
import { demoSendMessage } from "../demo";

const stamp = "2026-10-19T11:20:00Z";

/** Full capability seed: position, tilt, and all three feature flags (4 | 8 | 128). */
const coverInitial: HassEntities = {
  "cover.living_room": {
    entity_id: "cover.living_room",
    state: "open",
    attributes: {
      friendly_name: "Living room blinds",
      device_class: "blind",
      current_position: 100,
      current_tilt_position: 50,
      supported_features: 4 | 8 | 128,
    },
    last_changed: stamp,
    last_updated: stamp,
  },
};

/** Storybook-only cover transport using the same store and service path as a host transport. */
export function createDemoCoverHaTransport(seed: HassEntities = coverInitial): HaTransport {
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
      if (domain !== "cover") throw new Error(`Unsupported demo domain: ${domain}`);
      const entityId = serviceData.entity_id;
      if (typeof entityId !== "string" || !entities[entityId]) throw new Error("Demo entity not found");
      const current = entities[entityId];
      const next: HassEntity = { ...current, attributes: { ...current.attributes }, last_updated: new Date().toISOString() };
      if (service === "open_cover") {
        next.state = "open";
        next.attributes.current_position = 100;
      }
      if (service === "close_cover") {
        next.state = "closed";
        next.attributes.current_position = 0;
      }
      if (service === "stop_cover") {
        // A stopped cover holds its position; settle an in-flight state to its current reach.
        next.state = next.state === "opening" ? "open" : next.state === "closing" ? "closed" : next.state;
      }
      if (service === "set_cover_position" && typeof serviceData.position === "number") {
        next.attributes.current_position = serviceData.position;
        next.state = serviceData.position === 0 ? "closed" : "open";
      }
      if (service === "set_cover_tilt_position" && typeof serviceData.tilt_position === "number") {
        next.attributes.current_tilt_position = serviceData.tilt_position;
      }
      entities = { ...entities, [entityId]: next };
      publish();
      return { success: true };
    },
    sendMessage: (type, payload = {}) => demoSendMessage(entities, type, payload),
  };
}

function clone(entities: HassEntities): HassEntities {
  return Object.fromEntries(Object.entries(entities).map(([id, entity]) => [id, {
    ...entity,
    attributes: { ...entity.attributes },
  }]));
}
