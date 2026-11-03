import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import { demoSendMessage } from "../demo";

const stamp = "2026-10-19T11:20:00Z";

/** The demo code for every lock that asks for one. */
export const DEMO_LOCK_CODE = "1234";

const initial: HassEntities = {
  "lock.front_door": {
    entity_id: "lock.front_door",
    state: "locked",
    attributes: { friendly_name: "Front door", supported_features: 1, code_format: "^\\d{4}$", changed_by: "Keypad" },
    last_changed: stamp,
    last_updated: stamp,
  },
  "sensor.front_door_battery": {
    entity_id: "sensor.front_door_battery",
    state: "12",
    attributes: { friendly_name: "Front door battery", device_class: "battery", unit_of_measurement: "%" },
    last_changed: stamp,
    last_updated: stamp,
  },
  "lock.back_door": {
    entity_id: "lock.back_door",
    state: "unlocked",
    attributes: { friendly_name: "Back door", supported_features: 0 },
    last_changed: stamp,
    last_updated: stamp,
  },
};

/** Where each service ends, and the state on its way there. */
const SERVICES: Record<string, { via: string; to: string }> = {
  lock: { via: "locking", to: "locked" },
  unlock: { via: "unlocking", to: "unlocked" },
  open: { via: "opening", to: "open" },
};

export interface DemoLockOptions {
  /** How long a lock takes to turn, in ms; its `locking`/`unlocking` state shows meanwhile. 0 goes straight there. */
  travelMs?: number;
}

/**
 * Storybook-only `lock` transport: the same store and service path as a host transport, answered locally. A lock
 * with a `code_format` takes DEMO_LOCK_CODE and refuses any other the way Home Assistant does (`translation_key:
 * add_default_code`); `open` is refused on a lock that doesn't support it.
 */
export function createDemoLockHaTransport(seed: HassEntities = initial, { travelMs = 900 }: DemoLockOptions = {}): HaTransport {
  let entities: HassEntities = Object.fromEntries(Object.entries(seed).map(([id, e]) => [id, { ...e, attributes: { ...e.attributes } }]));
  const listeners = new Set<(next: HassEntities) => void>();
  const publish = () => listeners.forEach((listener) => listener({ ...entities }));
  const set = (entityId: string, state: string) => {
    const current = entities[entityId];
    const now = new Date().toISOString();
    const next: HassEntity = { ...current, attributes: { ...current.attributes, changed_by: "Dashboard" }, state, last_changed: now, last_updated: now };
    entities = { ...entities, [entityId]: next };
    publish();
  };

  return {
    subscribeEntities(listener) {
      listeners.add(listener);
      queueMicrotask(() => listener({ ...entities }));
      return () => { listeners.delete(listener); };
    },
    async callService(domain, service, serviceData = {}) {
      const step = SERVICES[service];
      if (domain !== "lock" || !step) throw new Error(`Unsupported demo service: ${domain}.${service}`);
      const entityId = serviceData.entity_id;
      if (typeof entityId !== "string" || !entities[entityId]) throw new Error("Demo entity not found");
      const { attributes, state } = entities[entityId];
      if (state === "unavailable" || state === "unknown") throw new Error("Demo lock is unavailable");
      if (service === "open" && !((Number(attributes.supported_features) & 1) !== 0)) throw new Error("Demo lock can't open");
      if (typeof attributes.code_format === "string" && serviceData.code !== DEMO_LOCK_CODE) throw { translation_key: "add_default_code" };
      if (travelMs <= 0) set(entityId, step.to);
      else {
        set(entityId, step.via);
        setTimeout(() => set(entityId, step.to), travelMs);
      }
      return { success: true };
    },
    sendMessage: (type, payload = {}) => demoSendMessage(entities, type, payload),
  };
}
