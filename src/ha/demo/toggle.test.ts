import { describe, expect, it } from "vitest";
import { createDemoToggleHaTransport } from "./toggle";
import type { HassEntities } from "../types";

describe("createDemoToggleHaTransport", () => {
  it("publishes the seeded toggle entities", async () => {
    const transport = createDemoToggleHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(latest).toMatchObject({
      "input_boolean.guest_mode": { state: "on" },
      "input_boolean.dnd": { state: "off" },
      "switch.porch": { state: "on" },
      "switch.office": { state: "off" },
    });
  });

  it("toggles both input_boolean and switch entities", async () => {
    const transport = createDemoToggleHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await transport.callService("input_boolean", "toggle", { entity_id: "input_boolean.guest_mode" });
    expect(latest?.["input_boolean.guest_mode"].state).toBe("off");

    await transport.callService("switch", "toggle", { entity_id: "switch.office" });
    expect(latest?.["switch.office"].state).toBe("on");
  });

  it("rejects unsupported services and unknown entities", async () => {
    const transport = createDemoToggleHaTransport();
    await expect(transport.callService("input_boolean", "turn_on", { entity_id: "input_boolean.guest_mode" })).rejects.toThrow();
    await expect(transport.callService("switch", "toggle", { entity_id: "switch.missing" })).rejects.toThrow();
  });

  it("returns toggle history keyed by entity and resolves the registries", async () => {
    const transport = createDemoToggleHaTransport();

    const result = await transport.sendMessage?.("history/history_during_period", {
      entity_ids: ["input_boolean.guest_mode", "switch.porch"],
    });

    expect(Object.keys(result as object)).toEqual(["input_boolean.guest_mode", "switch.porch"]);

    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "input_boolean.guest_mode" }));
  });
});
