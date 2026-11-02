import { describe, expect, it } from "vitest";
import { createDemoFanHaTransport } from "./fan";
import type { HassEntities } from "../ha/types";

const subscribe = async () => {
  const transport = createDemoFanHaTransport();
  const seen: { latest?: HassEntities } = {};
  transport.subscribeEntities((entities) => { seen.latest = entities; });
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  return { transport, seen };
};

describe("createDemoFanHaTransport", () => {
  it("publishes the seeded entities", async () => {
    const { seen } = await subscribe();
    expect(seen.latest).toMatchObject({
      "fan.living_room_ceiling": { state: "on", attributes: { percentage: 40, direction: "forward" } },
      "fan.bedroom": { state: "off" },
      "fan.bathroom_extractor": { state: "off" },
    });
  });

  it("answers toggle, turn_on and turn_off, resuming the last speed", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("fan", "toggle", { entity_id: "fan.living_room_ceiling" });
    expect(seen.latest?.["fan.living_room_ceiling"]).toMatchObject({ state: "off", attributes: { percentage: 0 } });
    await transport.callService("fan", "turn_on", { entity_id: "fan.living_room_ceiling" });
    expect(seen.latest?.["fan.living_room_ceiling"]).toMatchObject({ state: "on", attributes: { percentage: 40 } });
    await transport.callService("fan", "turn_off", { entity_id: "fan.living_room_ceiling" });
    expect(seen.latest?.["fan.living_room_ceiling"].state).toBe("off");
    await transport.callService("fan", "toggle", { entity_id: "fan.bathroom_extractor" });
    expect(seen.latest?.["fan.bathroom_extractor"].state).toBe("on");
    expect(seen.latest?.["fan.bathroom_extractor"].attributes.percentage).toBeUndefined();
  });

  it("sets the speed, turning the fan on, and 0 turns it off", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("fan", "set_percentage", { entity_id: "fan.bedroom", percentage: 67 });
    expect(seen.latest?.["fan.bedroom"]).toMatchObject({ state: "on", attributes: { percentage: 67 } });
    await transport.callService("fan", "set_percentage", { entity_id: "fan.bedroom", percentage: 0 });
    expect(seen.latest?.["fan.bedroom"].state).toBe("off");
  });

  it("sets a preset, oscillation and direction", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("fan", "set_preset_mode", { entity_id: "fan.bedroom", preset_mode: "sleep" });
    await transport.callService("fan", "oscillate", { entity_id: "fan.bedroom", oscillating: true });
    expect(seen.latest?.["fan.bedroom"]).toMatchObject({ state: "on", attributes: { preset_mode: "sleep", oscillating: true } });
    await transport.callService("fan", "set_direction", { entity_id: "fan.living_room_ceiling", direction: "reverse" });
    expect(seen.latest?.["fan.living_room_ceiling"].attributes.direction).toBe("reverse");
  });

  it("rejects other domains, services, bad data and unknown entities", async () => {
    const transport = createDemoFanHaTransport();
    await expect(transport.callService("other_domain", "toggle", { entity_id: "fan.bedroom" })).rejects.toThrow();
    await expect(transport.callService("fan", "explode", { entity_id: "fan.bedroom" })).rejects.toThrow();
    await expect(transport.callService("fan", "toggle", { entity_id: "fan.missing" })).rejects.toThrow();
    await expect(transport.callService("fan", "set_percentage", { entity_id: "fan.bedroom", percentage: 140 })).rejects.toThrow();
    await expect(transport.callService("fan", "set_preset_mode", { entity_id: "fan.bedroom", preset_mode: "turbo" })).rejects.toThrow();
    await expect(transport.callService("fan", "oscillate", { entity_id: "fan.bedroom", oscillating: "yes" })).rejects.toThrow();
    await expect(transport.callService("fan", "set_direction", { entity_id: "fan.bedroom", direction: "up" })).rejects.toThrow();
  });

  it("answers today's history and the registries", async () => {
    const transport = createDemoFanHaTransport();
    const history = await transport.sendMessage?.("history/history_during_period", { entity_ids: ["fan.bedroom"] });
    expect(Object.keys(history as object)).toEqual(["fan.bedroom"]);
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "fan.bedroom" }));
  });
});
