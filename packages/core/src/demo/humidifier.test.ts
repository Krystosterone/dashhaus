import { describe, expect, it } from "vitest";
import { createDemoHumidifierHaTransport } from "./humidifier";
import type { HassEntities } from "../ha/types";

const subscribe = async () => {
  const transport = createDemoHumidifierHaTransport();
  const seen: { latest?: HassEntities } = {};
  transport.subscribeEntities((entities) => { seen.latest = entities; });
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  return { transport, seen };
};

describe("createDemoHumidifierHaTransport", () => {
  it("publishes the seeded entities", async () => {
    const { seen } = await subscribe();
    expect(seen.latest).toMatchObject({ "humidifier.bedroom": { state: "on" }, "humidifier.office": { state: "off" } });
  });

  it("answers toggle, turn_on and turn_off", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("humidifier", "toggle", { entity_id: "humidifier.bedroom" });
    expect(seen.latest?.["humidifier.bedroom"].state).toBe("off");
    await transport.callService("humidifier", "turn_on", { entity_id: "humidifier.bedroom" });
    expect(seen.latest?.["humidifier.bedroom"].state).toBe("on");
    await transport.callService("humidifier", "turn_off", { entity_id: "humidifier.office" });
    expect(seen.latest?.["humidifier.office"].state).toBe("off");
  });

  it("answers set_humidity and set_mode, and works out the action", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("humidifier", "set_humidity", { entity_id: "humidifier.bedroom", humidity: 35 });
    expect(seen.latest?.["humidifier.bedroom"].attributes).toMatchObject({ humidity: 35, action: "idle" });
    await transport.callService("humidifier", "set_mode", { entity_id: "humidifier.bedroom", mode: "eco" });
    expect(seen.latest?.["humidifier.bedroom"].attributes.mode).toBe("eco");
    await transport.callService("humidifier", "turn_on", { entity_id: "humidifier.office" });
    expect(seen.latest?.["humidifier.office"].attributes.action).toBe("drying");
  });

  it("rejects other domains, services and unknown entities", async () => {
    const transport = createDemoHumidifierHaTransport();
    await expect(transport.callService("other_domain", "toggle", { entity_id: "humidifier.bedroom" })).rejects.toThrow();
    await expect(transport.callService("humidifier", "explode", { entity_id: "humidifier.bedroom" })).rejects.toThrow();
    await expect(transport.callService("humidifier", "toggle", { entity_id: "humidifier.missing" })).rejects.toThrow();
  });

  it("answers today's history and the registries", async () => {
    const transport = createDemoHumidifierHaTransport();
    const history = await transport.sendMessage?.("history/history_during_period", { entity_ids: ["humidifier.bedroom"] });
    expect(Object.keys(history as object)).toEqual(["humidifier.bedroom"]);
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "humidifier.bedroom" }));
  });
});
