import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import { demoSendMessage } from "../demo";
import { fanService } from "./fanService";

const stamp = "2026-10-19T11:20:00Z";
/** `FanEntityFeature`: speed 1, oscillate 2, direction 4, preset 8, turn off 16, turn on 32. */
const initial: HassEntities = {
  "fan.living_room_ceiling": {
    entity_id: "fan.living_room_ceiling",
    state: "on",
    attributes: { friendly_name: "Ceiling fan", percentage: 40, percentage_step: 1, direction: "forward", supported_features: 1 | 4 | 16 | 32 },
    last_changed: stamp,
    last_updated: stamp,
  },
  "fan.bedroom": {
    entity_id: "fan.bedroom",
    state: "off",
    attributes: { friendly_name: "Tower fan", percentage: 0, percentage_step: 100 / 3, preset_mode: null, preset_modes: ["normal", "sleep", "nature"], oscillating: false, supported_features: 1 | 2 | 8 | 16 | 32 },
    last_changed: stamp,
    last_updated: stamp,
  },
  "fan.bathroom_extractor": {
    entity_id: "fan.bathroom_extractor",
    state: "off",
    attributes: { friendly_name: "Extractor", supported_features: 16 | 32 },
    last_changed: stamp,
    last_updated: stamp,
  },
};

/** Storybook-only `fan` transport: the same store and service path as a host transport, answered locally. */
export function createDemoFanHaTransport(seed: HassEntities = initial): HaTransport {
  let entities: HassEntities = Object.fromEntries(Object.entries(seed).map(([id, e]) => [id, { ...e, attributes: { ...e.attributes } }]));
  const listeners = new Set<(next: HassEntities) => void>();
  const publish = () => listeners.forEach((listener) => listener({ ...entities }));
  /** The speed each fan last ran at. */
  const last = new Map<string, number>(Object.values(entities)
    .filter((e) => typeof e.attributes.percentage === "number" && e.attributes.percentage > 0)
    .map((e) => [e.entity_id, e.attributes.percentage as number]));

  return {
    subscribeEntities(listener) {
      listeners.add(listener);
      queueMicrotask(() => listener({ ...entities }));
      return () => { listeners.delete(listener); };
    },
    async callService(domain, service, serviceData = {}) {
      if (domain !== "fan") throw new Error(`Unsupported demo service: ${domain}.${service}`);
      const entityId = serviceData.entity_id;
      if (typeof entityId !== "string" || !entities[entityId]) throw new Error("Demo entity not found");
      const current = entities[entityId];
      const now = new Date().toISOString();
      const [state, changed] = fanService(current, service, serviceData, last.get(entityId));
      const attributes = { ...current.attributes, ...changed };
      if (typeof attributes.percentage === "number" && attributes.percentage > 0) last.set(entityId, attributes.percentage);
      const next: HassEntity = { ...current, attributes, state, last_changed: state === current.state ? current.last_changed : now, last_updated: now };
      entities = { ...entities, [entityId]: next };
      publish();
      return { success: true };
    },
    sendMessage: (type, payload = {}) => demoSendMessage(entities, type, payload),
  };
}
