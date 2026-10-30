import { describe, expect, it, vi } from "vitest";
import { createDemoOwletHaTransport, owletDemoEntities } from "./owlet";
import type { HassEntities } from "../ha/types";

const BASE = "sensor.owlet_sock_ac000w0123";

describe("createDemoOwletHaTransport", () => {
  it("publishes one sock's sleep state, heart rate and oxygen", async () => {
    const transport = createDemoOwletHaTransport(undefined, 0);
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(latest).toMatchObject({
      [`${BASE}_sleep_state`]: { state: "deep_sleep" },
      [`${BASE}_heart_rate`]: { state: "121" },
      [`${BASE}_o2_saturation`]: { state: "98" },
    });
  });

  it("sends a new heart rate every tick, like the integration's polling, and stops when unsubscribed", async () => {
    vi.useFakeTimers();
    try {
      const transport = createDemoOwletHaTransport(undefined, 5000);
      const updates: HassEntities[] = [];
      const unsubscribe = transport.subscribeEntities((entities) => updates.push(entities));
      await vi.advanceTimersByTimeAsync(10_000);
      const rates = updates.map((e) => e[`${BASE}_heart_rate`]);
      expect(updates.length).toBe(3);
      expect(new Set(rates.map((r) => r.last_updated)).size).toBeGreaterThan(1);
      for (const r of rates) expect(Number(r.state)).toBeGreaterThanOrEqual(112);
      unsubscribe();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(updates.length).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("publishes the charging and alert sensors, quiet unless a story turns one on", async () => {
    const quiet = createDemoOwletHaTransport(undefined, 0);
    const alarm = createDemoOwletHaTransport(owletDemoEntities({ "binary_sensor.owlet_sock_ac000w0123_low_oxygen_alert": "on" }), 0);
    const seen: HassEntities[] = [];
    quiet.subscribeEntities((entities) => { seen[0] = entities; });
    alarm.subscribeEntities((entities) => { seen[1] = entities; });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    const binaries = Object.values(seen[0]).filter((e) => e.entity_id.startsWith("binary_sensor."));
    expect(binaries).toHaveLength(11);
    expect(binaries.every((e) => e.state === "off")).toBe(true);
    expect(seen[1]["binary_sensor.owlet_sock_ac000w0123_low_oxygen_alert"].state).toBe("on");
  });

  it("refuses every service: the sock is read-only", async () => {
    await expect(createDemoOwletHaTransport().callService("sensor", "toggle", { entity_id: `${BASE}_sleep_state` })).rejects.toThrow(/read-only/);
  });

  it("answers today's night for each sensor and the registries", async () => {
    const transport = createDemoOwletHaTransport();
    const history = await transport.sendMessage?.("history/history_during_period", { entity_ids: [`${BASE}_sleep_state`, `${BASE}_heart_rate`] }) as Record<string, Array<{ s: string }>>;
    expect(Object.keys(history)).toEqual([`${BASE}_sleep_state`, `${BASE}_heart_rate`]);
    expect(history[`${BASE}_sleep_state`].map((row) => row.s)).toContain("light_sleep");
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: `${BASE}_sleep_state` }));
  });
});
