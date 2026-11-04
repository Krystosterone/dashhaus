import type { HaTransport, HassEntities } from "../ha/types";
import { createDemoTransport, onOffServices } from "./transport";

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

/** Storybook-only `__domain__` transport: the same store and service path as a host transport, answered locally. */
export function createDemo__Name__HaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({ seed, services: onOffServices("__domain__") });
}
