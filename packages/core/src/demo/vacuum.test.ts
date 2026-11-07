import { describe, expect, it } from "vitest";
import { createDemoVacuumHaTransport } from "./vacuum";
import type { HassEntities } from "../ha/types";

const subscribe = async (travelMs = 0) => {
  const transport = createDemoVacuumHaTransport(undefined, { travelMs });
  const seen: { latest?: HassEntities } = {};
  transport.subscribeEntities((entities) => { seen.latest = entities; });
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  return { transport, seen };
};

describe("createDemoVacuumHaTransport", () => {
  it("publishes the seeded entities", async () => {
    const { seen } = await subscribe();
    expect(seen.latest).toMatchObject({ "vacuum.robot_vacuum": { state: "docked" }, "vacuum.upstairs_vacuum": { state: "cleaning" } });
  });

  it("starts, pauses, sends home and sets the fan speed", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("vacuum", "start", { entity_id: "vacuum.robot_vacuum" });
    expect(seen.latest?.["vacuum.robot_vacuum"].state).toBe("cleaning");
    await transport.callService("vacuum", "pause", { entity_id: "vacuum.robot_vacuum" });
    expect(seen.latest?.["vacuum.robot_vacuum"].state).toBe("paused");
    await transport.callService("vacuum", "return_to_base", { entity_id: "vacuum.robot_vacuum" });
    expect(seen.latest?.["vacuum.robot_vacuum"].state).toBe("docked");
    await transport.callService("vacuum", "set_fan_speed", { entity_id: "vacuum.robot_vacuum", fan_speed: "turbo" });
    expect(seen.latest?.["vacuum.robot_vacuum"].attributes.fan_speed).toBe("turbo");
    await transport.callService("vacuum", "locate", { entity_id: "vacuum.robot_vacuum" });
  });

  it("says Returning on the way back to the dock", async () => {
    const { transport, seen } = await subscribe(60_000);
    await transport.callService("vacuum", "return_to_base", { entity_id: "vacuum.upstairs_vacuum" });
    expect(seen.latest?.["vacuum.upstairs_vacuum"].state).toBe("returning");
  });

  it("refuses what a vacuum doesn't support, other services and unknown entities", async () => {
    const transport = createDemoVacuumHaTransport();
    await expect(transport.callService("vacuum", "locate", { entity_id: "vacuum.upstairs_vacuum" })).rejects.toThrow();
    await expect(transport.callService("vacuum", "set_fan_speed", { entity_id: "vacuum.robot_vacuum", fan_speed: "max" })).rejects.toThrow();
    await expect(transport.callService("vacuum", "explode", { entity_id: "vacuum.robot_vacuum" })).rejects.toThrow();
    await expect(transport.callService("vacuum", "start", { entity_id: "vacuum.missing" })).rejects.toThrow();
  });

  it("answers today's history and the registries", async () => {
    const transport = createDemoVacuumHaTransport();
    const history = await transport.sendMessage?.("history/history_during_period", { entity_ids: ["vacuum.robot_vacuum"] });
    expect(Object.keys(history as object)).toEqual(["vacuum.robot_vacuum"]);
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "vacuum.robot_vacuum" }));
  });
});
