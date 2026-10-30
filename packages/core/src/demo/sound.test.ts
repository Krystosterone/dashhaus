import { describe, expect, it } from "vitest";
import { createDemoSoundHaTransport } from "./sound";
import type { HassEntities } from "../ha/types";

const subscribe = async () => {
  const transport = createDemoSoundHaTransport();
  const seen: { latest?: HassEntities } = {};
  transport.subscribeEntities((entities) => { seen.latest = entities; });
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  return { transport, seen };
};

describe("createDemoSoundHaTransport", () => {
  it("publishes the seeded entities", async () => {
    const { seen } = await subscribe();
    expect(seen.latest).toMatchObject({ "switch.bedroom": { state: "on" }, "switch.office": { state: "off" } });
  });

  it("answers toggle, turn_on and turn_off", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("switch", "toggle", { entity_id: "switch.bedroom" });
    expect(seen.latest?.["switch.bedroom"].state).toBe("off");
    await transport.callService("switch", "turn_on", { entity_id: "switch.bedroom" });
    expect(seen.latest?.["switch.bedroom"].state).toBe("on");
    await transport.callService("switch", "turn_off", { entity_id: "switch.office" });
    expect(seen.latest?.["switch.office"].state).toBe("off");
  });

  it("sets the volume number without switching the sound", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("number", "set_value", { entity_id: "number.nursery_volume", value: 40 });
    expect(seen.latest?.["number.nursery_volume"].state).toBe("40");
    expect(seen.latest?.["switch.nursery_music"].state).toBe("on");
  });

  it("rejects other domains, services and unknown entities", async () => {
    const transport = createDemoSoundHaTransport();
    await expect(transport.callService("other_domain", "toggle", { entity_id: "switch.bedroom" })).rejects.toThrow();
    await expect(transport.callService("switch", "explode", { entity_id: "switch.bedroom" })).rejects.toThrow();
    await expect(transport.callService("switch", "toggle", { entity_id: "switch.missing" })).rejects.toThrow();
    await expect(transport.callService("number", "set_value", { entity_id: "number.nursery_volume", value: "loud" })).rejects.toThrow();
  });

  it("answers today's history and the registries", async () => {
    const transport = createDemoSoundHaTransport();
    const history = await transport.sendMessage?.("history/history_during_period", { entity_ids: ["switch.bedroom"] });
    expect(Object.keys(history as object)).toEqual(["switch.bedroom"]);
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "switch.bedroom" }));
  });
});
