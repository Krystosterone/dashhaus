import { describe, expect, it } from "vitest";
import { createDemo__Name__HaTransport } from "./__name__";
import type { HassEntities } from "../types";

describe("createDemo__Name__HaTransport", () => {
  it("publishes the seeded readings", async () => {
    const transport = createDemo__Name__HaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(latest).toMatchObject({ "__domain__.living_room": { state: "42" }, "__domain__.office": { state: "7.5" } });
  });

  it("refuses every service: a reading is read-only", async () => {
    await expect(createDemo__Name__HaTransport().callService("__domain__", "toggle", { entity_id: "__domain__.living_room" })).rejects.toThrow(/read-only/);
  });

  it("answers today's history and the registries", async () => {
    const transport = createDemo__Name__HaTransport();
    const history = await transport.sendMessage?.("history/history_during_period", { entity_ids: ["__domain__.living_room"] });
    expect(Object.keys(history as object)).toEqual(["__domain__.living_room"]);
    // The morning stays near the entity's own value, in its own unit.
    const states = (history as Record<string, Array<{ s: string }>>)["__domain__.living_room"].map((row) => Number(row.s));
    expect(Math.min(...states)).toBeGreaterThan(30);
    expect(Math.max(...states)).toBeLessThan(50);
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "__domain__.living_room" }));
  });
});
