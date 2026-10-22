import type { HaTransport, HassEntities } from "../types";
import { demoSendMessage } from "../demo";

const stamp = "2026-10-19T11:20:00Z";
const alarmInitial: HassEntities = {
  "alarm_control_panel.house": {
    entity_id: "alarm_control_panel.house",
    state: "disarmed",
    attributes: {
      friendly_name: "House alarm",
      code_format: "number",
      changed_by: null,
      supported_features: 1 | 2 | 4,
    },
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
 * Storybook-only alarm transport using the same store and service path as a host transport. It behaves like
 * the manual alarm: code 1234 arms and disarms; any other code is rejected with `translation_key: invalid_code`.
 */
export function createDemoAlarmHaTransport(seed: HassEntities = alarmInitial): HaTransport {
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
      if (domain !== "alarm_control_panel") throw new Error(`Unsupported demo domain: ${domain}`);
      const entityId = serviceData.entity_id;
      if (typeof entityId !== "string" || !entities[entityId]) throw new Error("Demo entity not found");
      if (serviceData.code !== "1234") throw { translation_key: "invalid_code" };
      const current = entities[entityId];
      const now = new Date().toISOString();
      const to = service === "alarm_disarm" ? "disarmed" : service.replace("alarm_arm_", "armed_");
      entities = {
        ...entities,
        [entityId]: {
          ...current,
          state: to,
          attributes: { ...current.attributes, next_state: undefined, changed_by: null },
          last_changed: now,
          last_updated: now,
        },
      };
      publish();
      return { success: true };
    },
    sendMessage: (type, payload = {}) => demoSendMessage(entities, type, payload),
  };
}
