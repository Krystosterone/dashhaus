import { describe, expect, it } from "vitest";
import { createDemo__Name__HaTransport } from "./__name__";
import type { HassEntities } from "../types";

const subscribe = async () => {
  const transport = createDemo__Name__HaTransport();
  const seen: { latest?: HassEntities } = {};
  transport.subscribeEntities((entities) => { seen.latest = entities; });
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  return { transport, seen };
};

describe("createDemo__Name__HaTransport", () => {
  it("publishes the seeded entities", async () => {
    const { seen } = await subscribe();
    expect(seen.latest).toMatchObject({ "__domain__.bedroom": { state: "on" }, "__domain__.office": { state: "off" } });
  });

  it("answers toggle, turn_on and turn_off", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("__domain__", "toggle", { entity_id: "__domain__.bedroom" });
    expect(seen.latest?.["__domain__.bedroom"].state).toBe("off");
    await transport.callService("__domain__", "turn_on", { entity_id: "__domain__.bedroom" });
    expect(seen.latest?.["__domain__.bedroom"].state).toBe("on");
    await transport.callService("__domain__", "turn_off", { entity_id: "__domain__.office" });
    expect(seen.latest?.["__domain__.office"].state).toBe("off");
  });

  it("rejects other domains, services and unknown entities", async () => {
    const transport = createDemo__Name__HaTransport();
    await expect(transport.callService("other_domain", "toggle", { entity_id: "__domain__.bedroom" })).rejects.toThrow();
    await expect(transport.callService("__domain__", "explode", { entity_id: "__domain__.bedroom" })).rejects.toThrow();
    await expect(transport.callService("__domain__", "toggle", { entity_id: "__domain__.missing" })).rejects.toThrow();
  });

  it("answers today's history and the registries", async () => {
    const transport = createDemo__Name__HaTransport();
    const history = await transport.sendMessage?.("history/history_during_period", { entity_ids: ["__domain__.bedroom"] });
    expect(Object.keys(history as object)).toEqual(["__domain__.bedroom"]);
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "__domain__.bedroom" }));
  });
});
