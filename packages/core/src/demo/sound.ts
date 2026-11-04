import type { HaTransport, HassEntities } from "../ha/types";
import { createDemoTransport, onOffServices } from "./transport";
import type { DemoServices } from "./transport";

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

/** A volume `number` beside a sound switch: setting it never switches the sound. */
export const VOLUME_SERVICES: DemoServices = {
  "number.set_value": ({ data }) => {
    if (typeof data.value !== "number") throw new Error("value must be a number");
    return { state: String(data.value) };
  },
};

/** Storybook-only `switch` and volume `number` transport: the same store and service path as a host transport, answered locally. */
export function createDemoSoundHaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({ seed, services: { ...onOffServices("switch"), ...VOLUME_SERVICES } });
}
