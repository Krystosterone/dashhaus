import type { HaTransport, HassEntities } from "../ha/types";
import { createDemoTransport } from "./transport";
import type { DemoServices } from "./transport";

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

/** What a cover's services do. It arrives at once: the demo has no travel. */
export const COVER_SERVICES: DemoServices = {
  "cover.open_cover": () => ({ state: "open", attributes: { current_position: 100 } }),
  "cover.close_cover": () => ({ state: "closed", attributes: { current_position: 0 } }),
  // A stopped cover holds its position; settle an in-flight state to its current reach.
  "cover.stop_cover": ({ entity }) => ({ state: entity.state === "opening" ? "open" : entity.state === "closing" ? "closed" : entity.state }),
  "cover.set_cover_position": ({ data }) => typeof data.position === "number"
    ? { state: data.position === 0 ? "closed" : "open", attributes: { current_position: data.position } }
    : {},
  "cover.set_cover_tilt_position": ({ data }) => typeof data.tilt_position === "number" ? { attributes: { current_tilt_position: data.tilt_position } } : {},
};

/** Storybook-only cover transport using the same store and service path as a host transport. */
export function createDemoCoverHaTransport(seed: HassEntities = coverInitial): HaTransport {
  return createDemoTransport({ seed, services: COVER_SERVICES });
}
