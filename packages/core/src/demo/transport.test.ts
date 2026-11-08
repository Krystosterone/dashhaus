import { describe, expect, it } from "vitest";
import { createDemoTransport, demoPicture } from "./transport";
import { createHaStore } from "../ha/store";
import { PICTURE_DOORSTEP } from "../seeds/pictures";

const door = {
  entity_id: "camera.door",
  state: "idle",
  attributes: { entity_picture: "/api/camera_proxy/camera.door?token=demo" },
  last_changed: "2026-11-07T14:32:05Z",
  last_updated: "2026-11-07T14:32:05Z",
};

describe("demo pictures", () => {
  it("serves a local picture for an entity_picture path, whatever its token", () => {
    const pictures = { "/api/camera_proxy/camera.door": PICTURE_DOORSTEP };
    expect(demoPicture(pictures, "/api/camera_proxy/camera.door?token=demo")).toBe(PICTURE_DOORSTEP);
    expect(demoPicture(pictures, "/api/camera_proxy/camera.door")).toBe(PICTURE_DOORSTEP);
    expect(demoPicture(pictures, "/api/camera_proxy/camera.garden?token=demo")).toBeUndefined();
  });

  it("resolves through the real store, and never to a network URL", () => {
    const transport = createDemoTransport({ seed: { "camera.door": door }, services: {}, pictures: { "/api/camera_proxy/camera.door": PICTURE_DOORSTEP } });
    const store = createHaStore(transport);
    expect(store.resolveUrl?.("/api/camera_proxy/camera.door?token=demo")).toBe(PICTURE_DOORSTEP);
    expect(store.resolveUrl?.("/api/camera_proxy/camera.garden?token=demo")).toBeUndefined();
    expect(createHaStore(createDemoTransport({ seed: {}, services: {} })).resolveUrl?.("/api/x")).toBeUndefined();
  });

  it("draws every demo picture as a local inline image", async () => {
    const pictures = await import("../seeds/pictures");
    for (const [name, picture] of Object.entries(pictures)) expect(picture, name).toMatch(/^data:image\/svg\+xml,/);
  });
});
