import { describe, expect, it } from "vitest";
import { createDemoCameraHaTransport } from "./camera";
import { PICTURE_DOORSTEP } from "../seeds/pictures";
import type { HassEntities } from "../ha/types";

describe("createDemoCameraHaTransport", () => {
  it("publishes the seeded cameras, each with Home Assistant's signed picture path", async () => {
    const transport = createDemoCameraHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(latest).toMatchObject({ "camera.front_door": { state: "idle" }, "camera.nursery": { state: "recording" } });
    expect(latest?.["camera.front_door"].attributes.entity_picture).toBe("/api/camera_proxy/camera.front_door?token=demo");
  });

  it("serves its stills locally, whatever the token, and nothing else", () => {
    const transport = createDemoCameraHaTransport();
    expect(transport.resolveUrl?.("/api/camera_proxy/camera.front_door?token=rotated")).toBe(PICTURE_DOORSTEP);
    expect(transport.resolveUrl?.("/api/camera_proxy/camera.elsewhere?token=demo")).toBeUndefined();
  });

  it("refuses every service: a camera here is read-only", async () => {
    await expect(createDemoCameraHaTransport().callService("camera", "snapshot", { entity_id: "camera.front_door" })).rejects.toThrow(/read-only/);
  });

  it("answers the registries", async () => {
    const registry = await createDemoCameraHaTransport().sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "camera.front_door" }));
  });
});
