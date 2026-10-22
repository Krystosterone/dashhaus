import { describe, expect, it } from "vitest";
import { createDemoCoverHaTransport } from "./cover";
import type { HassEntities } from "../types";

describe("createDemoCoverHaTransport", () => {
  it("publishes the seeded cover entity", async () => {
    const transport = createDemoCoverHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(latest).toMatchObject({
      "cover.living_room": { state: "open", attributes: { current_position: 100, current_tilt_position: 50 } },
    });
  });

  it("mutates state, position, and tilt through cover services", async () => {
    const transport = createDemoCoverHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await transport.callService("cover", "close_cover", { entity_id: "cover.living_room" });
    expect(latest?.["cover.living_room"]).toMatchObject({ state: "closed", attributes: { current_position: 0 } });

    await transport.callService("cover", "set_cover_position", { entity_id: "cover.living_room", position: 40 });
    expect(latest?.["cover.living_room"]).toMatchObject({ state: "open", attributes: { current_position: 40 } });

    await transport.callService("cover", "set_cover_tilt_position", { entity_id: "cover.living_room", tilt_position: 70 });
    expect(latest?.["cover.living_room"]).toMatchObject({ attributes: { current_tilt_position: 70 } });

    await transport.callService("cover", "stop_cover", { entity_id: "cover.living_room" });
    expect(latest?.["cover.living_room"].state).toBe("open");
  });

  it("rejects unsupported domains and unknown entities", async () => {
    const transport = createDemoCoverHaTransport();
    await expect(transport.callService("light", "toggle", { entity_id: "light.x" })).rejects.toThrow();
    await expect(transport.callService("cover", "open_cover", { entity_id: "cover.missing" })).rejects.toThrow();
  });

  it("returns cover history with position attributes and resolves the registries", async () => {
    const transport = createDemoCoverHaTransport();

    const result = await transport.sendMessage?.("history/history_during_period", { entity_ids: ["cover.living_room"] });
    const rows = (result as Record<string, Array<{ a: Record<string, unknown> }>>)["cover.living_room"];

    expect(rows.some((row) => typeof row.a.current_position === "number")).toBe(true);

    const areas = await transport.sendMessage?.("config/area_registry/list");
    expect(areas).toContainEqual(expect.objectContaining({ name: "Living room" }));
  });
});
