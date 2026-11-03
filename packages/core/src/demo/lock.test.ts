import { describe, expect, it, vi } from "vitest";
import { DEMO_LOCK_CODE, createDemoLockHaTransport } from "./lock";
import type { HassEntities } from "../ha/types";

const subscribe = async (travelMs = 0) => {
  const transport = createDemoLockHaTransport(undefined, { travelMs });
  const seen: { latest?: HassEntities } = {};
  transport.subscribeEntities((entities) => { seen.latest = entities; });
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  return { transport, seen };
};

describe("createDemoLockHaTransport", () => {
  it("publishes the seeded locks and the front door's battery", async () => {
    const { seen } = await subscribe();
    expect(seen.latest).toMatchObject({
      "lock.front_door": { state: "locked" },
      "lock.back_door": { state: "unlocked" },
      "sensor.front_door_battery": { attributes: { device_class: "battery" } },
    });
  });

  it("locks and unlocks, through the moving state", async () => {
    vi.useFakeTimers();
    try {
      const { transport, seen } = await subscribe(900);
      await transport.callService("lock", "lock", { entity_id: "lock.back_door" });
      expect(seen.latest?.["lock.back_door"].state).toBe("locking");
      vi.advanceTimersByTime(900);
      expect(seen.latest?.["lock.back_door"].state).toBe("locked");
      await transport.callService("lock", "unlock", { entity_id: "lock.back_door" });
      vi.advanceTimersByTime(900);
      expect(seen.latest?.["lock.back_door"].state).toBe("unlocked");
    } finally {
      vi.useRealTimers();
    }
  });

  it("takes the demo code where a lock asks for one, and opens only a lock that can", async () => {
    const { transport, seen } = await subscribe();
    await expect(transport.callService("lock", "unlock", { entity_id: "lock.front_door", code: "0000" })).rejects.toEqual({ translation_key: "add_default_code" });
    expect(seen.latest?.["lock.front_door"].state).toBe("locked");
    await transport.callService("lock", "open", { entity_id: "lock.front_door", code: DEMO_LOCK_CODE });
    expect(seen.latest?.["lock.front_door"].state).toBe("open");
    await expect(transport.callService("lock", "open", { entity_id: "lock.back_door" })).rejects.toThrow();
  });

  it("rejects other domains, services and unknown entities", async () => {
    const transport = createDemoLockHaTransport();
    await expect(transport.callService("other_domain", "lock", { entity_id: "lock.back_door" })).rejects.toThrow();
    await expect(transport.callService("lock", "toggle", { entity_id: "lock.back_door" })).rejects.toThrow();
    await expect(transport.callService("lock", "lock", { entity_id: "lock.missing" })).rejects.toThrow();
  });

  it("answers the registries", async () => {
    const transport = createDemoLockHaTransport();
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "lock.front_door" }));
  });
});
