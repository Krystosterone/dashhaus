import type { HaTransport, HassEntities } from "../ha/types";
import { createDemoTransport, onOffServices } from "./transport";

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

/**
 * Storybook-only toggle transport simulating `toggle` for both input_boolean and switch, using the
 * same store and service path as a host transport.
 */
export function createDemoToggleHaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({ seed, services: { ...onOffServices("input_boolean", ["toggle"]), ...onOffServices("switch", ["toggle"]) } });
}
