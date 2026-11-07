import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import { createDemoTransport } from "./transport";
import { PICTURE_DOORSTEP, PICTURE_NURSERY } from "../seeds/pictures";

const stamp = "2026-10-19T11:20:00Z";
const camera = (entity_id: string, state: string, friendly_name: string, attributes: Record<string, unknown> = {}): HassEntity => ({
  entity_id,
  state,
  // Home Assistant's shape: a signed proxy path whose token it rotates by rewriting the attribute.
  attributes: { friendly_name, access_token: "demo", entity_picture: `/api/camera_proxy/${entity_id}?token=demo`, supported_features: 2, ...attributes },
  last_changed: stamp,
  last_updated: stamp,
});

const initial: HassEntities = {
  "camera.front_door": camera("camera.front_door", "idle", "Front door", { brand: "Reolink", model_name: "Video Doorbell", motion_detection: true }),
  "camera.nursery": camera("camera.nursery", "recording", "Nursery"),
};

/** The stills it serves, by Home Assistant's path without its token: local pictures, so a demo never fetches the network. */
const pictures = {
  "/api/camera_proxy/camera.front_door": PICTURE_DOORSTEP,
  "/api/camera_proxy/camera.nursery": PICTURE_NURSERY,
};

/** Storybook-only `camera` transport: the real store, mapper and picture path, answered locally. Read-only. */
export function createDemoCameraHaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({ seed, services: {}, refuse: (domain, service) => new Error(`The camera is read-only: ${domain}.${service}`), pictures });
}
